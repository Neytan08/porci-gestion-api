import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const BAD_REQUEST_PRISMA_CODES = new Set([
  "P2000",
  "P2006",
  "P2009",
  "P2012",
  "P2013",
  "P2019",
  "P2020",
]);

export type PrismaErrorCategory =
  | "badRequest"
  | "constraintConflict"
  | "recordNotFound"
  | "transactionConflict"
  | "unavailable"
  | "internal";

/** Identifies Prisma errors that expose a stable request-error code. */
export const isPrismaKnownRequestError = (
  error: unknown,
): error is PrismaClientKnownRequestError => {
  if (!(error instanceof Error)) {
    return false;
  }

  const prismaError = error as PrismaClientKnownRequestError;
  return prismaError.name === "PrismaClientKnownRequestError";
};

/** Classifies persistence failures by the HTTP and operational behavior they require. */
export const getPrismaErrorCategory = (error: unknown): PrismaErrorCategory | null => {
  if (!(error instanceof Error)) {
    return null;
  }

  if (error.name === "PrismaClientInitializationError") {
    return "unavailable";
  }

  if (!isPrismaKnownRequestError(error)) {
    return error.name.startsWith("PrismaClient") ? "internal" : null;
  }

  if (error.code === "P2002") return "constraintConflict";
  if (error.code === "P2025") return "recordNotFound";
  if (error.code === "P2003" || error.code === "P2014") return "constraintConflict";
  if (error.code === "P2034") return "transactionConflict";
  if (error.code === "P2024") return "unavailable";
  if (BAD_REQUEST_PRISMA_CODES.has(error.code)) return "badRequest";
  return "internal";
};

/**
 * Identifies Prisma's "record not found" error so command modules can replace
 * generic persistence failures with domain-specific API errors.
 */
export const isPrismaRecordNotFoundError = (error: unknown) =>
  isPrismaKnownRequestError(error) && error.code === "P2025";

/**
 * Identifies unique-constraint failures raised when a concurrent request wins a
 * duplicate check between validation and persistence.
 */
export const isPrismaUniqueConstraintError = (error: unknown) =>
  isPrismaKnownRequestError(error) && error.code === "P2002";

/**
 * Identifies foreign-key violations, usually caused by deleting records that
 * are still referenced by related entities.
 */
export const isPrismaForeignKeyConstraintError = (error: unknown) =>
  isPrismaKnownRequestError(error) && error.code === "P2003";
