import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../src/prismaClient";
import { BOAR_ERROR_CODES as codes } from "../../../src/services/boars/boarErrors";
import {
  createBoar,
  deleteBoar,
  retireBoar,
  updateBoar,
} from "../../../src/services/boars/boarsCommands";
import * as queries from "../../../src/services/boars/boarsQueries";

vi.mock("../../../src/prismaClient", () => ({ default: { $transaction: vi.fn() } }));
const { tagLookup } = vi.hoisted(() => ({
  tagLookup: vi.fn<() => Promise<{ boar_id: number; boar_tag_number: string } | null>>(),
}));
vi.mock("../../../src/services/boars/boarsQueries", () => ({
  getBoarBreedById: vi.fn(),
  getBoarByNormalizedTagNumber: tagLookup,
  getBoarStateById: vi.fn(),
  getBoarsForRetirement: vi.fn(),
  countBoarMatingEvents: vi.fn(),
  createBoarRecord: vi.fn(),
  updateBoarRecord: vi.fn(),
  deleteBoarRecord: vi.fn(),
  retireBoarRecords: vi.fn(),
}));

const active = {
  boar_id: 7,
  birth_date: new Date("2023-01-01"),
  removal_date: null,
  removal_reason: null,
};
const input = { breed_id: 3, boar_tag_number: "B7", birth_date: active.birth_date };
const retirement = { removal_date: new Date("2024-01-01"), removal_reason: "End of production" };
const record = { ...active, ...input, weight: null, length: null, description: null };

/** Produces the real Prisma error class without connecting to a database. */
function persistenceError(code: string) {
  return new PrismaClientKnownRequestError("test persistence failure", {
    code,
    clientVersion: "6",
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  // Query functions are mocked; no operation is allowed to access this transaction token.
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
    if (typeof callback !== "function") throw new Error("Expected interactive transaction");
    return callback(prisma);
  });
  vi.mocked(queries.getBoarBreedById).mockResolvedValue({ breed_id: 3 });
  tagLookup.mockResolvedValue(null);
  vi.mocked(queries.getBoarStateById).mockResolvedValue(active);
  vi.mocked(queries.getBoarsForRetirement).mockResolvedValue([active]);
  vi.mocked(queries.countBoarMatingEvents).mockResolvedValue(0);
  vi.mocked(queries.createBoarRecord).mockResolvedValue(record);
  vi.mocked(queries.updateBoarRecord).mockResolvedValue(record);
  vi.mocked(queries.deleteBoarRecord).mockResolvedValue(record);
  vi.mocked(queries.retireBoarRecords).mockResolvedValue({ count: 1 });
});

