import type { Prisma, PrismaClient } from "@prisma/client";
import { assertTestDatabaseUrl } from "./testEnvironment";

/**
 * Confirms that the live connection matches the test database named in DATABASE_URL.
 * A valid-looking URL alone is not enough: PostgreSQL must report the expected database
 * and public schema. Throws on a mismatch so callers stop before deleting any records.
 * Accepts either a regular client or a transaction client, allowing cleanup to check
 * the identity inside the same transaction that will perform the deletions.
 */
export async function assertConnectedTestDatabase(
  client: Pick<Prisma.TransactionClient, "$queryRaw">,
) {
  const { databaseName } = assertTestDatabaseUrl(process.env.DATABASE_URL, process.env.NODE_ENV);
  const [identity] = await client.$queryRaw<Array<{ database: string; schema: string }>>`
    SELECT current_database()::text AS database, current_schema()::text AS schema
  `;
  if (identity?.database !== databaseName || identity.schema !== "public") {
    throw new Error(
      "Cleanup refused: connected database/schema differs from the approved test target.",
    );
  }
}

/**
 * Deletes all rows from the five application tables below to give the next test a clean start.
 * Checks the configured target before opening a transaction, then checks the live database
 * inside it. Deletes dependent records before their parents to respect foreign keys.
 * All deletions share one transaction, so a failure rolls them back together.
 * Tables, indexes, and ID sequences remain intact; tests must use the IDs they receive
 * rather than assume that numbering restarts at one after cleanup.
 */
export async function cleanDatabase(client: Pick<PrismaClient, "$transaction">) {
  assertTestDatabaseUrl(process.env.DATABASE_URL, process.env.NODE_ENV);
  await client.$transaction(async (tx) => {
    await assertConnectedTestDatabase(tx);
    await tx.farrowings.deleteMany();
    await tx.matingevents.deleteMany();
    await tx.boars.deleteMany();
    await tx.breedingsows.deleteMany();
    await tx.breeds.deleteMany();
  });
}

/**
 * Checks the existing test database before the integration run is allowed to clean or use it.
 * After checking its identity, requires the five tables used by the tests and unique indexes
 * that compare breed names and animal tags after removing whitespace and converting to lowercase.
 * Those indexes enforce uniqueness even when concurrent requests submit equivalent values.
 * These are readiness checks, not a full schema comparison: missing requirements produce an
 * error explaining what to initialize, and this function never creates or changes the schema.
 */
export async function verifyTestDatabase(client: PrismaClient) {
  await assertConnectedTestDatabase(client);
  const tables = await client.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename::text FROM pg_tables WHERE schemaname = 'public'
  `;
  for (const table of ["breeds", "boars", "breedingsows", "matingevents", "farrowings"]) {
    if (!tables.some(({ tablename }) => tablename === table)) {
      throw new Error(`Initialize the test database first: missing table ${table}.`);
    }
  }
  const indexes = await client.$queryRaw<Array<{ table_name: string; expression: string }>>`
    SELECT t.relname::text AS table_name, pg_get_expr(i.indexprs, i.indrelid) AS expression
    FROM pg_index i
    JOIN pg_class t ON t.oid = i.indrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public' AND i.indisunique AND i.indisvalid
      AND i.indpred IS NULL AND i.indexprs IS NOT NULL AND i.indnkeyatts = 1
  `;
  for (const [table, column] of [
    ["breeds", "breed_name"],
    ["boars", "boar_tag_number"],
    ["breedingsows", "sow_tag_number"],
  ]) {
    // PostgreSQL may print equivalent expressions with casts, spacing, or extra parentheses.
    // Normalize those formatting differences before comparing the required index expression.
    const expected = `lower(regexp_replace(${column},'[[:space:]]+','','g'))`;
    const found = indexes.some(
      ({ table_name, expression }) =>
        table_name === table &&
        expression
          .replace(/::text/g, "")
          .replace(/\s+/g, "")
          .replaceAll(`(${column})`, column) === expected,
    );
    if (!found)
      throw new Error(
        `Initialize the normalized unique index on ${table}.${column}; see dev-docs/database.md.`,
      );
  }
}
