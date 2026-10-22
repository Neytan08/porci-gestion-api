import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import { beforeEach, describe, expect, it, vi } from "vitest";
import prisma from "../../../src/prismaClient";
import * as sowQueries from "../../../src/services/breedingSows/breedingSowsQueries";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { MATING_EVENT_ERROR_CODES as codes } from "../../../src/services/matingEvents/matingEventErrors";
import {
  deleteMatingEvent,
  updatePregnancyResult,
} from "../../../src/services/matingEvents/matingEventsCommands";
import * as queries from "../../../src/services/matingEvents/matingEventsQueries";
import { PREGNANCY_RESULTS as results } from "../../../src/services/matingEvents/pregnancyRules";

vi.mock("../../../src/prismaClient", () => ({ default: { $transaction: vi.fn() } }));
// Row-lock queries can return no row at runtime despite their inferred non-null return types.
const { deletionEventLookup, deletionSowLookup } = vi.hoisted(() => ({
  deletionEventLookup:
    vi.fn<() => Promise<Awaited<ReturnType<typeof queries.getMatingEventForDeletion>> | null>>(),
  deletionSowLookup:
    vi.fn<
      () => Promise<Awaited<ReturnType<typeof sowQueries.getBreedingSowStateForUpdate>> | null>
    >(),
}));
vi.mock("../../../src/services/matingEvents/matingEventsQueries", () => ({
  getPregnancyUpdateEvents: vi.fn(),
  getPregnancyUpdateEventsForUpdate: vi.fn(),
  updateMatingEventPregnancyResults: vi.fn(),
  getMatingEventDeletionTarget: vi.fn(),
  getMatingEventForDeletion: deletionEventLookup,
  countMatingEventFarrowings: vi.fn(),
  deleteMatingEventById: vi.fn(),
}));
vi.mock("../../../src/services/breedingSows/breedingSowsQueries", () => ({
  getActiveBreedingSowsWithStatusForUpdate: vi.fn(),
  getBreedingSowStateForUpdate: deletionSowLookup,
  updateActiveBreedingSowStatuses: vi.fn(),
  updateActiveBreedingSowStatus: vi.fn(),
}));

const event = { mating_id: 7, sow_id: 3, pregnancy_result: results.pendiente };
const sow = { sow_id: 3, status: statuses.vacia, removal_date: null };

beforeEach(() => {
  vi.resetAllMocks();
  // Queries are mocked; this token never opens a database connection.
  vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
    if (typeof callback !== "function") throw new Error("Expected interactive transaction");
    return callback(prisma);
  });
  vi.mocked(queries.getPregnancyUpdateEvents).mockResolvedValue([event]);
  vi.mocked(queries.getPregnancyUpdateEventsForUpdate).mockResolvedValue([event]);
  vi.mocked(sowQueries.getActiveBreedingSowsWithStatusForUpdate).mockResolvedValue([sow]);
  vi.mocked(queries.updateMatingEventPregnancyResults).mockResolvedValue({ count: 1 });
  vi.mocked(sowQueries.updateActiveBreedingSowStatuses).mockResolvedValue({ count: 1 });
  vi.mocked(queries.getMatingEventDeletionTarget).mockResolvedValue({ mating_id: 7, sow_id: 3 });
  deletionSowLookup.mockResolvedValue(sow);
  deletionEventLookup.mockResolvedValue(event);
  vi.mocked(queries.countMatingEventFarrowings).mockResolvedValue(0);
  vi.mocked(queries.deleteMatingEventById).mockResolvedValue(event);
});

