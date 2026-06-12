import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import { PREGNANCY_RESULTS } from "./pregnancyRules";

type MatingEventsQueryClient = Pick<
  Prisma.TransactionClient,
  "breedingsows" | "matingevents"
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
 * Loads the sow and its current status so write flows can validate reproductive state safely.
 */
export const getSowByIdWithStatus = async (
  sowId: number,
  queryClient: MatingEventsQueryClient = prisma,
) => {
  return await queryClient.breedingsows.findUnique({
    where: { sow_id: sowId },
    select: {
      sow_id: true,
      status: true,
    },
  });
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