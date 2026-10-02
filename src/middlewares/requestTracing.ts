import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Request, RequestHandler } from "express";
import logger from "../utils/logger";
import {
  type RequestContext,
  runWithRequestContext,
} from "./requestContext";

const REQUEST_ID_HEADER = "X-Request-ID";
const MAX_REQUEST_ID_LENGTH = 128;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;

/** Reports whether a caller-provided request identifier is safe to propagate and log. */
const isValidRequestId = (requestId: string | undefined): requestId is string =>
  requestId !== undefined &&
  requestId.length <= MAX_REQUEST_ID_LENGTH &&
  REQUEST_ID_PATTERN.test(requestId);

/** Selects a trusted upstream request identifier or generates a local UUID. */
const resolveRequestId = (req: Request) => {
  const incomingRequestId = req.get(REQUEST_ID_HEADER);
  const trustsIncomingRequestId = process.env.TRUST_INCOMING_REQUEST_ID === "true";

  if (trustsIncomingRequestId && isValidRequestId(incomingRequestId)) {
    return incomingRequestId;
  }

  return randomUUID();
};

/** Rounds elapsed request time to a stable millisecond value for structured logs. */
const getDurationMs = (startedAt: number) =>
  Number((performance.now() - startedAt).toFixed(2));

/** Establishes request correlation and records the HTTP request lifecycle. */
export const requestTracing: RequestHandler = (req, res, next) => {
  const startedAt = performance.now();
  const context: RequestContext = {
    requestId: resolveRequestId(req),
    method: req.method,
    path: req.path,
  };
  let lifecycleCompleted = false;

  runWithRequestContext(context, () => {
    res.setHeader(REQUEST_ID_HEADER, context.requestId);

    res.once("finish", () => {
      lifecycleCompleted = true;
      runWithRequestContext(context, () => {
        logger.info("Request completed", {
          event: "request.completed",
          statusCode: res.statusCode,
          durationMs: getDurationMs(startedAt),
        });
      });
    });

    res.once("close", () => {
      if (lifecycleCompleted) {
        return;
      }

      lifecycleCompleted = true;
      runWithRequestContext(context, () => {
        logger.warn("Request aborted before completion", {
          event: "request.aborted",
          statusCode: res.headersSent ? res.statusCode : undefined,
          durationMs: getDurationMs(startedAt),
        });
      });
    });

    logger.debug("Request started", { event: "request.started" });
    next();
  });
};
