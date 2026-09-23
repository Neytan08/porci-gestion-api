import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import {
  isPrismaForeignKeyConstraintError,
  isPrismaRecordNotFoundError,
  isPrismaUniqueConstraintError,
} from "../../utils/prismaErrors";
import { getBreedById } from "../breeds/breedsQueries";
import {
  closeFarrowingsForRetirement,
  getActiveFarrowingsBySowIds,
} from "../farrowings/farrowingsQueries";
import {
  cancelActiveMatingEventsBySowIds,
  countMatingEventsBySowId,
} from "../matingEvents/matingEventsQueries";
import { breedingSowErrors } from "./breedingSowErrors";
import {
  deleteActiveBreedingSowById,
  getActiveBreedingSowForUpdate,
  getActiveBreedingSowWithStatus,
  getBreedingSowByNormalizedTagNumber,
  getBreedingSowsForRetirement,
  insertBreedingSow,
  retireActiveBreedingSows,
  updateActiveBreedingSowById,
} from "./breedingSowsQueries";
import {
  type BREEDING_SOW_STATUSES,
  isBeforeDate,
  isRetiredBreedingSow
} from "./breedingSowsRules";
import type { BreedingSowStatus } from "./breedingSowsRules";
import { ensureManualStatusChangeIsAllowed } from "./breedingSowsStatusValidation";
import type {
  CreateBreedingSowInput,
  RetireBreedingSowInput,
  UpdateBreedingSowInput,
} from "./breedingSowsTypes";

/** Ensures the incoming breed reference points to an existing breed. */
const ensureBreedExists = async (tx: Prisma.TransactionClient, breedId: number) => {
  const breed = await getBreedById(breedId, tx);

  if (!breed) {
    throw breedingSowErrors.breedNotFound(breedId);
  }
};

/** Prevents duplicated normalized tags while allowing a sow to retain its current tag. */
const ensureSowTagNumberIsAvailable = async (
  tx: Prisma.TransactionClient,
  sowTagNumber: string,
  currentSowId?: number,
) => {
  const sow = await getBreedingSowByNormalizedTagNumber(sowTagNumber, tx);

  if (sow && sow.sow_id !== currentSowId) {
    throw breedingSowErrors.tagNumberAlreadyExists(sowTagNumber);
  }
};

/** Keeps breeding-sow dates in chronological order around the entry date. */
const ensureBreedingSowDatesAreConsistent = (
  entryDate: Date,
  lastWeaningDate: Date | null,
  removalDate: Date | null,
) => {
  if (isBeforeDate(lastWeaningDate, entryDate)) {
    throw breedingSowErrors.lastWeaningDateBeforeEntryDate(entryDate, lastWeaningDate);
  }

  if (isBeforeDate(removalDate, entryDate)) {
    throw breedingSowErrors.removalDateBeforeEntryDate(entryDate, removalDate);
  }
};

/** Creates a breeding sow after checking references, duplicate tags, and dates. */
export const createBreedingSow = async (data: CreateBreedingSowInput) => {
  try {
    return await prisma.$transaction(async (tx) => {
      await ensureBreedExists(tx, data.breed_id);
      await ensureSowTagNumberIsAvailable(tx, data.sow_tag_number);
      ensureBreedingSowDatesAreConsistent(data.entry_date, null, null);
      return await insertBreedingSow(data, tx);
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw breedingSowErrors.tagNumberAlreadyExists(data.sow_tag_number);
    }

    throw error;
  }
};

/** Updates an active sow after validating changed references, tag, dates, and status. */
export const updateBreedingSow = async (id: number, data: UpdateBreedingSowInput) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const currentSow = await getActiveBreedingSowForUpdate(id, tx);

      if (!currentSow) {
        throw breedingSowErrors.breedingSowNotFound(id, "update");
      }

      if (data.breed_id !== undefined) {
        await ensureBreedExists(tx, data.breed_id);
      }

      if (data.sow_tag_number !== undefined) {
        await ensureSowTagNumberIsAvailable(tx, data.sow_tag_number, id);
      }

      // TODO: Consider if we should validate this on update, if so look for a elegant way to do it JUST A HEADS UP FOR NOW
      const nextEntryDate = data.entry_date ?? currentSow.entry_date;
      ensureBreedingSowDatesAreConsistent(
        nextEntryDate,
        currentSow.last_weaning_date,
        currentSow.removal_date,
      );

      if (data.status !== undefined && data.status !== currentSow.status) {
        await ensureManualStatusChangeIsAllowed(id, currentSow.status, data.status, tx);
      }

      return await updateActiveBreedingSowById(id, data, tx);
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw breedingSowErrors.tagNumberAlreadyExists(data.sow_tag_number ?? "unknown");
    }

    if (isPrismaRecordNotFoundError(error)) {
      throw breedingSowErrors.breedingSowNotFound(id, "update");
    }

    throw error;
  }
};

