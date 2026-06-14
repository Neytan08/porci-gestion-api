import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import { normalizeSowTagNumber } from "./breedingSowsRules";

type BreedingSowsQueryClient = Pick<
  Prisma.TransactionClient,
  "breedingsows" | "breed" | "matingevents"
>;

/**
 * Returns the breeding-sow collection with breed data.
 */
export const getAllBreedingSows = async () => {
  return await prisma.breedingsows.findMany({
    include: { breed: true },
  });
};

/**
 * Retrieves one breeding sow by id with its breed relationship.
 */
export const getBreedingSowById = async (id: number) => {
  return await prisma.breedingsows.findUnique({
    where: { sow_id: id },
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
    where: { status },
  });
};

/**
 * Counts related mating events so delete can return a domain conflict.
 */
export const countBreedingSowMatingEvents = async (
  sowId: number,
  queryClient: BreedingSowsQueryClient = prisma,
) => {
  return await queryClient.matingevents.count({
    where: { sow_id: sowId },
  });
};
