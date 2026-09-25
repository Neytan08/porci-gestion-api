import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import type { WeanFarrowingInput } from "../../schemas_validations/farrowings.schema";
import { isPrismaRecordNotFoundError } from "../../utils/prismaErrors";
import {
  applyFarrowingToBreedingSow,
  applyWeaningToBreedingSow,
  getActiveBreedingSowWithStatusForUpdate,
} from "../breedingSows/breedingSowsQueries";
import { BREEDING_SOW_STATUSES, isBeforeDate } from "../breedingSows/breedingSowsRules";
import {
  getBlockingMatingEventBySowIdForUpdate,
  updateMatingEventPregnancyResult,
} from "../matingEvents/matingEventsQueries";
import { PREGNANCY_RESULTS } from "../matingEvents/pregnancyRules";
import { farrowingErrors } from "./farrowingErrors";
import {
  deleteFarrowingById,
  getFarrowingById,
  insertFarrowing,
  updateFarrowingWeaning,
} from "./farrowingsQueries";

export type CreateFarrowingInput = Omit<
  Prisma.farrowingsUncheckedCreateInput,
  "mating_id" | "weaning_date" | "live_births" | "weaned_piglets" | "weaned_date"
>;

/**
 * A farrowing can only close a pregnancy that was confirmed as positive. Once
 * the record is created, that mating event is closed and the sow enters the
 * lactation stage in the same transaction. The command locks the sow before
 * the mating event to match every reproductive write workflow.
 */
export const createFarrowing = async (data: CreateFarrowingInput) => {
  return await prisma.$transaction(async (tx) => {
    const sow = await getActiveBreedingSowWithStatusForUpdate(data.sow_id, tx);

    if (!sow) {
      throw farrowingErrors.sowNotFound(data.sow_id);
    }

    if (sow.status !== BREEDING_SOW_STATUSES.gestacion) {
      throw farrowingErrors.sowNotGestating(data.sow_id, sow.status);
    }

    const matingEvent = await getBlockingMatingEventBySowIdForUpdate(data.sow_id, tx);

    if (!matingEvent || matingEvent.pregnancy_result !== PREGNANCY_RESULTS.positivo) {
      throw farrowingErrors.positiveMatingEventNotFound(data.sow_id);
    }

    const farrowing = await insertFarrowing(
      { ...data, mating_id: matingEvent.mating_id },
      tx,
    );

    await updateMatingEventPregnancyResult(
      matingEvent.mating_id,
      PREGNANCY_RESULTS.cerrado,
      tx,
    );

    const updatedSow = await applyFarrowingToBreedingSow(data.sow_id, tx);

    if (updatedSow.count !== 1) {
      throw farrowingErrors.sowStatusUpdateFailed(data.sow_id);
    }

    return farrowing;
  });
};

/**
 * Records actual weaning and moves the sow from lactation to empty together..
 */
export const weanFarrowing = async (id: number, data: WeanFarrowingInput) => {
  return await prisma.$transaction(async (tx) => {
    const farrowing = await getFarrowingById(id, tx);
    if (!farrowing) {
      throw farrowingErrors.farrowingNotFound(id, "wean");
    }
    if (farrowing.weaned_date !== null) {
      throw farrowingErrors.alreadyWeaned(id);
    }

    const weanedDate = new Date(data.weaned_date);
    if (isBeforeDate(weanedDate, farrowing.farrowing_date)) {
      throw farrowingErrors.invalidWeanDate(id);
    }
    if (farrowing.breedingsows.status !== BREEDING_SOW_STATUSES.lactancia) {
      throw farrowingErrors.sowNotLactating(farrowing.sow_id, farrowing.breedingsows.status);
    }

    const updatedFarrowing = await updateFarrowingWeaning(
      id,
      farrowing.sow_id,
      farrowing.farrowing_date,
      weanedDate,
      data.weaned_piglets,
      tx,
    );

    await applyWeaningToBreedingSow(farrowing.sow_id, weanedDate, tx);

    return updatedFarrowing;
  });
};

/**
 * Removes a farrowing record by id. Status restoration is intentionally not
 * inferred here because the current business rules only define creation effects.
 */
export const deleteFarrowing = async (id: number) => {
  try {
    return await deleteFarrowingById(id);
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      throw farrowingErrors.farrowingNotFound(id, "delete");
    }
    throw error;
  }
};
