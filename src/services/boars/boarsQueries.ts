import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import { normalizeBoarTagNumber } from "./boarsRules";

type BoarsQueryClient = Pick<Prisma.TransactionClient, "boars" | "breed" | "matingevents">;

/**
 * Returns the boar collection with breed data required by the controller response.
 */
export const getAllBoars = async () => {
  return await prisma.boars.findMany({
    where: {
      removal_date: null,
      removal_reason: null,
    },
    include: { breeds: true },
  });
};

/**
 * Retrieves one boar by id with its breed relationship.
 */
export const getBoarById = async (id: number) => {
  return await prisma.boars.findUnique({
    where: { boar_id: id },
    include: { breeds: true },
  });
};

/**
 * Checks whether a breed exists before a boar references it.
 */
export const getBoarBreedById = async (breedId: number, queryClient: BoarsQueryClient = prisma) => {
  return await queryClient.breed.findUnique({
    where: { breed_id: breedId },
    select: { breed_id: true },
  });
};

/**
 * Finds a boar tag match using the same normalization applied by the public
 * tag-availability endpoint and by create/update validation.
 */
export const getBoarByNormalizedTagNumber = async (
  boarTagNumber: string,
  queryClient: BoarsQueryClient = prisma,
) => {
  const normalizedBoarTagNumber = normalizeBoarTagNumber(boarTagNumber);
  const boars = await queryClient.boars.findMany({
    select: {
      boar_id: true,
      boar_tag_number: true,
    },
  });

  return (
    boars.find(
      (boar) => normalizeBoarTagNumber(boar.boar_tag_number) === normalizedBoarTagNumber,
    ) ?? null
  );
};

/**
 * Counts related mating events so delete can fail with a business error before
 * Prisma raises a generic foreign-key violation.
 */
export const countBoarMatingEvents = async (
  boarId: number,
  queryClient: BoarsQueryClient = prisma,
) => {
  return await queryClient.matingevents.count({
    where: { boar_id: boarId },
  });
};
