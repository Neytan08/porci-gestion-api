import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import logger from "../utils/logger";
import {
  getPrismaErrorCategory,
  isPrismaKnownRequestError,
  type PrismaErrorCategory,
} from "../utils/prismaErrors";

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

const PRISMA_ERROR_RESPONSES: Record<
  PrismaErrorCategory,
  { status: number; errorCode: string; message: string; logMessage: string }
> = {
  badRequest: {
    status: 400,
    errorCode: "PRISMA_REQUEST_ERROR",
    message: "The request could not be completed due to invalid persistence data.",
    logMessage: "Prisma rejected request data",
  },
  constraintConflict: {
    status: 409,
    errorCode: "PERSISTENCE_CONSTRAINT_CONFLICT",
    message: "The request conflicts with related or existing data.",
    logMessage: "Persistence constraint conflict",
  },
  recordNotFound: {
    status: 404,
    errorCode: "RECORD_NOT_FOUND",
    message: "The requested record was not found.",
    logMessage: "Record not found",
  },
  transactionConflict: {
    status: 409,
    errorCode: "TRANSACTION_CONFLICT",
    message: "The data changed during the operation. Retry with the current state.",
    logMessage: "Persistence transaction conflict",
  },
  unavailable: {
    status: 503,
    errorCode: "DATABASE_UNAVAILABLE",
    message: "The service is temporarily unable to access its database.",
    logMessage: "Database unavailable",
  },
  internal: {
    status: 500,
    errorCode: "PERSISTENCE_ERROR",
    message: "The request could not be completed due to an internal persistence error.",
    logMessage: "Unexpected persistence error",
  },
};

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

  const prismaErrorCategory = getPrismaErrorCategory(err);
  if (prismaErrorCategory) {
    const response = PRISMA_ERROR_RESPONSES[prismaErrorCategory];
    const knownPrismaError = isPrismaKnownRequestError(err) ? err : null;

    logHandledError(response.status, response.logMessage, {
      errorCode: response.errorCode,
      errorType: unknownError.name ?? "PrismaError",
      prismaCode: knownPrismaError?.code,
      prismaMeta: knownPrismaError?.meta,
    });

    return res.status(response.status).json({
      status: response.status,
      errorCode: response.errorCode,
      message: response.message,
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
