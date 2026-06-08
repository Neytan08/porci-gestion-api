import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import ApiError from "../../utils/apiError";
import {
  getPregnancyUpdateEvents,
  getSowByIdWithStatus,
  type PregnancyUpdateEvent,
} from "./matingEventsQueries";
import {
  isEmptySowStatus,
  isSupportedPregnancyResultTransition,
  parsePregnancyResult,
  getSowStatusTransition,
  SOW_STATUS_LABELS,
  type PregnancyResult,
} from "./pregnancyRules";

/**
 * Normalizes the requested pregnancy result and fails fast when the input is outside the domain rules.
 */
const getNextPregnancyResultOrThrow = (pregnancyResult: string) => {
  const nextPregnancyResult = parsePregnancyResult(pregnancyResult);

  if (!nextPregnancyResult) {
    throw ApiError.badRequest(
      "Validation error: pregnancy_result must be 'Pendiente', 'Positivo' or 'Negativo'",
    );
  }

  return nextPregnancyResult;
};

/**
 * Deduplicates ids and ensures the batch still contains at least one target record.
 */
const getUniqueMatingIdsOrThrow = (matingIds: number[]) => {
  const uniqueMatingIds = Array.from(new Set(matingIds));

  if (uniqueMatingIds.length === 0) {
    throw ApiError.badRequest("Validation error: mating_ids must not be empty");
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
    throw ApiError.notFound(`Mating events not found for ids: ${missingIds.join(", ")}`);
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
      throw ApiError.badRequest(
        `Mating event with id ${event.mating_id} has no pregnancy result assigned`,
      );
    }

    const currentPregnancyResult = parsePregnancyResult(event.pregnancy_result);

    if (!currentPregnancyResult) {
      throw ApiError.badRequest(
        `Mating event with id ${event.mating_id} has an unsupported pregnancy result`,
      );
    }

    currentPregnancyResults.add(currentPregnancyResult);
  }

  if (currentPregnancyResults.size > 1) {
    throw ApiError.badRequest(
      "Validation error: all mating events in the same update must share the same current pregnancy result",
    );
  }

  const [currentPregnancyResult] = Array.from(currentPregnancyResults);

  if (!currentPregnancyResult) {
    throw ApiError.badRequest("Validation error: no mating events found to update");
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

  return SOW_STATUS_LABELS[nextStatusKey];
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
 * Creates a mating event while preserving the sow status until a pregnancy-result transition requires a change.
 */
export const createMatingEvent = async (data: Prisma.matingeventsUncheckedCreateInput) => {
  return await prisma.$transaction(async (tx) => {
    const sow = await getSowByIdWithStatus(data.sow_id, tx);

    if (!sow) {
      throw ApiError.notFound("Sow not found");
    }

    if (!sow.status || !isEmptySowStatus(sow.status)) {
      throw ApiError.badRequest("Cannot create mating event: sow status must be 'vacia'");
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
  return await prisma.matingevents.update({
    where: { mating_id: id },
    data,
  });
};

/**
 * Removes one mating event by id.
 */
export const deleteMatingEvent = async (id: number) => {
  return await prisma.matingevents.delete({
    where: { mating_id: id },
  });
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
      throw ApiError.badRequest(
        `Unsupported pregnancy result transition: '${currentPregnancyResult}' -> '${nextPregnancyResult}'`,
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