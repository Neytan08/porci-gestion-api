import logger from "../../utils/logger";
import {
  createBreedingSow,
  deleteBreedingSow,
  retireBreedingSow,
  updateBreedingSow,
  validateBreedingSowStatusChange,
} from "./breedingSowsCommands";
import {
  getAllBreedingSows,
  getBreedingSowById,
  getBreedingSowByNormalizedTagNumber,
  getBreedingSowsByStatus,
} from "./breedingSowsQueries";
import type {
  BREEDING_SOW_STATUSES,
  BreedingSowStatus,
  ManuallyAssignableBreedingSowStatus,
} from "./breedingSowsRules";
import type {
  CreateBreedingSowInput,
  RetireBreedingSowInput,
  UpdateBreedingSowInput,
} from "./breedingSowsTypes";

/**
 * Keeps the public breeding-sows service API stable while delegating
 * persistence concerns to focused query and command modules.
 */
class BreedingSowsService {
  /** Returns all active breeding sows. */
  async getAll() {
    return await getAllBreedingSows();
  }

  /** Returns one active breeding sow by identifier. */
  async getById(id: number) {
    return await getBreedingSowById(id);
  }

  /** Checks normalized sow-tag availability. */
  async checkSowTagNumberExists(sowTagNumber: string) {
    const sow = await getBreedingSowByNormalizedTagNumber(sowTagNumber);
    return Boolean(sow);
  }

  /** Registers a breeding sow with approved imported-history fields. */
  async create(data: CreateBreedingSowInput) {
    const createdSow = await createBreedingSow(data);

    logger.info("Created breeding sow", {
      event: "breeding_sow.created",
      sowId: createdSow.sow_id,
      sowTagNumber: createdSow.sow_tag_number,
      breedId: createdSow.breed_id,
      status: createdSow.status,
    });

    return createdSow;
  }

  /** Updates the editable profile fields of an active breeding sow. */
  async update(id: number, data: UpdateBreedingSowInput) {
    const updatedSow = await updateBreedingSow(id, data);

    logger.info("Updated breeding sow", {
      event: "breeding_sow.updated",
      sowId: updatedSow.sow_id,
      sowTagNumber: updatedSow.sow_tag_number,
      breedId: updatedSow.breed_id,
      status: updatedSow.status,
    });

    return updatedSow;
  }

  /** Validates a proposed status change without persisting it. */
  async validateStatusChange(id: number, status: ManuallyAssignableBreedingSowStatus) {
    const result = await validateBreedingSowStatusChange(id, status);

    logger.debug("Validated breeding sow status change", {
      event: "breeding_sow.status_change_validated",
      sowId: id,
      status,
    });

    return result;
  }

  /** Permanently deletes an active sow without reproductive history. */
  async delete(id: number) {
    const deletedSow = await deleteBreedingSow(id);

    logger.info("Deleted breeding sow", {
      event: "breeding_sow.deleted",
      sowId: deletedSow.sow_id,
      sowTagNumber: deletedSow.sow_tag_number,
    });

    return deletedSow;
  }

  /** Retires active sows and closes their open reproductive workflows atomically. */
  async retire(ids: number[], data: RetireBreedingSowInput) {
    const result = await retireBreedingSow(ids, data);

    logger.info("Retired breeding sows", {
      event: "breeding_sows.retired",
      sowIds: ids,
      retiredCount: result.count,
      removalDate: data.removal_date ?? null,
    });

    return result;
  }

  /** Returns active breeding sows matching a canonical status. */
  async getAllBreedingSowsByStatus(
    status: Exclude<BreedingSowStatus, typeof BREEDING_SOW_STATUSES.retirada>,
  ) {
    return await getBreedingSowsByStatus(status);
  }
}

export default new BreedingSowsService();
