import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../src/prismaClient";
import { getBreedById } from "../../../src/services/breeds/breedsQueries";
import { BREEDING_SOW_ERROR_CODES as codes } from "../../../src/services/breedingSows/breedingSowErrors";
import {
  createBreedingSow,
  deleteBreedingSow,
  retireBreedingSow,
  updateBreedingSow,
} from "../../../src/services/breedingSows/breedingSowsCommands";
import * as queries from "../../../src/services/breedingSows/breedingSowsQueries";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import {
  closeFarrowingsForRetirement,
  getActiveFarrowingsBySowIds,
} from "../../../src/services/farrowings/farrowingsQueries";
import {
  cancelActiveMatingEventsBySowIds,
  countMatingEventsBySowId,
} from "../../../src/services/matingEvents/matingEventsQueries";

vi.mock("../../../src/prismaClient", () => ({ default: { $transaction: vi.fn() } }));
vi.mock("../../../src/services/breeds/breedsQueries", () => ({ getBreedById: vi.fn() }));
const { tagLookup } = vi.hoisted(() => ({
  tagLookup: vi.fn<() => Promise<{ sow_id: number; sow_tag_number: string } | null>>(),
}));
vi.mock("../../../src/services/breedingSows/breedingSowsQueries", () => ({
  getActiveBreedingSowForUpdate: vi.fn(),
  getActiveBreedingSowWithStatus: vi.fn(),
  getBreedingSowByNormalizedTagNumber: tagLookup,
  getBreedingSowsForRetirement: vi.fn(),
  insertBreedingSow: vi.fn(),
  updateActiveBreedingSowById: vi.fn(),
  deleteActiveBreedingSowById: vi.fn(),
  retireActiveBreedingSows: vi.fn(),
}));
vi.mock("../../../src/services/breedingSows/breedingSowsStatusValidation", () => ({
  ensureManualStatusChangeIsAllowed: vi.fn(),
}));
vi.mock("../../../src/services/matingEvents/matingEventsQueries", () => ({
  cancelActiveMatingEventsBySowIds: vi.fn(),
  countMatingEventsBySowId: vi.fn(),
}));
vi.mock("../../../src/services/farrowings/farrowingsQueries", () => ({
  closeFarrowingsForRetirement: vi.fn(),
  getActiveFarrowingsBySowIds: vi.fn(),
}));

const input = {
  breed_id: 3,
  sow_tag_number: "S7",
  entry_date: new Date("2023-01-01"),
  status: statuses.vacia,
  mammary_glands: 12,
  farrowing_number: 0,
};
const record = {
  ...input,
  sow_id: 7,
  weight: null,
  length: null,
  description: null,
  last_weaning_date: null,
  removal_date: null,
  removal_reason: null,
};
const retirement = { removal_date: new Date("2024-06-15"), removal_reason: "End of production" };

/** Produces a real Prisma request error without opening a database connection. */
function persistenceError(code: string) {
  return new PrismaClientKnownRequestError("test persistence failure", {
    code,
    clientVersion: "6",
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  // Every query is mocked; prisma identifies the interactive transaction only.
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
    if (typeof callback !== "function") throw new Error("Expected interactive transaction");
    return callback(prisma);
  });
  vi.mocked(getBreedById).mockResolvedValue({
    breed_id: 3,
    breed_name: "Duroc",
    description: null,
  });
  tagLookup.mockResolvedValue(null);
  vi.mocked(queries.getActiveBreedingSowForUpdate).mockResolvedValue(record);
  vi.mocked(queries.getActiveBreedingSowWithStatus).mockResolvedValue(record);
  vi.mocked(queries.getBreedingSowsForRetirement).mockResolvedValue([record]);
  vi.mocked(queries.insertBreedingSow).mockResolvedValue(record);
  vi.mocked(queries.updateActiveBreedingSowById).mockResolvedValue(record);
  vi.mocked(queries.deleteActiveBreedingSowById).mockResolvedValue(record);
  vi.mocked(countMatingEventsBySowId).mockResolvedValue(0);
  vi.mocked(cancelActiveMatingEventsBySowIds).mockResolvedValue({ count: 0 });
  vi.mocked(getActiveFarrowingsBySowIds).mockResolvedValue([]);
  vi.mocked(closeFarrowingsForRetirement).mockResolvedValue({ count: 0 });
  vi.mocked(queries.retireActiveBreedingSows).mockResolvedValue({ count: 1 });
});
afterEach(() => vi.useRealTimers());

