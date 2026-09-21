import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import {
  isPrismaForeignKeyConstraintError,
  isPrismaRecordNotFoundError,
  isPrismaUniqueConstraintError,
} from "../../utils/prismaErrors";
import { breedErrors } from "./breedErrors";
import {
  countBreedRelatedAnimals,
  deleteBreedById,
  getBreedById,
  getBreedByNormalizedName,
  insertBreed,
  updateBreedById,
} from "./breedsQueries";
import type { CreateBreedInput, UpdateBreedInput } from "./breedTypes";

/**
 * Prevents duplicated breed names while allowing the current breed to keep its
 * name during updates.
 */
const ensureBreedNameIsAvailable = async (
  tx: Prisma.TransactionClient,
  breedName: string,
  currentBreedId?: number,
) => {
  const breed = await getBreedByNormalizedName(breedName, tx);

  if (breed && breed.breed_id !== currentBreedId) {
    throw breedErrors.breedNameAlreadyExists(breedName);
  }
};

/**
 * Creates a breed after enforcing name uniqueness.
 */
export const createBreed = async (data: CreateBreedInput) => {
  try {
    return await prisma.$transaction(async (tx) => {
      await ensureBreedNameIsAvailable(tx, data.breed_name);

      return await insertBreed(data, tx);
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      throw breedErrors.breedNameAlreadyExists(data.breed_name);
    }

    throw error;
  }
};

/**
 * Updates a breed after confirming it exists and the requested name is available.
 */
export const updateBreed = async (id: number, data: UpdateBreedInput) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const currentBreed = await getBreedById(id, tx);

      if (!currentBreed) {
        throw breedErrors.breedNotFound(id, "update");
      }

      if (data.breed_name !== undefined) {
        await ensureBreedNameIsAvailable(tx, data.breed_name, id);
      }

      return await updateBreedById(id, data, tx);
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error) && data.breed_name !== undefined) {
      throw breedErrors.breedNameAlreadyExists(data.breed_name);
    }

    if (isPrismaRecordNotFoundError(error)) {
      throw breedErrors.breedNotFound(id, "update");
    }

    throw error;
  }
};

/**
 * Deletes a breed only when no boars or breeding sows still reference it.
 */
export const deleteBreed = async (id: number) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const relatedAnimals = await countBreedRelatedAnimals(id, tx);

      if (relatedAnimals.boars > 0 || relatedAnimals.breedingSows > 0) {
        throw breedErrors.breedHasRelatedAnimals(
          id,
          relatedAnimals.boars,
          relatedAnimals.breedingSows,
        );
      }

      return await deleteBreedById(id, tx);
    });
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      throw breedErrors.breedNotFound(id, "delete");
    }

    if (isPrismaForeignKeyConstraintError(error)) {
      throw breedErrors.breedHasRelatedAnimals(id);
    }

    throw error;
  }
};
