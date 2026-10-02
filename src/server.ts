import type { Server } from "node:http";
import app from "./app";
import { config } from "./config";
import prisma from "./prismaClient";
import logger from "./utils/logger";

/** Preserves useful diagnostics when an unknown startup or shutdown value is logged. */
const getErrorLogContext = (error: unknown) => {
  if (!(error instanceof Error)) return { error };
  return { errorType: error.name, rawMessage: error.message, stack: error.stack };
};

/** Opens the HTTP listener and reports startup errors through the startup promise. */
const listenForHttpRequests = () =>
  new Promise<Server>((resolve, reject) => {
    const server = app.listen(config.port);

    server.once("error", reject);
    server.once("listening", () => {
      server.off("error", reject);
      resolve(server);
    });
  });

/** Waits until the HTTP server stops accepting and completes outstanding connections. */
const closeHttpServer = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) reject(error);
      else resolve();
    });
  });

/** Starts the API only after its required database dependency is reachable. */
const startServer = async () => {
  await prisma.$connect();

  const server = await listenForHttpRequests();
  logger.info("API server started", {
    event: "server.started",
    port: config.port,
    swaggerPath: config.swaggerPath,
  });
  let shutdownStarted = false;

  /** Drains HTTP work and releases Prisma before the process exits. */
  const shutdown = async (signal: NodeJS.Signals) => {
    if (shutdownStarted) return;
    shutdownStarted = true;

    logger.info("API server shutdown started", { event: "server.shutdown_started", signal });
    server.closeIdleConnections?.();

    const forceCloseTimer = setTimeout(() => {
      logger.error("API server shutdown exceeded its drain timeout", {
        event: "server.shutdown_timeout",
        timeoutMs: config.shutdownTimeoutMs,
      });
      server.closeAllConnections?.();
      process.exitCode = 1;
    }, config.shutdownTimeoutMs);
    forceCloseTimer.unref();

    try {
      await closeHttpServer(server);
      clearTimeout(forceCloseTimer);
      await prisma.$disconnect();
      logger.info("API server shutdown completed", { event: "server.shutdown_completed" });
    } catch (error) {
      clearTimeout(forceCloseTimer);
      logger.error("API server shutdown failed", {
        event: "server.shutdown_failed",
        ...getErrorLogContext(error),
      });
      await prisma.$disconnect();
      process.exitCode = 1;
    }
  };

  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGTERM", () => void shutdown("SIGTERM"));
};

startServer().catch(async (error) => {
  logger.error("API server failed to start", {
    event: "server.start_failed",
    ...getErrorLogContext(error),
  });
  await prisma.$disconnect();
  process.exitCode = 1;
});