describe("sow persistence failure translation", () => {
  it.each(["create", "update"] as const)(
    "translates normalized uniqueness lost during %s",
    async (operation) => {
      const write =
        operation === "create" ? queries.insertBreedingSow : queries.updateActiveBreedingSowById;
      vi.mocked(write).mockRejectedValue(persistenceError("P2002"));
      await expect(
        operation === "create" ? createBreedingSow(input) : updateBreedingSow(7, input),
      ).rejects.toMatchObject({
        statusCode: 409,
        errorCode: codes.BREEDING_SOW_TAG_NUMBER_ALREADY_EXISTS,
      });
      expect(write).toHaveBeenCalledTimes(1);
    },
  );
  it.each(["update", "delete"] as const)(
    "translates a target disappearing during %s",
    async (operation) => {
      const write =
        operation === "update"
          ? queries.updateActiveBreedingSowById
          : queries.deleteActiveBreedingSowById;
      vi.mocked(write).mockRejectedValue(persistenceError("P2025"));
      await expect(
        operation === "update" ? updateBreedingSow(7, input) : deleteBreedingSow(7),
      ).rejects.toMatchObject({ statusCode: 404, errorCode: codes.BREEDING_SOW_NOT_FOUND });
      expect(write).toHaveBeenCalledTimes(1);
    },
  );
  it("translates reproductive history added after deletion's initial check", async () => {
    vi.mocked(queries.deleteActiveBreedingSowById).mockRejectedValue(persistenceError("P2003"));
    await expect(deleteBreedingSow(7)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: codes.BREEDING_SOW_HAS_MATING_EVENTS,
    });
    expect(countMatingEventsBySowId).toHaveBeenCalledWith(7, prisma);
  });
  it("preserves unexpected persistence failures", async () => {
    const failure = new Error("unexpected failure");
    vi.mocked(prisma.$transaction).mockRejectedValue(failure);
    await expect(createBreedingSow(input)).rejects.toBe(failure);
  });
});

describe("sow retirement safeguards", () => {
  it("rejects an empty batch before opening a transaction", async () => {
    await expect(retireBreedingSow([], retirement)).rejects.toMatchObject({
      statusCode: 400,
      errorCode: codes.BREEDING_SOW_ID_INVALID,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("uses the current time when the removal date is omitted", async () => {
    vi.useFakeTimers();
    const now = new Date("2024-06-15T10:30:00Z");
    vi.setSystemTime(now);
    const data = { removal_reason: "End of production" };
    await expect(retireBreedingSow([7], data)).resolves.toEqual({ count: 1 });
    expect(queries.retireActiveBreedingSows).toHaveBeenCalledWith([7], now, data, prisma);
  });
  it("aborts before retiring sows when not all locked farrowings are closed", async () => {
    vi.mocked(getActiveFarrowingsBySowIds).mockResolvedValue([
      { farrowing_id: 9, sow_id: 7, farrowing_date: new Date("2024-05-01") },
    ]);
    await expect(retireBreedingSow([7], retirement)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: codes.BREEDING_SOW_FARROWING_CLOSURE_STATE_CHANGED,
    });
    expect(closeFarrowingsForRetirement).toHaveBeenCalledWith([9], retirement.removal_date, prisma);
    expect(queries.retireActiveBreedingSows).not.toHaveBeenCalled();
  });
  it("throws inside the transaction when the final retirement count changes", async () => {
    vi.mocked(queries.retireActiveBreedingSows).mockResolvedValue({ count: 0 });
    await expect(retireBreedingSow([7], retirement)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: codes.BREEDING_SOW_RETIREMENT_STATE_CHANGED,
    });
    expect(queries.retireActiveBreedingSows).toHaveBeenCalledWith(
      [7],
      retirement.removal_date,
      retirement,
      prisma,
    );
  });
});
