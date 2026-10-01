import logger from "../../utils/logger";
import { createBreed, deleteBreed, updateBreed } from "./breedsCommands";
import { getAllBreeds, getBreedById, getBreedByNormalizedName } from "./breedsQueries";
import type { CreateBreedInput, UpdateBreedInput } from "./breedTypes";

/**
 * Exposes breed operations through queries and domain commands.
 */
class BreedService {
  /** Returns the breed catalog. */
  async getAll() {
    return await getAllBreeds();
  }

  /** Returns a breed when present, leaving HTTP not-found handling to the caller. */
  async getById(id: number) {
    return await getBreedById(id);
  }

  /** Creates a breed through the name-uniqueness workflow. */
  async create(data: CreateBreedInput) {
    const createdBreed = await createBreed(data);

    logger.info("Created breed", {
      event: "breed.created",
      breedId: createdBreed.breed_id,
      breedName: createdBreed.breed_name,
    });

    return createdBreed;
  }

  /** Updates breed fields through the existence and name-uniqueness workflow. */
  async update(id: number, data: UpdateBreedInput) {
    const updatedBreed = await updateBreed(id, data);

    logger.info("Updated breed", {
      event: "breed.updated",
      breedId: updatedBreed.breed_id,
      breedName: updatedBreed.breed_name,
    });

    return updatedBreed;
  }

  /** Deletes a breed only when relationship checks allow it. */
  async delete(id: number) {
    const deletedBreed = await deleteBreed(id);

    logger.info("Deleted breed", {
      event: "breed.deleted",
      breedId: deletedBreed.breed_id,
      breedName: deletedBreed.breed_name,
    });

    return deletedBreed;
  }

  /** Checks name availability using the same normalization as breed writes. */
  async checkBreedNameExists(breedName: string) {
    const breed = await getBreedByNormalizedName(breedName);
    return Boolean(breed);
  }
}

export default new BreedService();
