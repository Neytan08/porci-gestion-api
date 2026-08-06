import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import {
  isPrismaForeignKeyConstraintError,
  isPrismaRecordNotFoundError,
  isPrismaUniqueConstraintError,
} from "../../utils/prismaErrors";
import { boarErrors } from "./boarErrors";
import {
  countBoarMatingEvents,
  getBoarBreedById,
  getBoarByNormalizedTagNumber,
} from "./boarsQueries";
import { hasBoarDateValue, isRemovalDateBeforeBirthDate } from "./boarsRules";
import { PREGNANCY_RESULTS } from "../matingEvents/pregnancyRules";

export type RetireBoarInput = {
  removal_date?: string;
  removal_reason?: string | null;
};

/**
 * Guards chronological consistency for the boar lifecycle dates.
 */
const ensureRemovalDateIsNotBeforeBirthDate = (birthDate: unknown, removalDate: unknown) => {
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
 * Creates a boar only after validating references, unique tag number, and dates.
 */
export const createBoar = async (data: Prisma.boarsUncheckedCreateInput) => {
  try {
    return await prisma.$transaction(async (tx) => {
      await ensureBreedExists(tx, data.breed_id);
      await ensureBoarTagNumberIsAvailable(tx, data.boar_tag_number);
      ensureRemovalDateIsNotBeforeBirthDate(data.birth_date, data.removal_date);

      return await tx.boars.create({ data });
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw boarErrors.tagNumberAlreadyExists(data.boar_tag_number);
    }

    throw error;
  }
};

/**
 * Updates a boar after confirming the target exists and the changed fields keep
 * the record inside the business rules.
 */
export const updateBoar = async (id: number, data: Prisma.boarsUncheckedUpdateInput) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const currentBoar = await tx.boars.findUnique({
        where: { boar_id: id },
        select: {
          boar_id: true,
          birth_date: true,
          removal_date: true,
        },
      });

      if (!currentBoar) {
        throw boarErrors.boarNotFound(id, "update");
      }

      if (typeof data.breed_id === "number") {
        await ensureBreedExists(tx, data.breed_id);
      }

      if (typeof data.boar_tag_number === "string") {
        await ensureBoarTagNumberIsAvailable(tx, data.boar_tag_number, id);
      }

      const nextBirthDate = hasBoarDateValue(data.birth_date)
        ? data.birth_date
        : currentBoar.birth_date;
      const nextRemovalDate =
        hasBoarDateValue(data.removal_date) || data.removal_date === null
          ? data.removal_date
          : currentBoar.removal_date;
      ensureRemovalDateIsNotBeforeBirthDate(nextBirthDate, nextRemovalDate);

      return await tx.boars.update({
        where: { boar_id: id },
        data,
      });
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      const boarTagNumber =
        typeof data.boar_tag_number === "string" ? data.boar_tag_number : "unknown";
      throw boarErrors.tagNumberAlreadyExists(boarTagNumber);
    }

    if (isPrismaRecordNotFoundError(error)) {
      throw boarErrors.boarNotFound(id, "update");
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
      const matingEventsCount = await countBoarMatingEvents(id, tx);

      if (matingEventsCount > 0) {
        throw boarErrors.boarHasMatingEvents(id, matingEventsCount);
      }

      return await tx.boars.delete({
        where: { boar_id: id },
      });
    });
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      throw boarErrors.boarNotFound(id, "delete");
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
 * Loads every boar requested for retirement and fails before mutating data when any id is missing.
 */
const loadBoarsForRetirement = async (
  tx: Prisma.TransactionClient,
  boarIds: number[],
) => {
  const boars = await tx.boars.findMany({
    where: { boar_id: { in: boarIds } },
    select: {
      boar_id: true,
      birth_date: true,
    },
  });

  if (boars.length !== boarIds.length) {
    const foundIds = new Set(boars.map(({ boar_id }) => boar_id));
    const missingBoarIds = boarIds.filter((boarId) => !foundIds.has(boarId));
    throw boarErrors.boarsNotFound(boarIds, missingBoarIds);
  }

  return boars;
};

/**
 * Keeps each boar's removal date after its own birth date before retiring the batch.
 */
const ensureRetirementDatesAreConsistent = (
  boars: Array<{ boar_id: number; birth_date: Date }>,
  removalDate: unknown,
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
    const currentBoars = await loadBoarsForRetirement(tx, uniqueBoarIds);
    const removalDate = data.removal_date ?? new Date();

    ensureRetirementDatesAreConsistent(currentBoars, removalDate);

    await tx.matingevents.updateMany({
      where: {
        boar_id: { in: uniqueBoarIds },
        pregnancy_result: {
          in: [PREGNANCY_RESULTS.pendiente, PREGNANCY_RESULTS.positivo],
        },
      },
      data: {
        pregnancy_result: PREGNANCY_RESULTS.cancelado,
      },
    });

    return await tx.boars.updateMany({
      where: { boar_id: { in: uniqueBoarIds } },
      data: {
        removal_date: removalDate,
        ...(data.removal_reason !== undefined
          ? { removal_reason: data.removal_reason }
          : {}),
      },
    });
  });
};
