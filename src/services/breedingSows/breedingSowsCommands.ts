import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import {
  isPrismaForeignKeyConstraintError,
  isPrismaRecordNotFoundError,
  isPrismaUniqueConstraintError,
} from "../../utils/prismaErrors";
import { breedingSowErrors } from "./breedingSowErrors";
import {
  countBreedingSowMatingEvents,
  getBreedingSowBreedById,
  getBreedingSowByNormalizedTagNumber,
} from "./breedingSowsQueries";
import { BREEDING_SOW_STATUSES, isBeforeDate } from "./breedingSowsRules";
import { ensureManualStatusChangeIsAllowed } from "./breedingSowsStatusValidation";
import { PREGNANCY_RESULTS } from "../matingEvents/pregnancyRules";

export type RetireBreedingSowInput = {
  removal_date?: string;
  removal_reason?: string | null;
};

/**
 * Ensures the incoming breed reference points to an existing breed.
 */
const ensureBreedExists = async (tx: Prisma.TransactionClient, breedId: number) => {
  const breed = await getBreedingSowBreedById(breedId, tx);

  if (!breed) {
    throw breedingSowErrors.breedNotFound(breedId);
  }
};

/**
 * Prevents duplicated sow tags while allowing a sow to keep its current tag.
 */
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

/**
 * Keeps breeding-sow dates in chronological order around the entry date.
 */
const ensureBreedingSowDatesAreConsistent = (
  entryDate: unknown,
  lastWeaningDate: unknown,
  removalDate: unknown,
) => {
  if (isBeforeDate(lastWeaningDate, entryDate)) {
    throw breedingSowErrors.lastWeaningDateBeforeEntryDate(entryDate, lastWeaningDate);
  }

  if (isBeforeDate(removalDate, entryDate)) {
    throw breedingSowErrors.removalDateBeforeEntryDate(entryDate, removalDate);
  }
};

/**
 * Creates a breeding sow after checking references, duplicate tags, and dates.
 */
export const createBreedingSow = async (data: Prisma.breedingsowsUncheckedCreateInput) => {
  try {
    return await prisma.$transaction(async (tx) => {
      await ensureBreedExists(tx, data.breed_id);
      await ensureSowTagNumberIsAvailable(tx, data.sow_tag_number);
      ensureBreedingSowDatesAreConsistent(
        data.entry_date,
        data.last_weaning_date,
        data.removal_date,
      );

      return await tx.breedingsows.create({ data });
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw breedingSowErrors.tagNumberAlreadyExists(data.sow_tag_number);
    }

    throw error;
  }
};

/**
 * Updates a breeding sow after validating any changed references, tag, and dates.
 */
export const updateBreedingSow = async (
  id: number,
  data: Prisma.breedingsowsUncheckedUpdateInput,
) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const currentSow = await tx.breedingsows.findUnique({
        where: { sow_id: id },
        select: {
          sow_id: true,
          entry_date: true,
          last_weaning_date: true,
          removal_date: true,
          status: true,
        },
      });

      if (!currentSow) {
        throw breedingSowErrors.breedingSowNotFound(id, "update");
      }

      if (typeof data.breed_id === "number") {
        await ensureBreedExists(tx, data.breed_id);
      }

      if (typeof data.sow_tag_number === "string") {
        await ensureSowTagNumberIsAvailable(tx, data.sow_tag_number, id);
      }

      // TODO: Consider if we should validate this on update, if so look for a elegant way to do it JUST A HEADS UP FOR NOW
      const nextEntryDate =
        typeof data.entry_date === "string" || data.entry_date instanceof Date
          ? data.entry_date
          : currentSow.entry_date;
      const nextLastWeaningDate =
        typeof data.last_weaning_date === "string" ||
        data.last_weaning_date instanceof Date ||
        data.last_weaning_date === null
          ? data.last_weaning_date
          : currentSow.last_weaning_date;
      const nextRemovalDate =
        typeof data.removal_date === "string" ||
        data.removal_date instanceof Date ||
        data.removal_date === null
          ? data.removal_date
          : currentSow.removal_date;

      ensureBreedingSowDatesAreConsistent(nextEntryDate, nextLastWeaningDate, nextRemovalDate);

      if (typeof data.status === "string" && data.status !== currentSow.status) {
        await ensureManualStatusChangeIsAllowed(
          id,
          currentSow.status,
          data.status,
          tx,
        );
      }

      return await tx.breedingsows.update({
        where: { sow_id: id },
        data,
      });
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      const sowTagNumber =
        typeof data.sow_tag_number === "string" ? data.sow_tag_number : "unknown";
      throw breedingSowErrors.tagNumberAlreadyExists(sowTagNumber);
    }

    if (isPrismaRecordNotFoundError(error)) {
      throw breedingSowErrors.breedingSowNotFound(id, "update");
    }

    throw error;
  }
};

