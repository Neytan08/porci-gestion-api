import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { cleanDatabase } from "./database";
import { loadTestEnvironment } from "./testEnvironment";

// Vitest runs this setup for each integration test file. Global setup checks and reserves
// the database once for the run; these hooks manage the connection and cleanup within each file.
loadTestEnvironment();
// The application's shared Prisma client reads its connection settings when imported.
// Loading the test environment first prevents it from capturing a development connection.
const { default: prisma } = await import("../../src/prismaClient");

// Open the application connection before this file's tests begin.
beforeAll(async () => {
  await prisma.$connect();
});
// Remove previous test data so each test creates its own records and cannot depend on test order.
beforeEach(async () => {
  await cleanDatabase(prisma);
});
// A test may replace the clock with fake timers; restore real time for the next test and cleanup.
afterEach(() => {
  vi.useRealTimers();
});
// Remove the last test's records when the file finishes. Always close the connection,
// even if cleanup fails, so an open database connection does not keep the worker alive.
afterAll(async () => {
  try {
    await cleanDatabase(prisma);
  } finally {
    await prisma.$disconnect();
  }
});
