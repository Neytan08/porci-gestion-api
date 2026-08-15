import type { Prisma } from "@prisma/client";
import type { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import prisma from "../../prismaClient";
import { BREEDING_SOW_STATUSES } from "../breedingSows/breedingSowsRules";
import {
  getBlockingMatingEventBySowId,
  getPregnancyUpdateEvents,
  getSowByIdWithStatus,
  type PregnancyUpdateEvent,
} from "./matingEventsQueries";
import { matingEventErrors } from "./matingEventErrors";
import {
  getSowStatusAfterDeletingMatingEvent,
  isEmptySowStatus,
  isSupportedPregnancyResultTransition,
  parsePregnancyResult,
  getSowStatusTransition,
  type PregnancyResult,
} from "./pregnancyRules";


const isPrismaRecordNotFoundError = (
  error: unknown,
): error is PrismaClientKnownRequestError => {
  if (!(error instanceof Error)) {
    return false;
  }

  const prismaError = error as PrismaClientKnownRequestError;

  return (
    prismaError.name === "PrismaClientKnownRequestError" && prismaError.code === "P2025"
  );
};

/**
 * Normalizes the requested pregnancy result and fails fast when the input is outside the domain rules.
 */
const getNextPregnancyResultOrThrow = (pregnancyResult: string) => {
  const nextPregnancyResult = parsePregnancyResult(pregnancyResult);

  if (!nextPregnancyResult) {
    throw matingEventErrors.invalidPregnancyResult(pregnancyResult);
  }

  return nextPregnancyResult;
};

/**
 * Deduplicates ids and ensures the batch still contains at least one target record.
 */
const getUniqueMatingIdsOrThrow = (matingIds: number[]) => {
  const uniqueMatingIds = Array.from(new Set(matingIds));

  if (uniqueMatingIds.length === 0) {
    throw matingEventErrors.invalidMatingIds(matingIds);
  }

  return uniqueMatingIds;
};

/**
 * Loads the events involved in a bulk pregnancy update and guarantees that every requested id exists.
 */
const loadPregnancyUpdateEvents = async (
  tx: Prisma.TransactionClient,
  matingIds: number[],
) => {
  const events = await getPregnancyUpdateEvents(matingIds, tx);

  if (events.length !== matingIds.length) {
    const foundIds = new Set(events.map(({ mating_id }) => mating_id));
    const missingIds = matingIds.filter((matingId) => !foundIds.has(matingId));
    throw matingEventErrors.matingEventsNotFound(matingIds, missingIds);
  }

  return events;
};

/**
 * Validates that the batch shares one current pregnancy result and returns it in canonical form.
 */
const getCurrentPregnancyResultOrThrow = (events: PregnancyUpdateEvent[]) => {
  const currentPregnancyResults = new Set<PregnancyResult>();

  for (const event of events) {
    if (!event.pregnancy_result) {
      throw matingEventErrors.pregnancyResultMissing(event.mating_id);
    }

    const currentPregnancyResult = parsePregnancyResult(event.pregnancy_result);

    if (!currentPregnancyResult) {
      throw matingEventErrors.unsupportedStoredPregnancyResult(
        event.mating_id,
        event.pregnancy_result,
      );
    }

    currentPregnancyResults.add(currentPregnancyResult);
  }

  if (currentPregnancyResults.size > 1) {
    throw matingEventErrors.mixedCurrentPregnancyResults(
      events.map(({ mating_id }) => mating_id),
      Array.from(new Set(events.map(({ pregnancy_result }) => pregnancy_result ?? "Unknown"))),
    );
  }

  const [currentPregnancyResult] = Array.from(currentPregnancyResults);

  if (!currentPregnancyResult) {
    throw matingEventErrors.noMatingEventsToUpdate();
  }

  return currentPregnancyResult;
};

/**
 * Resolves the target sow status value in the command layer based on a supported transition.
 */
const resolveSowStatusTransition = (
  currentPregnancyResult: PregnancyResult,
  nextPregnancyResult: PregnancyResult,
) => {
  const nextStatusKey = getSowStatusTransition(currentPregnancyResult, nextPregnancyResult);

  if (!nextStatusKey) {
    return null;
  }

  return BREEDING_SOW_STATUSES[nextStatusKey];
};

/**
 * Restores the sow to the empty state only when the deleted mating event had a positive pregnancy result.
 */
const restoreSowStatusAfterDeletingPositiveEvent = async (
  tx: Prisma.TransactionClient,
  sowId: number,
  pregnancyResult: string | null,
) => {
  const nextStatusKey = getSowStatusAfterDeletingMatingEvent(pregnancyResult);

  if (!nextStatusKey) {
    return;
  }

  await tx.breedingsows.update({
    where: { sow_id: sowId },
    data: { status: BREEDING_SOW_STATUSES[nextStatusKey] },
  });
};

/**
 * Applies the sow-status change required by a valid pregnancy-result transition.
 */
const updateAffectedSowStatuses = async (
  tx: Prisma.TransactionClient,
  events: PregnancyUpdateEvent[],
  currentPregnancyResult: PregnancyResult,
  nextPregnancyResult: PregnancyResult,
) => {
  const nextStatus = resolveSowStatusTransition(
    currentPregnancyResult,
    nextPregnancyResult,
  );

  if (!nextStatus) {
    return;
  }

  const sowIds = Array.from(new Set(events.map(({ sow_id }) => sow_id)));

  await tx.breedingsows.updateMany({
    where: {
      sow_id: { in: sowIds },
      NOT: { status: nextStatus },
    },
    data: { status: nextStatus },
  });
};

/**
 * Prevents creating a new mating event while the sow still has an active
 * pending or positive mating flow already registered.
 */
const ensureSowHasNoBlockingMatingEventOrThrow = async (
  tx: Prisma.TransactionClient,
  sowId: number,
) => {
  const blockingEvent = await getBlockingMatingEventBySowId(sowId, tx);

  if (!blockingEvent) {
    return;
  }

  throw matingEventErrors.sowHasActiveMatingEvent(
    sowId,
    blockingEvent.mating_id,
    blockingEvent.pregnancy_result,
  );
};

/**
 * Creates a mating event only when the sow is empty and does not already have
 * another active mating event in pending or positive status.
 */
export const createMatingEvent = async (data: Prisma.matingeventsUncheckedCreateInput) => {
  return await prisma.$transaction(async (tx) => {
    const sow = await getSowByIdWithStatus(data.sow_id, tx);

    if (!sow) {
      throw matingEventErrors.sowNotFound(data.sow_id);
    }

    // This explicit conflict check returns the business error requested by the API
    // instead of falling back to the generic sow-status validation below.
    await ensureSowHasNoBlockingMatingEventOrThrow(tx, data.sow_id);

    if (!sow.status || !isEmptySowStatus(sow.status)) {
      throw matingEventErrors.sowNotEmpty(data.sow_id, sow.status);
    }

    return await tx.matingevents.create({
      data,
    });
  });
};

/**
 * Persists direct field changes on an existing mating event.
 */
export const updateMatingEvent = async (id: number, data: Prisma.matingeventsUpdateInput) => {
  try {
    return await prisma.matingevents.update({
      where: { mating_id: id },
      data,
    });
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      throw matingEventErrors.matingEventNotFound(id, "update");
    }

    throw error;
  }
};

