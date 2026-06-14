import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import { normalizeBreedName } from "./breedRules";

type BreedsQueryClient = Pick<Prisma.TransactionClient, "breed" | "boars" | "breedingsows">;

export type BreedRelatedAnimalsCount = {
  boars: number;
  breedingSows: number;
};

/**
 * Returns the full breed collection.
 */
export const getAllBreeds = async () => {
  return await prisma.breed.findMany();
};

/**
 * Retrieves one breed by its identifier.
 */
export const getBreedById = async (id: number) => {
  return await prisma.breed.findUnique({
    where: { breed_id: id },
  });
};

/**
 * Finds a breed by normalized name to keep create and update uniqueness checks
 * consistent with user-facing values.
 */
export const getBreedByNormalizedName = async (
  breedName: string,
  queryClient: BreedsQueryClient = prisma,
) => {
  const normalizedBreedName = normalizeBreedName(breedName);
  const breeds = await queryClient.breed.findMany({
    select: {
      breed_id: true,
      breed_name: true,
    },
  });

  return (
    breeds.find((breed) => normalizeBreedName(breed.breed_name) === normalizedBreedName) ?? null
  );
};

/**
 * Counts animals that still reference a breed before delete.
 */
export const countBreedRelatedAnimals = async (
  breedId: number,
  queryClient: BreedsQueryClient = prisma,
): Promise<BreedRelatedAnimalsCount> => {
  const [boars, breedingSows] = await Promise.all([
    queryClient.boars.count({ where: { breed_id: breedId } }),
    queryClient.breedingsows.count({ where: { breed_id: breedId } }),
  ]);

  return { boars, breedingSows };
};
