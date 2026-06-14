import type { Prisma } from "@prisma/client";
import { createBreed, deleteBreed, updateBreed } from "./breedsCommands";
import { getAllBreeds, getBreedById, getBreedByNormalizedName } from "./breedsQueries";

/**
 * Keeps the public breed service API stable while delegating domain validation
 * and persistence operations to focused modules.
 */
class BreedService {
  async getAll() {
    return await getAllBreeds();
  }

  async getById(id: number) {
    return await getBreedById(id);
  }

  async create(data: Prisma.breedCreateInput) {
    return await createBreed(data);
  }

  async update(id: number, data: Prisma.breedUpdateInput) {
    return await updateBreed(id, data);
  }

  async delete(id: number) {
    return await deleteBreed(id);
  }

  async checkBreedNameExists(breedName: string) {
    const breed = await getBreedByNormalizedName(breedName);
    return Boolean(breed);
  }
}

export default new BreedService();
