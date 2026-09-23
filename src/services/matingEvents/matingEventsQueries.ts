import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import { PREGNANCY_RESULTS } from "./pregnancyRules";

type MatingEventsQueryClient = Pick<
  Prisma.TransactionClient,
  "matingevents"
>;

export type PregnancyUpdateEvent = {
  mating_id: number;
  sow_id: number;
  pregnancy_result: string | null;
};

/**
 * Returns the full mating-event collection without applying business rules.
 */
export const getAllMatingEvents = async () => {
  return await prisma.matingevents.findMany();
};

/**
 * Returns the latest active mating event for the sow when it is still pending or positive.
 * This is used to prevent overlapping mating flows for the same sow.
 */
export const getBlockingMatingEventBySowId = async (
  sowId: number,
  queryClient: MatingEventsQueryClient = prisma,
) => {
  return await queryClient.matingevents.findFirst({
    where: {
      sow_id: sowId,
      pregnancy_result: {
        in: [PREGNANCY_RESULTS.pendiente, PREGNANCY_RESULTS.positivo],
      },
    },
    select: {
      mating_id: true,
      pregnancy_result: true,
    },
    orderBy: {
      mating_id: "desc",
    },
  });
};

/**
 * Retrieves one mating event by its identifier.
 */
export const getMatingEventById = async (id: number) => {
  return await prisma.matingevents.findUnique({
    where: { mating_id: id },
    include: {
      breedingsows: { select: { sow_tag_number: true } },
      boars: { select: { boar_tag_number: true } },
    },
  });
};

/**
 * Returns the mating events registered for a single sow.
 */
export const getMatingEventsBySow = async (sowId: number) => {
  return await prisma.matingevents.findMany({
    where: { sow_id: sowId },
    include: {
      breedingsows: { select: { sow_tag_number: true } },
      boars: { select: { boar_tag_number: true } },
    },
  });
};

/**
 * Returns the mating events registered for a single boar.
 */
export const getMatingEventsByBoar = async (boarId: number) => {
  return await prisma.matingevents.findMany({
    where: { boar_id: boarId },
  });
};

/**
 * Loads the pregnancy-update batch inside the provided read client without applying write-side validation.
 */
export const getPregnancyUpdateEvents = async (
  matingIds: number[],
  queryClient: MatingEventsQueryClient = prisma,
): Promise<PregnancyUpdateEvent[]> => {
  return await queryClient.matingevents.findMany({
    where: { mating_id: { in: matingIds } },
    select: {
      mating_id: true,
      sow_id: true,
      pregnancy_result: true,
    },
  });
};

/**
 * Groups mating events by their stored pregnancy result for reporting purposes.
 */
// TODO: I need to modify this function to include just the events with pregnancy_result = positivo, pendiente, and negativo. The other values are not relevant for the report.
export const getMatingEventsGroupedByPregnancyResult = async () => {
  const events = await prisma.matingevents.findMany({
    orderBy: { pregnancy_result: "asc" },
    include: {
      breedingsows: { select: { sow_tag_number: true } },
      boars: { select: { boar_tag_number: true } },
    },
  });

  const map = new Map<string | null, typeof events>();
  for (const event of events) {
    const key = event.pregnancy_result ?? null;
    const groupedEvents = map.get(key) ?? [];
    groupedEvents.push(event);
    map.set(key, groupedEvents);
  }

  return Array.from(map, ([pregnancy_result, groupedEvents]) => ({
    pregnancy_result,
    events: groupedEvents,
  }));
};

/** Counts the reproductive events that prevent hard deletion of a sow. */
export const countMatingEventsBySowId = async (
  sowId: number,
  queryClient: MatingEventsQueryClient = prisma,
) => {
  return await queryClient.matingevents.count({ where: { sow_id: sowId } });
};

/** Cancels pending or positive mating events when their sows are retired. */
export const cancelActiveMatingEventsBySowIds = async (
  sowIds: number[],
  queryClient: MatingEventsQueryClient,
) => {
  return await queryClient.matingevents.updateMany({
    where: {
      sow_id: { in: sowIds },
      pregnancy_result: { in: [PREGNANCY_RESULTS.pendiente, PREGNANCY_RESULTS.positivo] },
    },
    data: { pregnancy_result: PREGNANCY_RESULTS.cancelado },
  });
};

/** Inserts a mating event inside the transaction that owns its sow transition. */
export const insertMatingEvent = async (
  data: Prisma.matingeventsUncheckedCreateInput,
  queryClient: MatingEventsQueryClient,
) => {
  return await queryClient.matingevents.create({ data });
};

/** Persists scalar changes to one mating event. */
export const updateMatingEventById = async (
  id: number,
  data: Prisma.matingeventsUncheckedUpdateInput,
  queryClient: MatingEventsQueryClient,
) => {
  return await queryClient.matingevents.update({ where: { mating_id: id }, data });
};

/** Deletes one mating event and returns the state needed to restore its sow. */
export const deleteMatingEventById = async (
  id: number,
  queryClient: MatingEventsQueryClient,
) => {
  return await queryClient.matingevents.delete({
    where: { mating_id: id },
    select: { mating_id: true, sow_id: true, pregnancy_result: true },
  });
};

/** Applies one pregnancy result to a validated event batch. */
export const updateMatingEventPregnancyResults = async (
  matingIds: number[],
  pregnancyResult: string,
  queryClient: MatingEventsQueryClient,
) => {
  return await queryClient.matingevents.updateMany({
    where: { mating_id: { in: matingIds } },
    data: { pregnancy_result: pregnancyResult },
  });
};

/** Updates one mating event pregnancy result during a related workflow. */
export const updateMatingEventPregnancyResult = async (
  matingId: number,
  pregnancyResult: string,
  queryClient: MatingEventsQueryClient,
) => {
  return await queryClient.matingevents.update({
    where: { mating_id: matingId },
    data: { pregnancy_result: pregnancyResult },
  });
};
