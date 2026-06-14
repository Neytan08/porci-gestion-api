import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/apiError";
import logger from "../utils/logger";

const getEndpoint = (req: Request) => `${req.method} ${req.originalUrl}`;

const getRequestedBy = (req: Request) => {
  const requestWithUser = req as Request & {
    user?: {
      id?: string | number;
    };
  };

  return requestWithUser.user?.id ?? "To implement";
};

const getErrorLogLevel = (statusCode: number) => (statusCode >= 500 ? "error" : "warn");

const logHandledError = (
  req: Request,
  statusCode: number,
  logMessage: string,
  metadata: Record<string, unknown>,
) => {
  logger.log({
    level: getErrorLogLevel(statusCode),
    message: logMessage,
    ...metadata,
    endpoint: getEndpoint(req),
    requestedBy: getRequestedBy(req),
  });
};

/**
 * Global error handling middleware
 * It centralizes error handling and ensures consistent error responses across the API.
 * Having this structure is how express identifies it as an error handling middleware (4 parameters).
 */
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  void next;
  const unknownError = err as {
    name?: string;
    errors?: unknown;
    statusCode?: number;
    message?: string;
    stack?: string;
  };

  // JSON parse error (invalid body)
  if (err instanceof SyntaxError && "body" in err) {
    const status = 400;
    const errorCode = "INVALID_JSON_BODY";

    logHandledError(req, status, "Invalid JSON body", {
      errorCode,
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
    logHandledError(req, err.statusCode, err.logMessage, {
      errorCode: err.errorCode,
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

      logHandledError(req, status, "Unique constraint failed", {
        errorCode,
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

      logHandledError(req, status, "Record not found", {
        errorCode,
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

    logHandledError(req, status, "Prisma request error", {
      errorCode,
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

    logHandledError(req, status, "Validation error", {
      errorCode,
      issues: unknownError.errors,
    });

    return res.status(status).json({
      status,
      errorCode,
      message: "The request data is invalid.",
    });
  }

  // Fallback (error did't find a specific handler)
  const status = unknownError.statusCode ?? 500;
  const errorCode = "INTERNAL_SERVER_ERROR";

  logHandledError(req, status, "Unhandled error", {
    errorCode,
    rawMessage: unknownError.message ?? "Internal Server Error",
    stack: unknownError.stack,
  });

  return res.status(status).json({
    status,
    errorCode,
    message: "An unexpected error occurred.",
  });
}
