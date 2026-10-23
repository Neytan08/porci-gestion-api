import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../src/prismaClient";
import * as sowQueries from "../../../src/services/breedingSows/breedingSowsQueries";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { FARROWING_ERROR_CODES as codes } from "../../../src/services/farrowings/farrowingErrors";
import {
  createFarrowing,
  deleteFarrowing,
  weanFarrowing,
} from "../../../src/services/farrowings/farrowingsCommands";
import * as queries from "../../../src/services/farrowings/farrowingsQueries";
import * as matingQueries from "../../../src/services/matingEvents/matingEventsQueries";
import { PREGNANCY_RESULTS as results } from "../../../src/services/matingEvents/pregnancyRules";

vi.mock("../../../src/prismaClient", () => ({ default: { $transaction: vi.fn() } }));
// Lock lookups may find no row at runtime even when their inferred return type excludes null.
const { sowLookup, farrowingLookup, matingLookup } = vi.hoisted(() => ({
  sowLookup:
    vi.fn<
      () => Promise<Awaited<ReturnType<typeof sowQueries.getBreedingSowStateForUpdate>> | null>
    >(),
  farrowingLookup:
    vi.fn<
      () => Promise<Awaited<ReturnType<typeof queries.getFarrowingWorkflowStateForUpdate>> | null>
    >(),
  matingLookup:
    vi.fn<
      () => Promise<Awaited<ReturnType<typeof matingQueries.getMatingEventForDeletion>> | null>
    >(),
}));
vi.mock("../../../src/services/breedingSows/breedingSowsQueries", () => ({
  getActiveBreedingSowWithStatusForUpdate: vi.fn(),
  getBreedingSowStateForUpdate: sowLookup,
  applyFarrowingToBreedingSow: vi.fn(),
  applyWeaningToBreedingSow: vi.fn(),
  restoreBreedingSowAfterFarrowingDeletion: vi.fn(),
}));
vi.mock("../../../src/services/matingEvents/matingEventsQueries", () => ({
  getBlockingMatingEventBySowIdForUpdate: vi.fn(),
  getMatingEventForDeletion: matingLookup,
  restoreMatingEventAfterFarrowingDeletion: vi.fn(),
  updateMatingEventPregnancyResult: vi.fn(),
}));
vi.mock("../../../src/services/farrowings/farrowingsQueries", () => ({
  getFarrowingWorkflowTarget: vi.fn(),
  getFarrowingWorkflowStateForUpdate: farrowingLookup,
  getLatestPreviousWeaningDate: vi.fn(),
  insertFarrowing: vi.fn(),
  updateFarrowingWeaning: vi.fn(),
  deleteFarrowingById: vi.fn(),
}));

const sow = { sow_id: 3, status: statuses.lactancia, removal_date: null };
const mating = { mating_id: 4, sow_id: 3, pregnancy_result: results.cerrado };
const farrowing = {
  farrowing_id: 7,
  sow_id: 3,
  mating_id: 4,
  farrowing_date: new Date("2024-05-01"),
  male_piglets: 5,
  female_piglets: 4,
  live_births: 9,
  still_births: 0,
  mummies: 0,
  weaning_date: new Date("2024-05-31"),
  weaned_date: null,
  weaned_piglets: 0,
  notes: null,
};
const creation = {
  sow_id: 3,
  farrowing_date: farrowing.farrowing_date,
  male_piglets: 5,
  female_piglets: 4,
  still_births: 0,
  mummies: 0,
};
const weaning = { weaned_date: new Date("2024-06-01"), weaned_piglets: 8 };

beforeEach(() => {
  vi.resetAllMocks();
  // Every persistence boundary is mocked; this token cannot reach a database.
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
    if (typeof callback !== "function") throw new Error("Expected interactive transaction");
    return callback(prisma);
  });
  sowLookup.mockResolvedValue(sow);
  matingLookup.mockResolvedValue(mating);
  farrowingLookup.mockResolvedValue(farrowing);
  vi.mocked(queries.getFarrowingWorkflowTarget).mockResolvedValue({
    farrowing_id: 7,
    sow_id: 3,
    mating_id: 4,
  });
  vi.mocked(sowQueries.getActiveBreedingSowWithStatusForUpdate).mockResolvedValue({
    ...sow,
    status: statuses.gestacion,
    entry_date: new Date("2023-01-01"),
    last_weaning_date: null,
  });
  vi.mocked(matingQueries.getBlockingMatingEventBySowIdForUpdate).mockResolvedValue({
    ...mating,
    pregnancy_result: results.positivo,
    reproduction_date: new Date("2024-01-01"),
  });
  vi.mocked(queries.insertFarrowing).mockResolvedValue(farrowing);
  vi.mocked(sowQueries.applyFarrowingToBreedingSow).mockResolvedValue({ count: 1 });
  vi.mocked(queries.updateFarrowingWeaning).mockResolvedValue({ ...farrowing, ...weaning });
  vi.mocked(queries.getLatestPreviousWeaningDate).mockResolvedValue(null);
  vi.mocked(queries.deleteFarrowingById).mockResolvedValue(farrowing);
  vi.mocked(matingQueries.restoreMatingEventAfterFarrowingDeletion).mockResolvedValue({ count: 1 });
  vi.mocked(sowQueries.restoreBreedingSowAfterFarrowingDeletion).mockResolvedValue({ count: 1 });
});

