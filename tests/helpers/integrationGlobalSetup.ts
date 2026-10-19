import { PrismaClient } from "@prisma/client";
import { verifyTestDatabase } from "./database";
import { loadTestEnvironment } from "./testEnvironment";

/**
 * Runs once before the integration test files to check and reserve their shared database.
 * Verifies the database identity, required tables, and uniqueness indexes without creating
 * or migrating anything; the developer must initialize the test database beforehand.
 * Takes a PostgreSQL advisory lock: a reservation recognized by other runners using this same
 * lock key. If another runner holds it, setup fails immediately to avoid competing cleanups.
 * This lock does not block unrelated database clients that do not use the same convention.
 * Returns a teardown function that Vitest calls after the run to release the reservation.
 */
export default async function setup() {
  const { url } = loadTestEnvironment();
  // Advisory locks belong to a database session. Keep this separate client on one connection
  // so the reservation remains held while the application client runs tests on its own pool.
  url.searchParams.set("connection_limit", "1");
  const client = new PrismaClient({ datasourceUrl: url.toString() });
  try {
    await verifyTestDatabase(client);
    const [lock] = await client.$queryRaw<Array<{ acquired: boolean }>>`
      SELECT pg_try_advisory_lock(706726, 1) AS acquired
    `;
    if (!lock?.acquired) throw new Error("Another integration runner is using this test database.");
  } catch (error) {
    await client.$disconnect();
    throw error;
  }
  // Closing the dedicated session releases its advisory lock after all test files finish.
  return async () => {
    await client.$disconnect();
  };
}
