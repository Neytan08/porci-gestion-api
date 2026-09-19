import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import { BREEDING_SOW_STATUSES, normalizeSowTagNumber } from "./breedingSowsRules";

type BreedingSowsQueryClient = Pick<
  Prisma.TransactionClient,
  "breedingsows" | "breed" | "matingevents" | "farrowings"
>;

const activeBreedingSowWhere = {
  removal_date: null,
  OR: [
    { status: null },
    { status: { not: BREEDING_SOW_STATUSES.retirada } },
  ],
} satisfies Prisma.breedingsowsWhereInput;

/**
 * Business-defined priority for listing active breeding sows.
 * Lower values are returned first by getAllBreedingSows.
 */
const BREEDING_SOW_STATUS_ORDER: Partial<Record<string, number>> = {
  [BREEDING_SOW_STATUSES.gestacion]: 0,
  [BREEDING_SOW_STATUSES.lactancia]: 1,
  [BREEDING_SOW_STATUSES.vacia]: 2,
  [BREEDING_SOW_STATUSES.noProductiva]: 3,
};

/**
 * Resolves the configured list priority for a sow status.
 * Null or unexpected statuses are kept visible but placed after the known active statuses.
 */
const getBreedingSowStatusOrder = (status: string | null) =>
  status === null
    ? Number.MAX_SAFE_INTEGER
    : BREEDING_SOW_STATUS_ORDER[status] ?? Number.MAX_SAFE_INTEGER;

/**
 * Returns the breeding-sow collection with breed data.
 */
export const getAllBreedingSows = async () => {
  const sows = await prisma.breedingsows.findMany({
    where: activeBreedingSowWhere,
    include: { breed: true },
    // Provides a deterministic base order for records that share the same status priority.
    orderBy: { sow_id: "asc" },
  });

  // Applies the domain-specific status order before the API response.
  return sows
    // Keeps the Prisma base order stable within each status group.
    .map((sow, index) => ({ sow, index }))
    .sort((a, b) => {
      const statusOrder =
        getBreedingSowStatusOrder(a.sow.status) - getBreedingSowStatusOrder(b.sow.status);

      return statusOrder === 0 ? a.index - b.index : statusOrder;
    })
    .map(({ sow }) => sow);
};

/**
 * Retrieves one breeding sow by id with its breed relationship.
 */
export const getBreedingSowById = async (id: number) => {
  return await prisma.breedingsows.findFirst({
    where: {
      AND: [{ sow_id: id }, activeBreedingSowWhere],
    },
    include: { breed: true },
  });
};

/**
 * Loads only the fields needed to validate a proposed status change.
 */
export const getBreedingSowStatusById = async (id: number) => {
  return await prisma.breedingsows.findUnique({
    where: { sow_id: id },
    select: {
      sow_id: true,
      status: true,
    },
  });
};

/**
 * Checks whether a breed exists before a breeding sow references it.
 */
export const getBreedingSowBreedById = async (
  breedId: number,
  queryClient: BreedingSowsQueryClient = prisma,
) => {
  return await queryClient.breed.findUnique({
    where: { breed_id: breedId },
    select: { breed_id: true },
  });
};

/**
 * Finds a sow tag match using whitespace- and case-insensitive comparison.
 */
export const getBreedingSowByNormalizedTagNumber = async (
  sowTagNumber: string,
  queryClient: BreedingSowsQueryClient = prisma,
) => {
  const normalizedSowTagNumber = normalizeSowTagNumber(sowTagNumber);
  const sows = await queryClient.breedingsows.findMany({
    select: {
      sow_id: true,
      sow_tag_number: true,
    },
  });

  return (
    sows.find((sow) => normalizeSowTagNumber(sow.sow_tag_number) === normalizedSowTagNumber) ?? null
  );
};

/**
 * Returns breeding sows that match a canonical status value.
 */
export const getBreedingSowsByStatus = async (status: string) => {
  return await prisma.breedingsows.findMany({
    where: {
      AND: [{ status }, activeBreedingSowWhere],
    },
  });
};

export const countBreedingSowMatingEvents = async (
  sowId: number,
  queryClient: BreedingSowsQueryClient = prisma,
) => {
  return await queryClient.matingevents.count({
    where: { sow_id: sowId },
  });
};

/**
 * Returns the latest farrowing that is still controlled by the weaning workflow.
 */
export const getActiveFarrowingBySowId = async (
  sowId: number,
  queryClient: BreedingSowsQueryClient = prisma,
) => {
  return await queryClient.farrowings.findFirst({
    where: {
      sow_id: sowId,
      weaned_date: null,
    },
    select: {
      farrowing_id: true,
      weaned_date: true,
    },
    orderBy: {
      farrowing_id: "desc",
    },
  });
};
