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
import {
  BREEDING_SOW_STATUSES,
  type BreedingSowStatus,
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
    return await createBreedingSow(data);
  }

  /** Updates the editable profile fields of an active breeding sow. */
  async update(id: number, data: UpdateBreedingSowInput) {
    return await updateBreedingSow(id, data);
  }

  /** Validates a proposed status change without persisting it. */
  async validateStatusChange(
    id: number,
    status: Exclude<BreedingSowStatus, typeof BREEDING_SOW_STATUSES.retirada>,
  ) {
    return await validateBreedingSowStatusChange(id, status);
  }

  /** Permanently deletes an active sow without reproductive history. */
  async delete(id: number) {
    return await deleteBreedingSow(id);
  }

  /** Retires active sows and closes their open reproductive workflows atomically. */
  async retire(ids: number[], data: RetireBreedingSowInput) {
    return await retireBreedingSow(ids, data);
  }

  /** Returns active breeding sows matching a canonical status. */
  async getAllBreedingSowsByStatus(
    status: Exclude<BreedingSowStatus, typeof BREEDING_SOW_STATUSES.retirada>,
  ) {
    return await getBreedingSowsByStatus(status);
  }
}

export default new BreedingSowsService();
