import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
} from "@prisma/client/runtime/library";
import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../../src/middlewares/errorHandler";
import logger from "../../../src/utils/logger";

vi.mock("../../../src/utils/logger", () => ({ default: { log: vi.fn() } }));

/** Captures the middleware's public response without starting an HTTP listener. */
function handleError(error: Error) {
  const response = {
    headersSent: false,
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  const next = vi.fn();
  errorHandler(error, {} as Request, response as unknown as Response, next);
  expect(next).not.toHaveBeenCalled();
  return response;
}

describe("centralized error handling", () => {
  it("omits private body fragments from malformed JSON diagnostics and responses", () => {
    const body = '{"notes": PRIVATE-FARM-NOTE}';
    let error: SyntaxError | undefined;
    try {
      JSON.parse(body);
    } catch (failure) {
      if (!(failure instanceof SyntaxError)) throw failure;
      error = failure;
    }
    if (!error) throw new Error("Expected invalid JSON to fail parsing");

    const response = handleError(Object.assign(error, { body }));
    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      status: 400,
      errorCode: "INVALID_JSON_BODY",
      message: "The request body contains invalid JSON.",
    });
    expect(logger.log).toHaveBeenCalledExactlyOnceWith({
      level: "warn",
      message: "Invalid JSON body",
      event: "request.failed",
      statusCode: 400,
      errorCode: "INVALID_JSON_BODY",
      errorType: "SyntaxError",
    });
    expect(JSON.stringify(vi.mocked(logger.log).mock.calls)).not.toContain("PRIVATE-FARM-NOTE");
  });

  it.each([
    {
      label: "database initialization failure",
      error: new PrismaClientInitializationError("PRIVATE-CONNECTION-DETAILS", "6", "P1001"),
      status: 503,
      errorCode: "DATABASE_UNAVAILABLE",
    },
    {
      label: "connection pool timeout",
      error: new PrismaClientKnownRequestError("PRIVATE-CONNECTION-DETAILS", {
        code: "P2024",
        clientVersion: "6",
        meta: { diagnostic: "PRIVATE-CONNECTION-DETAILS" },
      }),
      status: 503,
      errorCode: "DATABASE_UNAVAILABLE",
    },
    {
      label: "transaction conflict",
      error: new PrismaClientKnownRequestError("PRIVATE-CONNECTION-DETAILS", {
        code: "P2034",
        clientVersion: "6",
        meta: { diagnostic: "PRIVATE-CONNECTION-DETAILS" },
      }),
      status: 409,
      errorCode: "TRANSACTION_CONFLICT",
    },
  ])("maps $label without exposing persistence diagnostics", ({ error, status, errorCode }) => {
    const response = handleError(error);
    expect(response.status).toHaveBeenCalledWith(status);
    expect(response.json).toHaveBeenCalledWith({ status, errorCode, message: expect.any(String) });
    expect(JSON.stringify(response.json.mock.calls)).not.toContain("PRIVATE-CONNECTION-DETAILS");
    expect(logger.log).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        level: status >= 500 ? "error" : "warn",
        event: "request.failed",
        statusCode: status,
        errorCode,
      }),
    );
  });
});