describe("boar command decisions", () => {
  it("refuses a missing breed before creating", async () => {
      vi.mocked(queries.getBoarBreedById).mockResolvedValue(null);
      await expect(createBoar(input)).rejects.toMatchObject({
        errorCode: codes.BOAR_BREED_NOT_FOUND,
      });
      expect(queries.createBoarRecord).not.toHaveBeenCalled();
  });
  it("refuses another boar's normalized tag before updating", async () => {
      vi.mocked(queries.getBoarByNormalizedTagNumber).mockResolvedValue({
        boar_id: 8,
        boar_tag_number: " b 7 ",
      });
      await expect(updateBoar(7, input)).rejects.toMatchObject({
        errorCode: codes.BOAR_TAG_NUMBER_ALREADY_EXISTS,
      });
      expect(queries.updateBoarRecord).not.toHaveBeenCalled();
  });
  it("allows the current record to retain its normalized tag", async () => {
    vi.mocked(queries.getBoarByNormalizedTagNumber).mockResolvedValue({
      boar_id: 7,
      boar_tag_number: "B7",
    });
    await expect(updateBoar(7, { boar_tag_number: " b 7 " })).resolves.toEqual(record);
    expect(queries.updateBoarRecord).toHaveBeenCalledWith(
      7,
      { boar_tag_number: " b 7 " },
      expect.anything(),
    );
    expect(queries.getBoarBreedById).not.toHaveBeenCalled();
  });
  it.each(["update", "delete"] as const)(
    "%s refuses missing or retired state before writing",
    async (operation) => {
      for (const state of [null, { ...active, ...retirement }]) {
        vi.mocked(queries.getBoarStateById).mockResolvedValue(state);
        await expect(
          operation === "update" ? updateBoar(7, { description: "changed" }) : deleteBoar(7),
        ).rejects.toMatchObject({
          errorCode: state ? codes.BOAR_ALREADY_RETIRED : codes.BOAR_NOT_FOUND,
        });
      }
      expect(queries.updateBoarRecord).not.toHaveBeenCalled();
      expect(queries.deleteBoarRecord).not.toHaveBeenCalled();
    },
  );
  it("refuses deletion when mating history exists", async () => {
    vi.mocked(queries.countBoarMatingEvents).mockResolvedValue(1);
    await expect(deleteBoar(7)).rejects.toMatchObject({ errorCode: codes.BOAR_HAS_MATING_EVENTS });
    expect(queries.deleteBoarRecord).not.toHaveBeenCalled();
  });
  it("rejects an empty retirement before opening a transaction", async () => {
    await expect(retireBoar([], retirement)).rejects.toMatchObject({
      errorCode: codes.BOAR_ID_INVALID,
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it("deduplicates retirement targets", async () => {
    await expect(retireBoar([7, 7], retirement)).resolves.toEqual({ count: 1 });
    expect(queries.retireBoarRecords).toHaveBeenCalledWith([7], retirement, expect.anything());
  });
  it.each(["missing", "retired", "before-birth"] as const)(
    "rejects %s retirement target without writes",
    async (scenario) => {
      const states =
        scenario === "missing"
          ? []
          : [{ ...active, ...(scenario === "retired" ? retirement : {}) }];
      vi.mocked(queries.getBoarsForRetirement).mockResolvedValue(states);
      const data =
        scenario === "before-birth"
          ? { ...retirement, removal_date: new Date("2022-12-31") }
          : retirement;
      await expect(retireBoar([7], data)).rejects.toMatchObject({
        errorCode:
          scenario === "missing"
            ? codes.BOAR_NOT_FOUND
            : scenario === "retired"
              ? codes.BOAR_ALREADY_RETIRED
              : codes.BOAR_REMOVAL_DATE_BEFORE_BIRTH_DATE,
      });
      expect(queries.retireBoarRecords).not.toHaveBeenCalled();
    },
  );
  it("throws inside the transaction when the retirement write count changes", async () => {
    vi.mocked(queries.retireBoarRecords).mockResolvedValue({ count: 0 });
    await expect(retireBoar([7], retirement)).rejects.toMatchObject({
      errorCode: codes.BOAR_ALREADY_RETIRED,
    });
  });
});

describe("boar persistence failure translation", () => {
  it("rechecks retirement after an update loses a conditional write", async () => {
    vi.mocked(queries.getBoarStateById)
      .mockResolvedValueOnce(active)
      .mockResolvedValueOnce({ ...active, ...retirement });
    vi.mocked(queries.updateBoarRecord).mockRejectedValue(persistenceError("P2025"));
    await expect(updateBoar(7, input)).rejects.toMatchObject({
      errorCode: codes.BOAR_ALREADY_RETIRED,
    });
  });
  it("rechecks existence after a delete loses a conditional write", async () => {
    vi.mocked(queries.getBoarStateById).mockResolvedValueOnce(active).mockResolvedValueOnce(null);
    vi.mocked(queries.deleteBoarRecord).mockRejectedValue(persistenceError("P2025"));
    await expect(deleteBoar(7)).rejects.toMatchObject({ errorCode: codes.BOAR_NOT_FOUND });
  });
  it("translates a mating reference created after deletion's initial history check", async () => {
    vi.mocked(queries.deleteBoarRecord).mockRejectedValue(persistenceError("P2003"));
    await expect(deleteBoar(7)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: codes.BOAR_HAS_MATING_EVENTS,
    });
  });
  it("preserves unexpected persistence failures", async () => {
      const failure = new Error("unexpected failure");
      vi.mocked(prisma.$transaction).mockRejectedValue(failure);
      await expect(createBoar(input)).rejects.toBe(failure);
  });
});
