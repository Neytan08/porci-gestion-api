import type { Prisma } from "@prisma/client";
import type { CreateBoarInput, RetireBoarInput, UpdateBoarInput } from "./boarsTypes";
import prisma from "../../prismaClient";
import {
  isPrismaForeignKeyConstraintError,
  isPrismaRecordNotFoundError,
  isPrismaUniqueConstraintError,
} from "../../utils/prismaErrors";
import { boarErrors } from "./boarErrors";
import {
  countBoarMatingEvents,
  createBoarRecord,
  deleteBoarRecord,
  getBoarBreedById,
  getBoarByNormalizedTagNumber,
  getBoarsForRetirement,
  getBoarStateById,
  retireBoarRecords,
  updateBoarRecord,
} from "./boarsQueries";
import { isActiveBoar, isRemovalDateBeforeBirthDate } from "./boarsRules";

/**
 * Guards chronological consistency for the boar lifecycle dates.
 */
const ensureRemovalDateIsNotBeforeBirthDate = (birthDate: Date, removalDate: Date) => {
  if (isRemovalDateBeforeBirthDate(birthDate, removalDate)) {
    throw boarErrors.removalDateBeforeBirthDate(birthDate, removalDate);
  }
};

/**
 * Ensures the incoming breed reference points to an existing breed.
 */
const ensureBreedExists = async (tx: Prisma.TransactionClient, breedId: number) => {
  const breed = await getBoarBreedById(breedId, tx);

  if (!breed) {
    throw boarErrors.breedNotFound(breedId);
  }
};

/**
 * Prevents duplicate boar tags while allowing the current record to keep its tag
 * during updates.
 */
const ensureBoarTagNumberIsAvailable = async (
  tx: Prisma.TransactionClient,
  boarTagNumber: string,
  currentBoarId?: number,
) => {
  const boar = await getBoarByNormalizedTagNumber(boarTagNumber, tx);

  if (boar && boar.boar_id !== currentBoarId) {
    throw boarErrors.tagNumberAlreadyExists(boarTagNumber);
  }
};

/**
 * Creates a boar after validating its breed and tag number.
 */
export const createBoar = async (data: CreateBoarInput) => {
  try {
    return await prisma.$transaction(async (tx) => {
      await ensureBreedExists(tx, data.breed_id);
      await ensureBoarTagNumberIsAvailable(tx, data.boar_tag_number);
      return await createBoarRecord(data, tx);
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw boarErrors.tagNumberAlreadyExists(data.boar_tag_number);
    }

    throw error;
  }
};

/**
 * Updates an active boar after validating changed references and tag number.
 */
export const updateBoar = async (id: number, data: UpdateBoarInput) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const currentBoar = await getBoarStateById(id, tx);

      if (!currentBoar) {
        throw boarErrors.boarNotFound(id, "update");
      }

      if (!isActiveBoar(currentBoar)) {
        throw boarErrors.alreadyRetired([id]);
      }

      if (typeof data.breed_id === "number") {
        await ensureBreedExists(tx, data.breed_id);
      }

      if (typeof data.boar_tag_number === "string") {
        await ensureBoarTagNumberIsAvailable(tx, data.boar_tag_number, id);
      }

      return await updateBoarRecord(id, data, tx);
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      const boarTagNumber =
        typeof data.boar_tag_number === "string" ? data.boar_tag_number : "unknown";
      throw boarErrors.tagNumberAlreadyExists(boarTagNumber);
    }

    if (isPrismaRecordNotFoundError(error)) {
      const boar = await getBoarStateById(id);
      throw boar ? boarErrors.alreadyRetired([id]) : boarErrors.boarNotFound(id, "update");
    }

    throw error;
  }
};

/**
 * Deletes a boar only when no mating events still reference it.
 */
export const deleteBoar = async (id: number) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const boar = await getBoarStateById(id, tx);
      if (!boar) throw boarErrors.boarNotFound(id, "delete");
      if (!isActiveBoar(boar)) throw boarErrors.alreadyRetired([id]);

      const matingEventsCount = await countBoarMatingEvents(id, tx);

      if (matingEventsCount > 0) {
        throw boarErrors.boarHasMatingEvents(id, matingEventsCount);
      }

      return await deleteBoarRecord(id, tx);
    });
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      const boar = await getBoarStateById(id);
      throw boar ? boarErrors.alreadyRetired([id]) : boarErrors.boarNotFound(id, "delete");
    }

    if (isPrismaForeignKeyConstraintError(error)) {
      throw boarErrors.boarHasMatingEvents(id, 1);
    }

    throw error;
  }
};

/**
 * Deduplicates retire targets and protects the command from empty batches.
 */
const getUniqueBoarIdsOrThrow = (boarIds: number[]) => {
  const uniqueBoarIds = Array.from(new Set(boarIds));

  if (uniqueBoarIds.length === 0) {
    throw boarErrors.invalidBoarIds(boarIds);
  }

  return uniqueBoarIds;
};

/**
 * Keeps each boar's removal date after its own birth date before retiring the batch.
 */
const ensureRetirementDatesAreConsistent = (
  boars: Array<{ boar_id: number; birth_date: Date }>,
  removalDate: Date,
) => {
  for (const boar of boars) {
    ensureRemovalDateIsNotBeforeBirthDate(boar.birth_date, removalDate);
  }
};

/**
 * Retires one or many boars while preserving reproductive history.
 */
export const retireBoar = async (ids: number[], data: RetireBoarInput) => {
  const uniqueBoarIds = getUniqueBoarIdsOrThrow(ids);

  return await prisma.$transaction(async (tx) => {
    const currentBoars = await getBoarsForRetirement(uniqueBoarIds, tx);
    if (currentBoars.length !== uniqueBoarIds.length) {
      const foundIds = new Set(currentBoars.map(({ boar_id }) => boar_id));
      const missingIds = uniqueBoarIds.filter((id) => !foundIds.has(id));
      throw boarErrors.boarsNotFound(uniqueBoarIds, missingIds);
    }

    const retiredIds = currentBoars
      .filter((boar) => !isActiveBoar(boar))
      .map((boar) => boar.boar_id);
    if (retiredIds.length > 0) throw boarErrors.alreadyRetired(retiredIds);

    ensureRetirementDatesAreConsistent(currentBoars, data.removal_date);

    const result = await retireBoarRecords(uniqueBoarIds, data, tx);
    if (result.count !== uniqueBoarIds.length) throw boarErrors.alreadyRetired(uniqueBoarIds);
    return result;
  });
};
