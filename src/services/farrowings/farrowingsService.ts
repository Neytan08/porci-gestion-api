import logger from "../../utils/logger";
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
    const createdFarrowing = await createFarrowing(data);

    logger.info("Created farrowing", {
      event: "farrowing.created",
      farrowingId: createdFarrowing.farrowing_id,
      sowId: createdFarrowing.sow_id,
      matingId: createdFarrowing.mating_id,
    });

    return createdFarrowing;
  }

  /** Delegates normal weaning to the transactional farrowing workflow. */
  async wean(id: number, data: WeanFarrowingInput) {
    const weanedFarrowing = await weanFarrowing(id, data);

    logger.info("Weaned farrowing", {
      event: "farrowing.weaned",
      farrowingId: weanedFarrowing.farrowing_id,
      sowId: weanedFarrowing.sow_id,
      weanedDate: weanedFarrowing.weaned_date,
      weanedPiglets: weanedFarrowing.weaned_piglets,
    });

    return weanedFarrowing;
  }

  /** Deletes an eligible unweaned farrowing through its restoration workflow. */
  async delete(id: number) {
    const deletedFarrowing = await deleteFarrowing(id);

    logger.info("Deleted farrowing", {
      event: "farrowing.deleted",
      farrowingId: deletedFarrowing.farrowing_id,
      sowId: deletedFarrowing.sow_id,
      matingId: deletedFarrowing.mating_id,
    });

    return deletedFarrowing;
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