describe("farrowing command transaction safeguards", () => {
  it("aborts creation when its required sow transition affects no row", async () => {
    vi.mocked(sowQueries.applyFarrowingToBreedingSow).mockResolvedValue({ count: 0 });
    await expect(createFarrowing(creation)).rejects.toMatchObject({
      statusCode: 409,
      errorCode: codes.FARROWING_SOW_STATUS_UPDATE_FAILED,
    });
    expect(queries.insertFarrowing).toHaveBeenCalledWith({ ...creation, mating_id: 4 }, prisma);
    expect(matingQueries.updateMatingEventPregnancyResult).toHaveBeenCalledWith(
      4,
      results.cerrado,
      prisma,
    );
    expect(sowQueries.applyFarrowingToBreedingSow).toHaveBeenCalledWith(3, prisma);
  });

  it("propagates a final sow-write failure after recording weaning inside the transaction", async () => {
    const failure = new Error("sow persistence failed");
    vi.mocked(sowQueries.applyWeaningToBreedingSow).mockRejectedValue(failure);
    await expect(weanFarrowing(7, weaning)).rejects.toBe(failure);
    expect(queries.updateFarrowingWeaning).toHaveBeenCalledWith(
      7,
      3,
      farrowing.farrowing_date,
      weaning.weaned_date,
      8,
      prisma,
    );
    expect(sowQueries.applyWeaningToBreedingSow).toHaveBeenCalledWith(
      3,
      weaning.weaned_date,
      prisma,
    );
  });

  it.each(["wean", "delete"] as const)(
    "%s rejects a farrowing that disappears before locking",
    async (operation) => {
      farrowingLookup.mockResolvedValue(null);
      await expect(
        operation === "wean" ? weanFarrowing(7, weaning) : deleteFarrowing(7),
      ).rejects.toMatchObject({ errorCode: codes.FARROWING_NOT_FOUND });
      expect(queries.updateFarrowingWeaning).not.toHaveBeenCalled();
      expect(queries.deleteFarrowingById).not.toHaveBeenCalled();
      expect(sowQueries.applyWeaningToBreedingSow).not.toHaveBeenCalled();
      expect(matingQueries.restoreMatingEventAfterFarrowingDeletion).not.toHaveBeenCalled();
    },
  );

  it.each(["wean", "delete"] as const)(
    "%s rejects a sow that disappears before locking",
    async (operation) => {
      sowLookup.mockResolvedValue(null);
      await expect(
        operation === "wean" ? weanFarrowing(7, weaning) : deleteFarrowing(7),
      ).rejects.toMatchObject({ errorCode: codes.FARROWING_STATE_CHANGED });
      expect(queries.updateFarrowingWeaning).not.toHaveBeenCalled();
      expect(queries.deleteFarrowingById).not.toHaveBeenCalled();
      expect(sowQueries.applyWeaningToBreedingSow).not.toHaveBeenCalled();
      expect(sowQueries.restoreBreedingSowAfterFarrowingDeletion).not.toHaveBeenCalled();
    },
  );

  it.each(["wean", "delete"] as const)(
    "%s rejects changed sow or mating relationships after locking",
    async (operation) => {
      for (const changed of [{ sow_id: 8 }, { mating_id: 9 }]) {
        farrowingLookup.mockResolvedValue({ ...farrowing, ...changed });
        await expect(
          operation === "wean" ? weanFarrowing(7, weaning) : deleteFarrowing(7),
        ).rejects.toMatchObject({ errorCode: codes.FARROWING_STATE_CHANGED });
      }
      expect(queries.updateFarrowingWeaning).not.toHaveBeenCalled();
      expect(queries.deleteFarrowingById).not.toHaveBeenCalled();
      expect(matingQueries.restoreMatingEventAfterFarrowingDeletion).not.toHaveBeenCalled();
    },
  );

  it("rejects deletion when its mating disappears or belongs to another sow", async () => {
    for (const state of [null, { ...mating, sow_id: 8 }]) {
      matingLookup.mockResolvedValue(state);
      await expect(deleteFarrowing(7)).rejects.toMatchObject({
        errorCode: codes.FARROWING_STATE_CHANGED,
      });
    }
    expect(queries.deleteFarrowingById).not.toHaveBeenCalled();
    expect(matingQueries.restoreMatingEventAfterFarrowingDeletion).not.toHaveBeenCalled();
    expect(sowQueries.restoreBreedingSowAfterFarrowingDeletion).not.toHaveBeenCalled();
  });

  it("aborts deletion when either related state restoration is incomplete", async () => {
    for (const [matingCount, sowCount] of [
      [0, 1],
      [1, 0],
    ]) {
      vi.mocked(matingQueries.restoreMatingEventAfterFarrowingDeletion).mockResolvedValue({
        count: matingCount,
      });
      vi.mocked(sowQueries.restoreBreedingSowAfterFarrowingDeletion).mockResolvedValue({
        count: sowCount,
      });
      await expect(deleteFarrowing(7)).rejects.toMatchObject({
        statusCode: 409,
        errorCode: codes.FARROWING_STATE_CHANGED,
      });
    }
    expect(queries.deleteFarrowingById).toHaveBeenCalledWith(7, prisma);
    expect(matingQueries.restoreMatingEventAfterFarrowingDeletion).toHaveBeenCalledWith(
      4,
      3,
      prisma,
    );
    expect(sowQueries.restoreBreedingSowAfterFarrowingDeletion).toHaveBeenCalledWith(
      3,
      null,
      prisma,
    );
  });
});
