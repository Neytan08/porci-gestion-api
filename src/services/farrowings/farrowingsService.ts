import type { Prisma } from "@prisma/client";
import { type CreateFarrowingInput, createFarrowing, deleteFarrowing, updateFarrowing } from "./farrowingsCommands";
import { getAllFarrowings, getFarrowingById, getFarrowingsBySow } from "./farrowingsQueries";

/**
 * Keeps the public farrowings service API stable while delegating persistence
 * and business rules to focused query and command modules.
 */
class FarrowingsService {
  async getAll() {
    return await getAllFarrowings();
  }

  async getById(id: number) {
    return await getFarrowingById(id);
  }

  async create(data: CreateFarrowingInput) {
    return await createFarrowing(data);
  }

  async update(id: number, data: Prisma.farrowingsUncheckedUpdateInput) {
    return await updateFarrowing(id, data);
  }

  async delete(id: number) {
    return await deleteFarrowing(id);
  }

  async getAllFarrowingsBySow(sowId: number) {
    const farrowings = await getFarrowingsBySow(sowId);

    return {
      sowId,
      count: farrowings.length,
      farrowings,
    };
  }
}

export default new FarrowingsService();
