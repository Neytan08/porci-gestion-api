import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import { BREEDING_SOW_STATUSES, normalizeSowTagNumber } from "./breedingSowsRules";

type BreedingSowsQueryClient = Pick<
  Prisma.TransactionClient,
  "breedingsows" | "breed" | "matingevents"
>;

const activeBreedingSowWhere = {
  removal_date: null,
  OR: [
    { status: null },
    { status: { not: BREEDING_SOW_STATUSES.retirada } },
  ],
} satisfies Prisma.breedingsowsWhereInput;

/**
 * Returns the breeding-sow collection with breed data.
 */
export const getAllBreedingSows = async () => {
  return await prisma.breedingsows.findMany({
    where: activeBreedingSowWhere,
    include: { breed: true },
  });
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