/**
 * Removes one mating event by id.
 */
export const deleteMatingEvent = async (id: number) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const deletedEvent = await tx.matingevents.delete({
        where: { mating_id: id },
        select: {
          mating_id: true,
          sow_id: true,
          pregnancy_result: true,
        },
      });

      await restoreSowStatusAfterDeletingPositiveEvent(
        tx,
        deletedEvent.sow_id,
        deletedEvent.pregnancy_result,
      );

      return deletedEvent;
    });
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      throw matingEventErrors.matingEventNotFound(id, "delete");
    }

    throw error;
  }
};

/**
 * Updates one or many mating events and applies the related sow status change only for supported transitions.
 */
export const updatePregnancyResult = async (matingIds: number[], pregnancyResult: string) => {
  const nextPregnancyResult = getNextPregnancyResultOrThrow(pregnancyResult);
  const uniqueMatingIds = getUniqueMatingIdsOrThrow(matingIds);

  return await prisma.$transaction(async (tx) => {
    const events = await loadPregnancyUpdateEvents(tx, uniqueMatingIds);
    const currentPregnancyResult = getCurrentPregnancyResultOrThrow(events);

    if (!isSupportedPregnancyResultTransition(currentPregnancyResult, nextPregnancyResult)) {
      throw matingEventErrors.pregnancyResultTransitionNotAllowed(
        currentPregnancyResult,
        nextPregnancyResult,
        uniqueMatingIds,
      );
    }

    const updatedEvents =
      currentPregnancyResult === nextPregnancyResult
        ? { count: 0 }
        : await tx.matingevents.updateMany({
            where: { mating_id: { in: uniqueMatingIds } },
            data: { pregnancy_result: nextPregnancyResult },
          });

    await updateAffectedSowStatuses(
      tx,
      events,
      currentPregnancyResult,
      nextPregnancyResult,
    );

    return updatedEvents;
  });
};