describe("pregnancy update transaction safeguards", () => {
  it("defensively rejects a missing stored pregnancy result before writing", async () => {
    vi.mocked(queries.getPregnancyUpdateEventsForUpdate).mockResolvedValue([
      { ...event, pregnancy_result: null },
    ]);
    await expect(updatePregnancyResult([7], results.positivo)).rejects.toMatchObject({
      errorCode: codes.MATING_EVENT_PREGNANCY_RESULT_MISSING,
    });
    expect(queries.updateMatingEventPregnancyResults).not.toHaveBeenCalled();
    expect(sowQueries.updateActiveBreedingSowStatuses).not.toHaveBeenCalled();
  });

  it("rejects an event that disappears after the preliminary lookup", async () => {
    vi.mocked(queries.getPregnancyUpdateEventsForUpdate).mockResolvedValue([]);
    await expect(updatePregnancyResult([7], results.positivo)).rejects.toMatchObject({
      errorCode: codes.MATING_EVENTS_NOT_FOUND,
    });
    expect(queries.updateMatingEventPregnancyResults).not.toHaveBeenCalled();
    expect(sowQueries.updateActiveBreedingSowStatuses).not.toHaveBeenCalled();
  });

  it("rejects a batch when not all affected sows can be locked as active", async () => {
    vi.mocked(sowQueries.getActiveBreedingSowsWithStatusForUpdate).mockResolvedValue([]);
    await expect(updatePregnancyResult([7], results.positivo)).rejects.toMatchObject({
      errorCode: codes.MATING_EVENT_TRANSACTION_STATE_CHANGED,
    });
    expect(queries.getPregnancyUpdateEventsForUpdate).not.toHaveBeenCalled();
    expect(queries.updateMatingEventPregnancyResults).not.toHaveBeenCalled();
  });

  it("rejects a sow relationship that changes before locks are acquired", async () => {
    vi.mocked(queries.getPregnancyUpdateEventsForUpdate).mockResolvedValue([
      { ...event, sow_id: 4 },
    ]);
    await expect(updatePregnancyResult([7], results.positivo)).rejects.toMatchObject({
      errorCode: codes.MATING_EVENT_TRANSACTION_STATE_CHANGED,
    });
    expect(queries.updateMatingEventPregnancyResults).not.toHaveBeenCalled();
    expect(sowQueries.updateActiveBreedingSowStatuses).not.toHaveBeenCalled();
  });

  it("aborts inside the transaction when an event write is incomplete", async () => {
    vi.mocked(queries.updateMatingEventPregnancyResults).mockResolvedValue({ count: 0 });
    await expect(updatePregnancyResult([7], results.positivo)).rejects.toMatchObject({
      errorCode: codes.MATING_EVENT_TRANSACTION_STATE_CHANGED,
    });
    expect(sowQueries.updateActiveBreedingSowStatuses).not.toHaveBeenCalled();
  });

  it("aborts inside the transaction when a required sow status write is incomplete", async () => {
    vi.mocked(sowQueries.updateActiveBreedingSowStatuses).mockResolvedValue({ count: 0 });
    await expect(updatePregnancyResult([7], results.positivo)).rejects.toMatchObject({
      errorCode: codes.MATING_EVENT_TRANSACTION_STATE_CHANGED,
    });
    expect(queries.updateMatingEventPregnancyResults).toHaveBeenCalledWith(
      [7],
      results.positivo,
      prisma,
    );
    expect(sowQueries.updateActiveBreedingSowStatuses).toHaveBeenCalledWith(
      [3],
      statuses.gestacion,
      prisma,
    );
  });
});

describe("mating deletion transaction safeguards", () => {
  it("rejects an event that disappears before its deletion lock is acquired", async () => {
    deletionEventLookup.mockResolvedValue(null);
    await expect(deleteMatingEvent(7)).rejects.toMatchObject({
      errorCode: codes.MATING_EVENT_NOT_FOUND,
    });
    expect(queries.deleteMatingEventById).not.toHaveBeenCalled();
  });

  it("rejects a missing sow or a changed sow relationship before deleting", async () => {
    deletionSowLookup.mockResolvedValueOnce(null);
    await expect(deleteMatingEvent(7)).rejects.toMatchObject({
      errorCode: codes.MATING_EVENT_TRANSACTION_STATE_CHANGED,
    });
    deletionEventLookup.mockResolvedValue({ ...event, sow_id: 4 });
    await expect(deleteMatingEvent(7)).rejects.toMatchObject({
      errorCode: codes.MATING_EVENT_TRANSACTION_STATE_CHANGED,
    });
    expect(queries.deleteMatingEventById).not.toHaveBeenCalled();
    expect(sowQueries.updateActiveBreedingSowStatus).not.toHaveBeenCalled();
  });

  it.each([
    ["P2025", 404, codes.MATING_EVENT_NOT_FOUND],
    ["P2003", 409, codes.MATING_EVENT_HAS_FARROWINGS],
  ])("translates deletion persistence error %s", async (code, statusCode, errorCode) => {
    vi.mocked(queries.deleteMatingEventById).mockRejectedValue(
      new PrismaClientKnownRequestError("test persistence failure", { code, clientVersion: "6" }),
    );
    await expect(deleteMatingEvent(7)).rejects.toMatchObject({ statusCode, errorCode });
    expect(sowQueries.updateActiveBreedingSowStatus).not.toHaveBeenCalled();
  });

  it("preserves unexpected persistence failures", async () => {
    const failure = new Error("unexpected persistence failure");
    vi.mocked(queries.deleteMatingEventById).mockRejectedValue(failure);
    await expect(deleteMatingEvent(7)).rejects.toBe(failure);
    expect(sowQueries.updateActiveBreedingSowStatus).not.toHaveBeenCalled();
  });
});
