import prisma from "../../src/prismaClient";
import { afterEach, describe, expect, it, vi } from "vitest";
import { assertConnectedTestDatabase, cleanDatabase } from "../helpers/database";
import { assertTestDatabaseUrl, loadTestEnvironment } from "../helpers/testEnvironment";

vi.mock("node:fs", () => ({ readFileSync: vi.fn() }));
vi.mock("../../src/prismaClient", () => ({
  default: { $transaction: vi.fn(), $queryRaw: vi.fn() },
}));
import { readFileSync } from "node:fs";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("test database safety", () => {
  it.each([
    undefined,
    "invalid",
    "postgresql://localhost/porcigestion",
    "postgresql://localhost/porcigestion_test?schema=other",
  ])("refuses unsafe connection %s", (url) => {
    expect(() => assertTestDatabaseUrl(url, "test")).toThrow();
  });
  it("requires test mode and accepts a clearly named test database", () => {
    expect(() => assertTestDatabaseUrl("postgresql://localhost/farm_test", "production")).toThrow();
    expect(
      assertTestDatabaseUrl("postgresql://localhost/farm_test?schema=public", "test").databaseName,
    ).toBe("farm_test");
  });
  it("never falls back to an inherited development connection", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/development");
    vi.mocked(readFileSync).mockReturnValue("DB_NAME=farm_test\n");
    expect(() => loadTestEnvironment()).toThrow("DATABASE_URL");
    expect(process.env.DATABASE_URL).toBe("postgresql://localhost/development");
  });
  it("overrides inherited settings with the explicit test file before app import", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/development");
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_FILES_ENABLED", "true");
    vi.stubEnv("LOG_LEVEL", "debug");
    vi.stubEnv("TZ", "UTC");
    vi.stubEnv("TRUST_INCOMING_REQUEST_ID", "true");
    vi.mocked(readFileSync).mockReturnValue("DATABASE_URL=postgresql://localhost/farm_test\n");
    loadTestEnvironment();
    expect(process.env.DATABASE_URL).toBe("postgresql://localhost/farm_test?connection_limit=5");
    expect(process.env.NODE_ENV).toBe("test");
    expect(process.env.LOG_FILES_ENABLED).toBe("false");
  });
  it("refuses a connection whose actual database differs", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/farm_test");
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ database: "development", schema: "public" }]);
    await expect(assertConnectedTestDatabase(prisma)).rejects.toThrow("Cleanup refused");
  });
  it("refuses an insufficient connection pool", () => {
    const limit = "3";
    vi.mocked(readFileSync).mockReturnValue(
      `DATABASE_URL=postgresql://localhost/farm_test?connection_limit=${limit}\n`,
    );
    expect(() => loadTestEnvironment()).toThrow("at least 4");
  });
  it("refuses a connection whose actual schema differs", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/farm_test");
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ database: "farm_test", schema: "other" }]);
    await expect(assertConnectedTestDatabase(prisma)).rejects.toThrow("Cleanup refused");
  });
  it("stops before opening a cleanup transaction on a non-test target", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/development");
    await expect(cleanDatabase(prisma)).rejects.toThrow();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
