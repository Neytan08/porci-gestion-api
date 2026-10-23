import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  listen: vi.fn(),
  connect: vi.fn<() => Promise<void>>(),
  disconnect: vi.fn<() => Promise<void>>(),
  info: vi.fn(),
  error: vi.fn(),
}));
vi.mock("../../src/app", () => ({ default: { listen: dependencies.listen } }));
vi.mock("../../src/config", () => ({
  config: { port: 3000, swaggerPath: "/api-docs", shutdownTimeoutMs: 1000 },
}));
vi.mock("../../src/prismaClient", () => ({
  default: { $connect: dependencies.connect, $disconnect: dependencies.disconnect },
}));
vi.mock("../../src/utils/logger", () => ({
  default: { info: dependencies.info, error: dependencies.error },
}));

const signals = new Map<string, () => void>();
let finishHttpDrain: (() => void) | undefined;
let finishDisconnect: (() => void) | undefined;
const server = Object.assign(new EventEmitter(), {
  close: vi.fn<(callback: (error?: Error) => void) => void>(),
  closeIdleConnections: vi.fn(),
  closeAllConnections: vi.fn(),
});

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  vi.useFakeTimers();
  signals.clear();
  finishHttpDrain = undefined;
  finishDisconnect = undefined;
  server.removeAllListeners();
  dependencies.connect.mockResolvedValue(undefined);
  dependencies.disconnect.mockResolvedValue(undefined);
  dependencies.listen.mockReturnValue(server);
  server.close.mockImplementation((callback) => {
    finishHttpDrain = () => callback();
  });
  const originalOnce = process.once;
  vi.spyOn(process, "once").mockImplementation((event, listener) => {
    if (event === "SIGINT" || event === "SIGTERM") {
      signals.set(event, listener);
      return process;
    }
    return originalOnce.call(process, event, listener);
  });
  vi.spyOn(process, "exit").mockImplementation(() => {
    throw new Error("Forced process exit");
  });
});

afterEach(async () => {
  // Settle simulated shutdown work before restoring process spies and real timers.
  finishHttpDrain?.();
  await Promise.resolve();
  finishDisconnect?.();
  await Promise.resolve();
  vi.clearAllTimers();
  vi.useRealTimers();
});

/** Starts the isolated entry point and completes its simulated HTTP listening event. */
async function startServer() {
  await import("../../src/server");
  expect(dependencies.connect).toHaveBeenCalledExactlyOnceWith();
  expect(dependencies.listen).toHaveBeenCalledWith(3000);
  server.emit("listening");
  await Promise.resolve();
  const shutdown = signals.get("SIGTERM");
  if (!shutdown) throw new Error("Expected the server to register shutdown handlers");
  return shutdown;
}

describe("bounded server shutdown", () => {
  it("forces termination at the deadline while HTTP work is still draining", async () => {
    const shutdown = await startServer();
    shutdown();
    signals.get("SIGINT")?.();
    expect(server.close).toHaveBeenCalledTimes(1);
    expect(dependencies.disconnect).not.toHaveBeenCalled();
    vi.advanceTimersByTime(999);
    expect(process.exit).not.toHaveBeenCalled();
    expect(() => vi.advanceTimersByTime(1)).toThrow("Forced process exit");
    expect(server.closeAllConnections).toHaveBeenCalledExactlyOnceWith();
    expect(process.exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(dependencies.error).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        event: "server.shutdown_timeout",
        timeoutMs: 1000,
      }),
    );
  });

  it("keeps the deadline active after HTTP draining while Prisma disconnection is pending", async () => {
    dependencies.disconnect.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finishDisconnect = resolve;
        }),
    );
    const shutdown = await startServer();
    shutdown();
    finishHttpDrain?.();
    await Promise.resolve();
    expect(dependencies.disconnect).toHaveBeenCalledExactlyOnceWith();
    vi.advanceTimersByTime(999);
    expect(process.exit).not.toHaveBeenCalled();
    expect(() => vi.advanceTimersByTime(1)).toThrow("Forced process exit");
    expect(process.exit).toHaveBeenCalledExactlyOnceWith(1);
    expect(dependencies.info).not.toHaveBeenCalledWith(expect.any(String), {
      event: "server.shutdown_completed",
    });
  });
});
