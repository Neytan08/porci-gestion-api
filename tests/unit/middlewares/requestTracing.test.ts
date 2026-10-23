import { EventEmitter } from "node:events";
import { Writable } from "node:stream";
import type { Request, Response } from "express";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { format, transports } from "winston";
import { getRequestContext } from "../../../src/middlewares/requestContext";
import { requestTracing } from "../../../src/middlewares/requestTracing";
import logger from "../../../src/utils/logger";

const records: Array<Record<string, unknown>> = [];
const originalTransports = [...logger.transports];
const originalLevel = logger.level;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(() => {
  records.length = 0;
  logger.clear();
  logger.level = "debug";
  logger.add(
    new transports.Stream({
      format: format.json(),
      stream: new Writable({
        /** Captures the real logger output after asynchronous request context enrichment. */
        write(chunk: Buffer, _encoding, callback) {
          records.push(JSON.parse(chunk.toString()));
          callback();
        },
      }),
    }),
  );
});

afterEach(() => {
  logger.clear();
  for (const transport of originalTransports) logger.add(transport);
  logger.level = originalLevel;
  vi.unstubAllEnvs();
});

/** Supplies the HTTP fields and lifecycle events consumed by the middleware. */
function traceRequest(incomingId?: string, path = "/api/breeds", next = () => {}) {
  const request = { method: "GET", path, get: () => incomingId } as unknown as Request;
  const response = Object.assign(new EventEmitter(), {
    statusCode: 200,
    headersSent: false,
    setHeader: vi.fn(),
  });
  requestTracing(request, response as unknown as Response, next);
  const requestId = response.setHeader.mock.calls[0]?.[1];
  if (typeof requestId !== "string") throw new Error("Expected a response request ID");
  return { response, requestId };
}

describe("request tracing and logging context", () => {
  it("replaces caller identifiers when incoming request IDs are not trusted", () => {
    vi.stubEnv("TRUST_INCOMING_REQUEST_ID", "false");
    const { response, requestId } = traceRequest("upstream-123");
    response.emit("finish");
    expect(requestId).toMatch(uuidPattern);
    expect(records).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ event: "request.started", requestId }),
        expect.objectContaining({ event: "request.completed", requestId }),
      ]),
    );
  });

  it("preserves safe trusted identifiers including the maximum permitted length", () => {
    vi.stubEnv("TRUST_INCOMING_REQUEST_ID", "true");
    for (const incoming of ["Upstream_123.test:4-5", "a".repeat(128)]) {
      const { response, requestId } = traceRequest(incoming);
      response.emit("finish");
      expect(requestId).toBe(incoming);
      expect(records).toContainEqual(
        expect.objectContaining({
          event: "request.completed",
          requestId: incoming,
        }),
      );
    }
  });

  it("replaces absent, invalid and overlong identifiers even when the upstream is trusted", () => {
    vi.stubEnv("TRUST_INCOMING_REQUEST_ID", "true");
    for (const incoming of [undefined, "", "bad id", "bad\nentry", "-bad", "a".repeat(129)]) {
      const { response, requestId } = traceRequest(incoming);
      response.emit("finish");
      expect(requestId).toMatch(uuidPattern);
      expect(requestId).not.toBe(incoming);
    }
  });

  it("isolates overlapping asynchronous requests and matches logs to their response identifiers", async () => {
    vi.stubEnv("TRUST_INCOMING_REQUEST_ID", "true");
    let releaseFirst: (() => void) | undefined;
    const barrier = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let firstWork: Promise<void> | undefined;
    const first = traceRequest("first-request", "/api/breeds", () => {
      firstWork = barrier.then(() => {
        logger.info("First request work", { event: "test.first" });
      });
    });
    let secondWork: Promise<void> | undefined;
    const second = traceRequest("second-request", "/api/boars", () => {
      secondWork = Promise.resolve().then(() => {
        logger.info("Second request work", { event: "test.second" });
      });
    });
    await secondWork;
    second.response.emit("finish");
    releaseFirst?.();
    await firstWork;
    first.response.emit("finish");
    expect(records).toContainEqual(
      expect.objectContaining({
        event: "test.first",
        requestId: first.requestId,
        method: "GET",
        path: "/api/breeds",
      }),
    );
    expect(records).toContainEqual(
      expect.objectContaining({
        event: "test.second",
        requestId: second.requestId,
        method: "GET",
        path: "/api/boars",
      }),
    );
    expect(getRequestContext()).toBeUndefined();
    logger.info("Outside request work", { event: "test.outside" });
    expect(records.find(({ event }) => event === "test.outside")).not.toHaveProperty("requestId");
  });

  it("logs one completion with status and duration when finish is followed by close", () => {
    const { response, requestId } = traceRequest();
    response.statusCode = 409;
    response.headersSent = true;
    response.emit("finish");
    response.emit("close");
    const terminal = records.filter(
      ({ event }) => event === "request.completed" || event === "request.aborted",
    );
    expect(terminal).toEqual([
      expect.objectContaining({
        event: "request.completed",
        requestId,
        statusCode: 409,
        durationMs: expect.any(Number),
      }),
    ]);
    expect(terminal[0]?.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("logs a premature closure once and includes status only when headers have been sent", () => {
    for (const headersSent of [false, true]) {
      const { response, requestId } = traceRequest();
      response.headersSent = headersSent;
      response.statusCode = 201;
      response.emit("close");
      response.emit("close");
      const terminal = records.filter(
        (record) =>
          record.requestId === requestId &&
          (record.event === "request.completed" || record.event === "request.aborted"),
      );
      expect(terminal).toEqual([
        expect.objectContaining({
          event: "request.aborted",
          level: "warn",
          requestId,
          durationMs: expect.any(Number),
        }),
      ]);
      if (headersSent) expect(terminal[0]?.statusCode).toBe(201);
      else expect(terminal[0]).not.toHaveProperty("statusCode");
    }
  });
});
