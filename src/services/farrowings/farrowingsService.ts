import type { WeanFarrowingInput } from "../../schemas_validations/farrowings.schema";
import { type CreateFarrowingInput, createFarrowing, deleteFarrowing, weanFarrowing } from "./farrowingsCommands";
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

  async wean(id: number, data: WeanFarrowingInput) {
    return await weanFarrowing(id, data);
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
