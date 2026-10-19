import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseEnv } from "node:util";

/**
 * Checks that a connection URL explicitly targets a PostgreSQL test database before it is used.
 * Requires test mode, a database name ending in _test, and the public schema; rejects connection
 * options that could override the intended target. Returns the parsed URL and database name
 * for later checks. This validates configuration only; it does not connect to PostgreSQL.
 */
export function assertTestDatabaseUrl(value: string | undefined, nodeEnv: string | undefined) {
  if (nodeEnv !== "test") throw new Error("Database tests require NODE_ENV=test.");
  let url: URL;
  try {
    url = new URL(value ?? "");
  } catch {
    throw new Error("Set a valid DATABASE_URL in .env.test; no other environment is used.");
  }
  const databaseName = decodeURIComponent(url.pathname.slice(1));
  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    !/^[a-zA-Z0-9_]+_test$/.test(databaseName) ||
    (url.searchParams.has("schema") && url.searchParams.get("schema") !== "public") ||
    url.searchParams.has("options") ||
    url.searchParams.has("host")
  ) {
    throw new Error(
      "Test DATABASE_URL must name a dedicated *_test database using the public schema.",
    );
  }
  return { url, databaseName };
}

/**
 * Prepares the process environment before the application's Prisma client is imported.
 * Reads DATABASE_URL only from .env.test in the repository root, so a missing or invalid test
 * connection fails instead of falling back to development credentials from the shell or .env.
 * NODE_ENV=test is assigned here, so .env.test only needs DATABASE_URL. Logging, timezone,
 * and request-ID settings are also set here to keep test runs consistent.
 * Ensures the connection pool can support concurrency tests and returns the validated target
 * so global setup can create its separate connection for reserving the database.
 */
export function loadTestEnvironment() {
  let values: ReturnType<typeof parseEnv>;
  try {
    values = parseEnv(readFileSync(resolve(process.cwd(), ".env.test"), "utf8"));
  } catch {
    throw new Error("Create .env.test from .env.test.example before running integration tests.");
  }
  const target = assertTestDatabaseUrl(values.DATABASE_URL, "test");
  const connectionLimit = target.url.searchParams.get("connection_limit");
  if (connectionLimit !== null && (!/^\d+$/.test(connectionLimit) || Number(connectionLimit) < 4)) {
    throw new Error("Concurrency tests require connection_limit of at least 4 in .env.test.");
  }
  if (connectionLimit === null) target.url.searchParams.set("connection_limit", "5");
  process.env.NODE_ENV = "test";
  process.env.DATABASE_URL = target.url.toString();
  process.env.LOG_FILES_ENABLED = "false";
  process.env.LOG_LEVEL = "error";
  process.env.TZ = "UTC";
  process.env.TRUST_INCOMING_REQUEST_ID = "false";
  return target;
}
