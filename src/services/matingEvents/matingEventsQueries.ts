import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import type { SowStatusKey } from "./pregnancyRules";

type MatingEventsQueryClient = Pick<
  Prisma.TransactionClient,
  "breedingsows" | "matingevents" | "status"
>;

export type PregnancyUpdateEvent = {
  mating_id: number;
  sow_id: number;
  pregnancy_result: string | null;
};

/**
 * Normalizes persisted labels so query-side status lookups stay accent-insensitive.
 */
const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

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
    include: {
      status: {
        select: {
          status_name: true,
        },
      },
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
 * Finds the persisted status id for a normalized sow status key without applying command-side errors.
 */
export const findSowStatusIdByKey = async (
  statusKey: SowStatusKey,
  queryClient: MatingEventsQueryClient = prisma,
) => {
  const statuses = await queryClient.status.findMany({
    select: {
      status_id: true,
      status_name: true,
    },
  });

  const status = statuses.find(({ status_name }) => normalizeText(status_name) === statusKey);

  return status?.status_id ?? null;
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