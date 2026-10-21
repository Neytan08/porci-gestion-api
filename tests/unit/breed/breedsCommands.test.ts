import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../src/prismaClient";
import { BREED_ERROR_CODES as codes } from "../../../src/services/breeds/breedErrors";
import { createBreed, deleteBreed, updateBreed } from "../../../src/services/breeds/breedsCommands";
import * as queries from "../../../src/services/breeds/breedsQueries";

vi.mock("../../../src/prismaClient", () => ({ default: { $transaction: vi.fn() } }));
const { nameLookup } = vi.hoisted(() => ({
  nameLookup: vi.fn<() => Promise<{ breed_id: number; breed_name: string } | null>>(),
}));
vi.mock("../../../src/services/breeds/breedsQueries", () => ({
  getBreedById: vi.fn(),
  getBreedByNormalizedName: nameLookup,
  insertBreed: vi.fn(),
  updateBreedById: vi.fn(),
  countBreedRelatedAnimals: vi.fn(),
  deleteBreedById: vi.fn(),
}));

const input = { breed_name: "Duroc" };
const record = { breed_id: 7, ...input, description: null };

/** Produces a real Prisma request error without opening a database connection. */
function persistenceError(code: string) {
  return new PrismaClientKnownRequestError("test persistence failure", {
    code,
    clientVersion: "6",
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  // Queries are mocked; this token only identifies the interactive transaction.
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
    if (typeof callback !== "function") throw new Error("Expected interactive transaction");
    return callback(prisma);
  });
  vi.mocked(queries.getBreedById).mockResolvedValue(record);
  nameLookup.mockResolvedValue(null);
  vi.mocked(queries.insertBreed).mockResolvedValue(record);
  vi.mocked(queries.updateBreedById).mockResolvedValue(record);
  vi.mocked(queries.countBreedRelatedAnimals).mockResolvedValue({ boars: 0, breedingSows: 0 });
  vi.mocked(queries.deleteBreedById).mockResolvedValue(record);
});

describe("breed command decisions", () => {
  it("rejects an existing normalized name before inserting", async () => {
    vi.mocked(queries.getBreedByNormalizedName).mockResolvedValue(record);
    await expect(createBreed(input)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: codes.BREED_NAME_ALREADY_EXISTS,
    });
    expect(queries.insertBreed).not.toHaveBeenCalled();
  });

  it("rejects another breed's normalized name before updating", async () => {
    vi.mocked(queries.getBreedByNormalizedName).mockResolvedValue({ ...record, breed_id: 8 });
    await expect(updateBreed(record.breed_id, input)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: codes.BREED_NAME_ALREADY_EXISTS,
    });
    expect(queries.updateBreedById).not.toHaveBeenCalled();
  });

  it("allows a breed to retain its own normalized name", async () => {
    vi.mocked(queries.getBreedByNormalizedName).mockResolvedValue(record);
    const data = { breed_name: " d u r o c " };
    await expect(updateBreed(record.breed_id, data)).resolves.toEqual(record);
    expect(queries.getBreedByNormalizedName).toHaveBeenCalledWith(data.breed_name, prisma);
    expect(queries.updateBreedById).toHaveBeenCalledWith(record.breed_id, data, prisma);
  });

  it("rejects a missing update target before checking names or writing", async () => {
    vi.mocked(queries.getBreedById).mockResolvedValue(null);
    await expect(updateBreed(record.breed_id, input)).rejects.toMatchObject({
      statusCode: 404,
      errorCode: codes.BREED_NOT_FOUND,
    });
    expect(queries.getBreedByNormalizedName).not.toHaveBeenCalled();
    expect(queries.updateBreedById).not.toHaveBeenCalled();
  });

  it.each([
    { boars: 1, breedingSows: 0 },
    { boars: 0, breedingSows: 1 },
  ])("blocks deletion with related animals %j", async (counts) => {
    vi.mocked(queries.countBreedRelatedAnimals).mockResolvedValue(counts);
    await expect(deleteBreed(record.breed_id)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: codes.BREED_HAS_RELATED_ANIMALS,
    });
    expect(queries.deleteBreedById).not.toHaveBeenCalled();
  });
});

describe("breed persistence failure translation", () => {
  it.each(["create", "update"] as const)(
    "translates a unique constraint lost during %s",
    async (operation) => {
      const write = operation === "create" ? queries.insertBreed : queries.updateBreedById;
      vi.mocked(write).mockRejectedValue(persistenceError("P2002"));
      await expect(
        operation === "create" ? createBreed(input) : updateBreed(record.breed_id, input),
      ).rejects.toMatchObject({ statusCode: 409, errorCode: codes.BREED_NAME_ALREADY_EXISTS });
      expect(write).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["update", "delete"] as const)(
    "translates a target disappearing during %s",
    async (operation) => {
      const write = operation === "update" ? queries.updateBreedById : queries.deleteBreedById;
      vi.mocked(write).mockRejectedValue(persistenceError("P2025"));
      await expect(
        operation === "update" ? updateBreed(record.breed_id, input) : deleteBreed(record.breed_id),
      ).rejects.toMatchObject({ statusCode: 404, errorCode: codes.BREED_NOT_FOUND });
      expect(write).toHaveBeenCalledTimes(1);
    },
  );

  it("translates an animal reference added after the deletion check", async () => {
    vi.mocked(queries.deleteBreedById).mockRejectedValue(persistenceError("P2003"));
    await expect(deleteBreed(record.breed_id)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: codes.BREED_HAS_RELATED_ANIMALS,
    });
    expect(queries.deleteBreedById).toHaveBeenCalledWith(record.breed_id, prisma);
  });

  it("preserves unexpected persistence failures", async () => {
    const failure = new Error("unexpected failure");
    vi.mocked(prisma.$transaction).mockRejectedValue(failure);
    await expect(createBreed(input)).rejects.toBe(failure);
  });
});
