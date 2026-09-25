import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import {
  isPrismaForeignKeyConstraintError,
  isPrismaRecordNotFoundError,
} from "../../utils/prismaErrors";
import { getBoarStateForAssignment } from "../boars/boarsQueries";
import { isActiveBoar } from "../boars/boarsRules";
import {
  getActiveBreedingSowsWithStatusForUpdate,
  getActiveBreedingSowWithStatusForUpdate,
  getBreedingSowStateForUpdate,
  updateActiveBreedingSowStatus,
  updateActiveBreedingSowStatuses,
} from "../breedingSows/breedingSowsQueries";
import { BREEDING_SOW_STATUSES } from "../breedingSows/breedingSowsRules";
import {
  countMatingEventFarrowings,
  deleteMatingEventById,
  getBlockingMatingEventBySowId,
  getMatingEventDeletionTarget,
  getMatingEventForDeletion,
  getPregnancyUpdateEvents,
  getPregnancyUpdateEventsForUpdate,
  insertMatingEvent,
  type PregnancyUpdateEvent,
  updateMatingEventPregnancyResults,
} from "./matingEventsQueries";
import { matingEventErrors } from "./matingEventErrors";
import type { CreateMatingEventInput } from "./matingEventsTypes";
import {
  canPregnancyResultBeProvidedByRequest,
  getSowStatusAfterDeletingMatingEvent,
  getSowStatusForCreatedMatingEvent,
  isEmptySowStatus,
  isSupportedPregnancyResultTransition,
  parsePregnancyResult,
  getSowStatusTransition,
  type PregnancyResult,
} from "./pregnancyRules";

/**
 * Normalizes the requested pregnancy result and fails fast when the input is outside the domain rules.
 */
