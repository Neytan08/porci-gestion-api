import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

const isPrismaKnownRequestError = (error: unknown): error is PrismaClientKnownRequestError => {
  if (!(error instanceof Error)) {
    return false;
  }

  const prismaError = error as PrismaClientKnownRequestError;
  return prismaError.name === "PrismaClientKnownRequestError";
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
