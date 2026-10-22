import { beforeEach, describe, expect, it, vi } from "vitest";
import { BREEDING_SOW_ERROR_CODES as codes } from "../../../src/services/breedingSows/breedingSowErrors";
import { BREEDING_SOW_STATUSES as statuses } from "../../../src/services/breedingSows/breedingSowsRules";
import { ensureManualStatusChangeIsAllowed } from "../../../src/services/breedingSows/breedingSowsStatusValidation";
import { getActiveFarrowingBySowId } from "../../../src/services/farrowings/farrowingsQueries";
import { getBlockingMatingEventBySowId } from "../../../src/services/matingEvents/matingEventsQueries";
import { PREGNANCY_RESULTS } from "../../../src/services/matingEvents/pregnancyRules";

vi.mock("../../../src/prismaClient", () => ({ default: {} }));
vi.mock("../../../src/services/matingEvents/matingEventsQueries", () => ({
  getBlockingMatingEventBySowId: vi.fn(),
}));
vi.mock("../../../src/services/farrowings/farrowingsQueries", () => ({
  getActiveFarrowingBySowId: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getBlockingMatingEventBySowId).mockResolvedValue(null);
  vi.mocked(getActiveFarrowingBySowId).mockResolvedValue(null);
});

describe("manual sow status decisions", () => {
  it("does not query reproductive workflows when status is unchanged", async () => {
    await expect(
      ensureManualStatusChangeIsAllowed(7, statuses.vacia, statuses.vacia),
    ).resolves.toBeUndefined();
    expect(getBlockingMatingEventBySowId).not.toHaveBeenCalled();
    expect(getActiveFarrowingBySowId).not.toHaveBeenCalled();
  });

  it("stops at an active mating event without querying farrowings", async () => {
    vi.mocked(getBlockingMatingEventBySowId).mockResolvedValue({
      mating_id: 9,
      pregnancy_result: PREGNANCY_RESULTS.pendiente,
    });
    await expect(
      ensureManualStatusChangeIsAllowed(7, statuses.vacia, statuses.noProductiva),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: codes.BREEDING_SOW_STATUS_CHANGE_BLOCKED_ACTIVE_MATING_EVENT,
    });
    expect(getActiveFarrowingBySowId).not.toHaveBeenCalled();
  });

  it("blocks an active farrowing after finding no blocking mating event", async () => {
    vi.mocked(getActiveFarrowingBySowId).mockResolvedValue({ farrowing_id: 10, weaned_date: null });
    await expect(
      ensureManualStatusChangeIsAllowed(7, statuses.lactancia, statuses.noProductiva),
    ).rejects.toMatchObject({
      statusCode: 409,
      errorCode: codes.BREEDING_SOW_STATUS_CHANGE_BLOCKED_ACTIVE_FARROWING,
    });
    expect(getBlockingMatingEventBySowId).toHaveBeenCalledWith(7, expect.anything());
  });

  it("allows a transition once both workflows are inactive", async () => {
    await expect(
      ensureManualStatusChangeIsAllowed(7, statuses.vacia, statuses.noProductiva),
    ).resolves.toBeUndefined();
    expect(getBlockingMatingEventBySowId).toHaveBeenCalledWith(7, expect.anything());
    expect(getActiveFarrowingBySowId).toHaveBeenCalledWith(7, expect.anything());
  });
});
