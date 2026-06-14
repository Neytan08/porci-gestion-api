import type { Prisma } from "@prisma/client";
import prisma from "../../prismaClient";
import {
  isPrismaForeignKeyConstraintError,
  isPrismaRecordNotFoundError,
  isPrismaUniqueConstraintError,
} from "../../utils/prismaErrors";
import { breedErrors } from "./breedErrors";
import { countBreedRelatedAnimals, getBreedByNormalizedName } from "./breedsQueries";

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
export const createBreed = async (data: Prisma.breedCreateInput) => {
  try {
    return await prisma.$transaction(async (tx) => {
      await ensureBreedNameIsAvailable(tx, data.breed_name);

      return await tx.breed.create({ data });
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
export const updateBreed = async (id: number, data: Prisma.breedUpdateInput) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const currentBreed = await tx.breed.findUnique({
        where: { breed_id: id },
        select: { breed_id: true },
      });

      if (!currentBreed) {
        throw breedErrors.breedNotFound(id, "update");
      }

      if (typeof data.breed_name === "string") {
        await ensureBreedNameIsAvailable(tx, data.breed_name, id);
      }

      return await tx.breed.update({
        where: { breed_id: id },
        data,
      });
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      const breedName = typeof data.breed_name === "string" ? data.breed_name : "unknown";
      throw breedErrors.breedNameAlreadyExists(breedName);
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

      return await tx.breed.delete({
        where: { breed_id: id },
      });
    });
  } catch (error) {
    if (isPrismaRecordNotFoundError(error)) {
      throw breedErrors.breedNotFound(id, "delete");
    }

    if (isPrismaForeignKeyConstraintError(error)) {
      throw breedErrors.breedHasRelatedAnimals(id, 1, 1);
    }

    throw error;
  }
};
