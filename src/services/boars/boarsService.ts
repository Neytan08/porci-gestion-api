import logger from "../../utils/logger";
import type { CreateBoarInput, RetireBoarInput, UpdateBoarInput } from "./boarsTypes";
import {
  createBoar,
  deleteBoar,
  retireBoar,
  updateBoar,
} from "./boarsCommands";
import { getAllBoars, getBoarById, getBoarByNormalizedTagNumber } from "./boarsQueries";

/**
 * Keeps the public boars service API stable while delegating queries and
 * commands to smaller modules.
 */
class BoarsService {
  async getAll() {
    return await getAllBoars();
  }

  async getById(id: number) {
    return await getBoarById(id);
  }

  /** Creates a boar and records the committed business operation. */
  async create(data: CreateBoarInput) {
    const createdBoar = await createBoar(data);

    logger.info("Created boar", {
      event: "boar.created",
      boarId: createdBoar.boar_id,
      boarTagNumber: createdBoar.boar_tag_number,
      breedId: createdBoar.breed_id,
    });

    return createdBoar;
  }

  /** Updates a boar and records the committed business operation. */
  async update(id: number, data: UpdateBoarInput) {
    const updatedBoar = await updateBoar(id, data);

    logger.info("Updated boar", {
      event: "boar.updated",
      boarId: updatedBoar.boar_id,
      boarTagNumber: updatedBoar.boar_tag_number,
      breedId: updatedBoar.breed_id,
    });

    return updatedBoar;
  }

  /** Deletes an eligible boar and records the committed business operation. */
  async delete(id: number) {
    const deletedBoar = await deleteBoar(id);

    logger.info("Deleted boar", {
      event: "boar.deleted",
      boarId: deletedBoar.boar_id,
      boarTagNumber: deletedBoar.boar_tag_number,
    });

    return deletedBoar;
  }

  /** Retires eligible boars and records the completed batch operation. */
  async retire(ids: number[], data: RetireBoarInput) {
    const result = await retireBoar(ids, data);

    logger.info("Retired boars", {
      event: "boars.retired",
      boarIds: ids,
      retiredCount: result.count,
      removalDate: data.removal_date ?? null,
    });

    return result;
  }

  async checkBoarTagNumberExists(boarTagNumber: string) {
    const boar = await getBoarByNormalizedTagNumber(boarTagNumber);
    return Boolean(boar);
  }
}

export default new BoarsService();
