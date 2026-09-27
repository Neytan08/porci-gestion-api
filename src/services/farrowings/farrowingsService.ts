import { createFarrowing, deleteFarrowing, weanFarrowing } from "./farrowingsCommands";
import { getAllFarrowings, getFarrowingById, getFarrowingsBySow } from "./farrowingsQueries";
import type { CreateFarrowingInput, WeanFarrowingInput } from "./farrowingsTypes";

/**
 * Keeps the public farrowings service API stable while delegating persistence
 * and business rules to focused query and command modules.
 */
class FarrowingsService {
  /** Returns the complete farrowing collection. */
  async getAll() {
    return await getAllFarrowings();
  }

  /** Returns one farrowing by its identifier when it exists. */
  async getById(id: number) {
    return await getFarrowingById(id);
  }

  /** Delegates creation to the transactional reproductive workflow. */
  async create(data: CreateFarrowingInput) {
    return await createFarrowing(data);
  }

  /** Delegates normal weaning to the transactional farrowing workflow. */
  async wean(id: number, data: WeanFarrowingInput) {
    return await weanFarrowing(id, data);
  }

  /** Deletes an eligible unweaned farrowing through its restoration workflow. */
  async delete(id: number) {
    return await deleteFarrowing(id);
  }

  /** Returns the farrowing collection and count for one sow. */
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
