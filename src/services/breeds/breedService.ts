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
    return await createBreed(data);
  }

  /** Updates breed fields through the existence and name-uniqueness workflow. */
  async update(id: number, data: UpdateBreedInput) {
    return await updateBreed(id, data);
  }

  /** Deletes a breed only when relationship checks allow it. */
  async delete(id: number) {
    return await deleteBreed(id);
  }

  /** Checks name availability using the same normalization as breed writes. */
  async checkBreedNameExists(breedName: string) {
    const breed = await getBreedByNormalizedName(breedName);
    return Boolean(breed);
  }
}

export default new BreedService();
