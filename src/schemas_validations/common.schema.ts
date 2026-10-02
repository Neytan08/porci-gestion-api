import { z } from "zod";

/** Largest value supported by Prisma Int fields backed by PostgreSQL integer columns. */
export const POSTGRESQL_INTEGER_MAX = 2_147_483_647;

/** Validates identifiers before values cross into PostgreSQL integer operations. */
export const databaseIdSchema = z.number().int().positive().max(POSTGRESQL_INTEGER_MAX);

/** Matches nonnegative Decimal(5,2) measurements used by animal records. */
export const animalMeasurementSchema = z.number().nonnegative().max(999.99).multipleOf(0.01);

/** Matches nonnegative counters stored in PostgreSQL integer columns. */
export const nonNegativeDatabaseIntegerSchema = z
  .number()
  .int()
  .nonnegative()
  .max(POSTGRESQL_INTEGER_MAX);