const getNextPregnancyResultOrThrow = (pregnancyResult: PregnancyResult) => {
  if (!canPregnancyResultBeProvidedByRequest(pregnancyResult)) {
    throw matingEventErrors.invalidPregnancyResult(pregnancyResult);
  }

  return pregnancyResult;
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
  lockRows = false,
) => {
  const events = lockRows
    ? await getPregnancyUpdateEventsForUpdate(matingIds, tx)
    : await getPregnancyUpdateEvents(matingIds, tx);

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

  await updateActiveBreedingSowStatus(sowId, BREEDING_SOW_STATUSES[nextStatusKey], tx);
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

  const result = await updateActiveBreedingSowStatuses(sowIds, nextStatus, tx);

  if (result.count !== sowIds.length) {
    throw matingEventErrors.transactionStateChanged(
      events.map(({ mating_id }) => mating_id),
      "Not every affected sow could complete the required status transition.",
      sowIds.length,
      result.count,
    );
  }
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

/** Rejects a retired boar while locking its row against concurrent retirement. */
const ensureBoarCanBeAssigned = async (tx: Prisma.TransactionClient, boarId: number) => {
  const boar = await getBoarStateForAssignment(boarId, tx);
  if (!boar) throw matingEventErrors.boarNotFound(boarId);
  if (!isActiveBoar(boar)) throw matingEventErrors.boarRetired(boarId);
};

/**
 * Creates a mating event after locking its sow, then its selected boar, so concurrent
 * reproductive and retirement workflows must revalidate after this transaction.
 */
export const createMatingEvent = async (data: CreateMatingEventInput) => {
  if (!canPregnancyResultBeProvidedByRequest(data.pregnancy_result)) {
    throw matingEventErrors.invalidPregnancyResult(data.pregnancy_result, "create");
  }

  return await prisma.$transaction(async (tx) => {
    const sow = await getActiveBreedingSowWithStatusForUpdate(data.sow_id, tx);

    if (!sow) {
      throw matingEventErrors.sowNotFound(data.sow_id);
    }

    // This explicit conflict check returns the business error requested by the API
    // instead of falling back to the generic sow-status validation below.
    await ensureSowHasNoBlockingMatingEventOrThrow(tx, data.sow_id);

    if (!sow.status || !isEmptySowStatus(sow.status)) {
      throw matingEventErrors.sowNotEmpty(data.sow_id, sow.status);
    }

    if (data.boar_id != null) await ensureBoarCanBeAssigned(tx, data.boar_id);

    const newMatingEvent = await insertMatingEvent(data, tx);

    // The sow status is updated only when the new mating event has a pregnancy result that actually moves the sow.
    const nextSowStatus = getSowStatusForCreatedMatingEvent(data.pregnancy_result ?? null);
    if (nextSowStatus) {
      await updateActiveBreedingSowStatus(data.sow_id, nextSowStatus, tx);
    }

    return newMatingEvent;
  });
};

/**
 * Removes one unreferenced mating event using the shared sow-then-event lock order.
 */
export const deleteMatingEvent = async (id: number) => {
  const deletionTarget = await getMatingEventDeletionTarget(id);

  if (!deletionTarget) {
    throw matingEventErrors.matingEventNotFound(id, "delete");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const sow = await getBreedingSowStateForUpdate(deletionTarget.sow_id, tx);

      if (!sow) {
        throw matingEventErrors.transactionStateChanged(
          [id],
          "The mating event sow is no longer available.",
        );
      }

      const event = await getMatingEventForDeletion(id, tx);

      if (!event) {
        throw matingEventErrors.matingEventNotFound(id, "delete");
      }

      if (event.sow_id !== deletionTarget.sow_id) {
        throw matingEventErrors.transactionStateChanged(
          [id],
          "The mating event sow changed before deletion locks were acquired.",
        );
      }

      const farrowingCount = await countMatingEventFarrowings(id, tx);

      if (farrowingCount > 0) {
        throw matingEventErrors.matingEventHasFarrowings(id, farrowingCount);
      }

      const deletedEvent = await deleteMatingEventById(id, tx);

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

    if (isPrismaForeignKeyConstraintError(error)) {
      throw matingEventErrors.matingEventHasFarrowings(id);
    }

    throw error;
  }
};

/**
 * Locks affected sows and then mating events in identifier order before applying
 * a supported pregnancy-result and sow-status transition atomically.
 */
export const updatePregnancyResult = async (
  matingIds: number[],
  pregnancyResult: PregnancyResult,
) => {
  const nextPregnancyResult = getNextPregnancyResultOrThrow(pregnancyResult);
  const uniqueMatingIds = getUniqueMatingIdsOrThrow(matingIds);

  return await prisma.$transaction(async (tx) => {
    const preliminaryEvents = await loadPregnancyUpdateEvents(tx, uniqueMatingIds);
    const sowIds = Array.from(new Set(preliminaryEvents.map(({ sow_id }) => sow_id))).sort(
      (left, right) => left - right,
    );
    const lockedSows = await getActiveBreedingSowsWithStatusForUpdate(sowIds, tx);

    if (lockedSows.length !== sowIds.length) {
      throw matingEventErrors.transactionStateChanged(
        uniqueMatingIds,
        "One or more affected sows are missing or retired.",
        sowIds.length,
        lockedSows.length,
      );
    }

    const events = await loadPregnancyUpdateEvents(tx, uniqueMatingIds, true);
    const preliminarySowByEventId = new Map(
      preliminaryEvents.map(({ mating_id, sow_id }) => [mating_id, sow_id]),
    );

    if (events.some((event) => preliminarySowByEventId.get(event.mating_id) !== event.sow_id)) {
      throw matingEventErrors.transactionStateChanged(
        uniqueMatingIds,
        "A mating event relationship changed before locks were acquired.",
      );
    }

    const currentPregnancyResult = getCurrentPregnancyResultOrThrow(events);

    if (!isSupportedPregnancyResultTransition(currentPregnancyResult, nextPregnancyResult)) {
      throw matingEventErrors.pregnancyResultTransitionNotAllowed(
        currentPregnancyResult,
        nextPregnancyResult,
        uniqueMatingIds,
      );
    }

    const updatedEvents = currentPregnancyResult === nextPregnancyResult
      ? { count: 0 }
      : await updateMatingEventPregnancyResults(uniqueMatingIds, nextPregnancyResult, tx);

    if (
      currentPregnancyResult !== nextPregnancyResult &&
      updatedEvents.count !== uniqueMatingIds.length
    ) {
      throw matingEventErrors.transactionStateChanged(
        uniqueMatingIds,
        "Not every mating event could complete the requested pregnancy transition.",
        uniqueMatingIds.length,
        updatedEvents.count,
      );
    }

    await updateAffectedSowStatuses(
      tx,
      events,
      currentPregnancyResult,
      nextPregnancyResult,
    );

    return updatedEvents;
  });
};