/** Validates a proposed manual status change without mutating the active sow. */
export const validateBreedingSowStatusChange = async (
  id: number,
  status: Exclude<BreedingSowStatus, typeof BREEDING_SOW_STATUSES.retirada>,
) => {
  const sow = await getActiveBreedingSowWithStatus(id);

  if (!sow) {
    throw breedingSowErrors.breedingSowNotFound(id, "retrieve");
  }

  await ensureManualStatusChangeIsAllowed(id, sow.status, status);
};

/** Deletes an active sow only when it has no reproductive history attached. */
export const deleteBreedingSow = async (id: number) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const sow = await getActiveBreedingSowWithStatus(id, tx);

      if (!sow) {
        throw breedingSowErrors.breedingSowNotFound(id, "delete");
      }

      const matingEventsCount = await countMatingEventsBySowId(id, tx);

      if (matingEventsCount > 0) {
        throw breedingSowErrors.breedingSowHasMatingEvents(id, matingEventsCount);
      }

      return await deleteActiveBreedingSowById(id, tx);
    });
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      throw breedingSowErrors.breedingSowNotFound(id, "delete");
    }

    if (isPrismaForeignKeyConstraintError(error)) {
      throw breedingSowErrors.breedingSowHasMatingEvents(id, 1);
    }

    throw error;
  }
};

/** Deduplicates retire targets and protects the command from empty batches. */
const getUniqueBreedingSowIdsOrThrow = (sowIds: number[]) => {
  const uniqueSowIds = Array.from(new Set(sowIds));

  if (uniqueSowIds.length === 0) {
    throw breedingSowErrors.invalidBreedingSowIds(sowIds);
  }

  return uniqueSowIds;
};

/** Ensures every requested retirement target exists and has not already been retired. */
const ensureBreedingSowsCanBeRetired = (
  sowIds: number[],
  sows: Awaited<ReturnType<typeof getBreedingSowsForRetirement>>,
) => {
  if (sows.length !== sowIds.length) {
    const foundIds = new Set(sows.map(({ sow_id }) => sow_id));
    const missingSowIds = sowIds.filter((sowId) => !foundIds.has(sowId));
    throw breedingSowErrors.breedingSowsNotFound(sowIds, missingSowIds);
  }

  const retiredSowIds = sows
    .filter(isRetiredBreedingSow)
    .map(({ sow_id }) => sow_id);

  if (retiredSowIds.length > 0) {
    throw breedingSowErrors.breedingSowsAlreadyRetired(sowIds, retiredSowIds);
  }
};

/** Keeps each sow's removal date after its own entry date before retiring the batch. */
const ensureRetirementDatesAreConsistent = (
  sows: Array<{ sow_id: number; entry_date: Date }>,
  removalDate: Date,
) => {
  for (const sow of sows) {
    if (isBeforeDate(removalDate, sow.entry_date)) {
      throw breedingSowErrors.removalDateBeforeEntryDate(sow.entry_date, removalDate);
    }
  }
};

/** Retires a sow batch while cancelling mating events and force-closing open farrowings. */
export const retireBreedingSow = async (
  ids: number[],
  data: RetireBreedingSowInput,
) => {
  const uniqueSowIds = getUniqueBreedingSowIdsOrThrow(ids);

  return await prisma.$transaction(async (tx) => {
    const currentSows = await getBreedingSowsForRetirement(uniqueSowIds, tx);
    ensureBreedingSowsCanBeRetired(uniqueSowIds, currentSows);

    const removalDate = data.removal_date ?? new Date();
    ensureRetirementDatesAreConsistent(currentSows, removalDate);

    const activeFarrowings = await getActiveFarrowingsBySowIds(uniqueSowIds, tx);

    await cancelActiveMatingEventsBySowIds(uniqueSowIds, tx);
    await closeFarrowingsForRetirement(
      activeFarrowings.map(({ farrowing_id }) => farrowing_id),
      removalDate,
      tx,
    );

    const result = await retireActiveBreedingSows(uniqueSowIds, removalDate, data, tx);

    if (result.count !== uniqueSowIds.length) {
      throw breedingSowErrors.retirementStateChanged(uniqueSowIds, result.count);
    }

    return result;
  });
};
