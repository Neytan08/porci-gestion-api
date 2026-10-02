import prisma from "../../prismaClient";
import {
  applyFarrowingToBreedingSow,
  applyWeaningToBreedingSow,
  getActiveBreedingSowWithStatusForUpdate,
  getBreedingSowStateForUpdate,
  restoreBreedingSowAfterFarrowingDeletion,
} from "../breedingSows/breedingSowsQueries";
import { BREEDING_SOW_STATUSES } from "../breedingSows/breedingSowsRules";
import {
  getBlockingMatingEventBySowIdForUpdate,
  getMatingEventForDeletion,
  restoreMatingEventAfterFarrowingDeletion,
  updateMatingEventPregnancyResult,
} from "../matingEvents/matingEventsQueries";
import { PREGNANCY_RESULTS } from "../matingEvents/pregnancyRules";
import { farrowingErrors } from "./farrowingErrors";
import {
  deleteFarrowingById,
  getFarrowingWorkflowStateForUpdate,
  getFarrowingWorkflowTarget,
  getLatestPreviousWeaningDate,
  insertFarrowing,
  updateFarrowingWeaning,
} from "./farrowingsQueries";
import {
  isFarrowingCompletionDateValid,
  isFarrowingDateAfterReproductionDate,
} from "./farrowingsRules";
import type { CreateFarrowingInput, WeanFarrowingInput } from "./farrowingsTypes";

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

    if (
      !isFarrowingDateAfterReproductionDate(
        data.farrowing_date,
        matingEvent.reproduction_date,
      )
    ) {
      throw farrowingErrors.farrowingDateBeforeReproduction(
        data.sow_id,
        matingEvent.mating_id,
        matingEvent.reproduction_date,
        data.farrowing_date,
      );
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
 * Records actual weaning and moves the sow from lactation to empty atomically.
 */
export const weanFarrowing = async (id: number, data: WeanFarrowingInput) => {
  const target = await getFarrowingWorkflowTarget(id);

  if (!target) {
    throw farrowingErrors.farrowingNotFound(id, "wean");
  }

  return await prisma.$transaction(async (tx) => {
    const sow = await getBreedingSowStateForUpdate(target.sow_id, tx);

    if (!sow) {
      throw farrowingErrors.farrowingStateChanged(id, "wean");
    }

    const farrowing = await getFarrowingWorkflowStateForUpdate(id, tx);

    if (!farrowing) {
      throw farrowingErrors.farrowingNotFound(id, "wean");
    }

    if (farrowing.sow_id !== target.sow_id || farrowing.mating_id !== target.mating_id) {
      throw farrowingErrors.farrowingStateChanged(id, "wean");
    }

    if (sow.status === BREEDING_SOW_STATUSES.retirada) {
      throw farrowingErrors.sowNotLactating(farrowing.sow_id, sow.status);
    }

    if (farrowing.weaned_date !== null) {
      throw farrowingErrors.alreadyWeaned(id);
    }

    if (sow.status !== BREEDING_SOW_STATUSES.lactancia) {
      throw farrowingErrors.sowNotLactating(farrowing.sow_id, sow.status);
    }

    if (!isFarrowingCompletionDateValid(data.weaned_date, farrowing.farrowing_date)) {
      throw farrowingErrors.invalidWeanDate(id);
    }

    const updatedFarrowing = await updateFarrowingWeaning(
      id,
      farrowing.sow_id,
      farrowing.farrowing_date,
      data.weaned_date,
      data.weaned_piglets,
      tx,
    );

    await applyWeaningToBreedingSow(farrowing.sow_id, data.weaned_date, tx);

    return updatedFarrowing;
  });
};

/**
 * Deletes an unweaned farrowing and restores its mating event and sow lifecycle.
 */
export const deleteFarrowing = async (id: number) => {
  const target = await getFarrowingWorkflowTarget(id);

  if (!target) {
    throw farrowingErrors.farrowingNotFound(id, "delete");
  }

  return await prisma.$transaction(async (tx) => {
    const sow = await getBreedingSowStateForUpdate(target.sow_id, tx);

    if (!sow) {
      throw farrowingErrors.farrowingStateChanged(id, "delete");
    }

    const matingEvent = await getMatingEventForDeletion(target.mating_id, tx);
    const farrowing = await getFarrowingWorkflowStateForUpdate(id, tx);

    if (!farrowing) {
      throw farrowingErrors.farrowingNotFound(id, "delete");
    }

    if (
      !matingEvent ||
      farrowing.sow_id !== target.sow_id ||
      farrowing.mating_id !== target.mating_id ||
      matingEvent.sow_id !== target.sow_id
    ) {
      throw farrowingErrors.farrowingStateChanged(id, "delete");
    }

    if (farrowing.weaned_date !== null) {
      throw farrowingErrors.completedFarrowingCannotBeDeleted(id);
    }

    if (
      sow.status !== BREEDING_SOW_STATUSES.lactancia ||
      matingEvent.pregnancy_result !== PREGNANCY_RESULTS.cerrado
    ) {
      throw farrowingErrors.farrowingStateChanged(id, "delete");
    }

    const lastWeaningDate = await getLatestPreviousWeaningDate(farrowing.sow_id, id, tx);
    const deletedFarrowing = await deleteFarrowingById(id, tx);
    const restoredMatingEvent = await restoreMatingEventAfterFarrowingDeletion(
      farrowing.mating_id,
      farrowing.sow_id,
      tx,
    );
    const restoredSow = await restoreBreedingSowAfterFarrowingDeletion(
      farrowing.sow_id,
      lastWeaningDate,
      tx,
    );

    if (restoredMatingEvent.count !== 1 || restoredSow.count !== 1) {
      throw farrowingErrors.farrowingStateChanged(id, "delete");
    }

    return deletedFarrowing;
  });
};