/**
 * Deletes a breeding sow only when it has no reproductive history attached.
 */
export const deleteBreedingSow = async (id: number) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const matingEventsCount = await countBreedingSowMatingEvents(id, tx);

      if (matingEventsCount > 0) {
        throw breedingSowErrors.breedingSowHasMatingEvents(id, matingEventsCount);
      }

      return await tx.breedingsows.delete({
        where: { sow_id: id },
      });
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

/**
 * Deduplicates retire targets and protects the command from empty batches.
 */
const getUniqueBreedingSowIdsOrThrow = (sowIds: number[]) => {
  const uniqueSowIds = Array.from(new Set(sowIds));

  if (uniqueSowIds.length === 0) {
    throw breedingSowErrors.invalidBreedingSowIds(sowIds);
  }

  return uniqueSowIds;
};

/**
 * Loads every sow requested for retirement and fails before mutating data when any id is missing.
 */
const loadBreedingSowsForRetirement = async (
  tx: Prisma.TransactionClient,
  sowIds: number[],
) => {
  const sows = await tx.breedingsows.findMany({
    where: { sow_id: { in: sowIds } },
    select: {
      sow_id: true,
      entry_date: true,
    },
  });

  if (sows.length !== sowIds.length) {
    const foundIds = new Set(sows.map(({ sow_id }) => sow_id));
    const missingSowIds = sowIds.filter((sowId) => !foundIds.has(sowId));
    throw breedingSowErrors.breedingSowsNotFound(sowIds, missingSowIds);
  }

  return sows;
};

/**
 * Keeps each sow's removal date after its own entry date before retiring the batch.
 */
const ensureRetirementDatesAreConsistent = (
  sows: Array<{ sow_id: number; entry_date: Date }>,
  removalDate: unknown,
) => {
  for (const sow of sows) {
    if (isBeforeDate(removalDate, sow.entry_date)) {
      throw breedingSowErrors.removalDateBeforeEntryDate(
        sow.entry_date,
        removalDate,
      );
    }
  }
};

/**
 * Retires one or many breeding sows while preserving reproductive history.
 */
export const retireBreedingSow = async (
  ids: number[],
  data: RetireBreedingSowInput,
) => {
  const uniqueSowIds = getUniqueBreedingSowIdsOrThrow(ids);

  return await prisma.$transaction(async (tx) => {
    const currentSows = await loadBreedingSowsForRetirement(tx, uniqueSowIds);
    const removalDate = data.removal_date ?? new Date();

    ensureRetirementDatesAreConsistent(currentSows, removalDate);

    await tx.matingevents.updateMany({
      where: {
        sow_id: { in: uniqueSowIds },
        pregnancy_result: {
          in: [PREGNANCY_RESULTS.pendiente, PREGNANCY_RESULTS.positivo],
        },
      },
      data: {
        pregnancy_result: PREGNANCY_RESULTS.cancelado,
      },
    });

    return await tx.breedingsows.updateMany({
      where: { sow_id: { in: uniqueSowIds } },
      data: {
        status: BREEDING_SOW_STATUSES.retirada,
        removal_date: removalDate,
        ...(data.removal_reason !== undefined
          ? { removal_reason: data.removal_reason }
          : {}),
      },
    });
  });
};
