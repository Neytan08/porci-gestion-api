import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../src/prismaClient";
import { cleanDatabase, verifyTestDatabase } from "../helpers/database";

vi.mock("../../src/prismaClient", () => ({
  default: {
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    farrowings: { deleteMany: vi.fn() },
    matingevents: { deleteMany: vi.fn() },
    boars: { deleteMany: vi.fn() },
    breedingsows: { deleteMany: vi.fn() },
    breeds: { deleteMany: vi.fn() },
  },
}));

const deletions = [
  prisma.farrowings.deleteMany,
  prisma.matingevents.deleteMany,
  prisma.boars.deleteMany,
  prisma.breedingsows.deleteMany,
  prisma.breeds.deleteMany,
];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("DATABASE_URL", "postgresql://localhost/farm_test");
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ database: "farm_test", schema: "public" }]);
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
    if (typeof callback !== "function") throw new Error("Expected interactive transaction");
    return callback(prisma);
  });
});

describe("test database preflight", () => {
  const tables = ["breeds", "boars", "breedingsows", "matingevents", "farrowings"].map(
    (tablename) => ({ tablename }),
  );
  const indexes = [
    ["breeds", "breed_name"],
    ["boars", "boar_tag_number"],
    ["breedingsows", "sow_tag_number"],
  ].map(([table_name, column]) => ({
    table_name,
    expression: `lower(regexp_replace((${column})::text, '[[:space:]]+'::text, ''::text, 'g'::text))`,
  }));

  it("accepts a complete schema with normalized indexes including PostgreSQL casts", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ database: "farm_test", schema: "public" }])
      .mockResolvedValueOnce(tables)
      .mockResolvedValueOnce(indexes);
    await expect(verifyTestDatabase(prisma)).resolves.toBeUndefined();
    for (const deletion of deletions) expect(deletion).not.toHaveBeenCalled();
  });
  it("rejects an uninitialized schema before cleanup", async () => {
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ database: "farm_test", schema: "public" }])
      .mockResolvedValueOnce([]);
    await expect(verifyTestDatabase(prisma)).rejects.toThrow("missing table");
    for (const deletion of deletions) expect(deletion).not.toHaveBeenCalled();
  });
  it("requires every normalized uniqueness index", async () => {
    const table = "boars";
    vi.mocked(prisma.$queryRaw)
      .mockResolvedValueOnce([{ database: "farm_test", schema: "public" }])
      .mockResolvedValueOnce(tables)
      .mockResolvedValueOnce(indexes.filter(({ table_name }) => table_name !== table));
    await expect(verifyTestDatabase(prisma)).rejects.toThrow(`index on ${table}.`);
  });
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("central database cleanup", () => {
  it("verifies the connected target before deleting children then parents in one transaction", async () => {
    await cleanDatabase(prisma);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    let precedingCall = vi.mocked(prisma.$queryRaw).mock.invocationCallOrder[0];
    for (const deletion of deletions) {
      expect(deletion).toHaveBeenCalledExactlyOnceWith();
      const currentCall = vi.mocked(deletion).mock.invocationCallOrder[0];
      expect(currentCall).toBeGreaterThan(precedingCall);
      precedingCall = currentCall;
    }
  });
  it("does not delete any records when the connected target is wrong", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ database: "development", schema: "public" }]);
    await expect(cleanDatabase(prisma)).rejects.toThrow("Cleanup refused");
    for (const deletion of deletions) expect(deletion).not.toHaveBeenCalled();
  });
});
