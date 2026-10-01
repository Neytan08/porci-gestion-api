import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import logger from "../utils/logger";

const getErrorLogLevel = (statusCode: number) => (statusCode >= 500 ? "error" : "warn");

/** Emits one structured diagnostic event for a handled request failure. */
const logHandledError = (
  statusCode: number,
  logMessage: string,
  metadata: Record<string, unknown>,
) => {
  logger.log({
    level: getErrorLogLevel(statusCode),
    message: logMessage,
    event: "request.failed",
    statusCode,
    ...metadata,
  });
};

/** Restricts arbitrary error status values to valid HTTP failure responses. */
const getResponseStatus = (statusCode: number | undefined) =>
  statusCode !== undefined && statusCode >= 400 && statusCode <= 599 ? statusCode : 500;

/**
 * Global error handling middleware
 * It centralizes error handling and ensures consistent error responses across the API.
 * Having this structure is how express identifies it as an error handling middleware (4 parameters).
 */
export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction) {
  const unknownError = err as {
    name?: string;
    errors?: unknown;
    issues?: unknown;
    statusCode?: number;
    message?: string;
    stack?: string;
  };

  if (res.headersSent) {
    logHandledError(
      getResponseStatus(unknownError.statusCode),
      "Request failed after headers were sent",
      {
        errorCode: "RESPONSE_ALREADY_STARTED",
        errorType: unknownError.name ?? "Error",
        rawMessage: unknownError.message,
        stack: unknownError.stack,
      },
    );
    return next(err);
  }

  // JSON parse error (invalid body)
  if (err instanceof SyntaxError && "body" in err) {
    const status = 400;
    const errorCode = "INVALID_JSON_BODY";

    logHandledError(status, "Invalid JSON body", {
      errorCode,
      errorType: err.name,
      rawMessage: err.message,
    });

    return res.status(status).json({
      status,
      errorCode,
      message: "The request body contains invalid JSON.",
    });
  }

  // Triggered errors by the routes
  if (err instanceof ApiError) {
    logHandledError(err.statusCode, err.logMessage, {
      errorCode: err.errorCode,
      errorType: err.name,
      ...err.logContext,
    });

    return res.status(err.statusCode).json({
      status: err.statusCode,
      errorCode: err.errorCode,
      message: err.message,
    });
  }

  // Prisma Client Known Errors
  if (unknownError.name === "PrismaClientKnownRequestError") {
    const prismaError = err as PrismaClientKnownRequestError;

    if (prismaError.code === "P2002") {
      const status = 409;
      const errorCode = "UNIQUE_CONSTRAINT_FAILED";

      logHandledError(status, "Unique constraint failed", {
        errorCode,
        errorType: prismaError.name,
        prismaCode: prismaError.code,
        target: prismaError.meta?.target,
      });

      return res.status(status).json({
        status,
        errorCode,
        message: "A unique constraint was violated.",
      });
    }

    if (prismaError.code === "P2025") {
      const status = 404;
      const errorCode = "RECORD_NOT_FOUND";

      logHandledError(status, "Record not found", {
        errorCode,
        errorType: prismaError.name,
        prismaCode: prismaError.code,
      });

      return res.status(status).json({
        status,
        errorCode,
        message: "The requested record was not found.",
      });
    }

    const status = 400;
    const errorCode = "PRISMA_REQUEST_ERROR";

    logHandledError(status, "Prisma request error", {
      errorCode,
      errorType: prismaError.name,
      prismaCode: prismaError.code,
      prismaMeta: prismaError.meta,
    });

    return res.status(status).json({
      status,
      errorCode,
      message: "The request could not be completed due to a persistence error.",
    });
  }

  // Validations
  if (unknownError.name === "ZodError") {
    const status = 400;
    const errorCode = "VALIDATION_ERROR";

    logHandledError(status, "Validation error", {
      errorCode,
      errorType: unknownError.name,
      issues: unknownError.issues ?? unknownError.errors,
    });

    return res.status(status).json({
      status,
      errorCode,
      message: "The request data is invalid.",
    });
  }

  // Fallback (error did't find a specific handler)
  const status = getResponseStatus(unknownError.statusCode);
  const errorCode = "INTERNAL_SERVER_ERROR";

  logHandledError(status, "Unhandled error", {
    errorCode,
    errorType: unknownError.name ?? "Error",
    rawMessage: unknownError.message ?? "Internal Server Error",
    stack: unknownError.stack,
  });

  return res.status(status).json({
    status,
    errorCode,
    message: "An unexpected error occurred.",
  });
}
