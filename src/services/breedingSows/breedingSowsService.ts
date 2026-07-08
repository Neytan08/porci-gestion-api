import type { Prisma } from "@prisma/client";
import {
  createBreedingSow,
  deleteBreedingSow,
  type RetireBreedingSowInput,
  retireBreedingSow,
  updateBreedingSow,
} from "./breedingSowsCommands";
import {
  getAllBreedingSows,
  getBreedingSowById,
  getBreedingSowByNormalizedTagNumber,
  getBreedingSowsByStatus,
} from "./breedingSowsQueries";

/**
 * Keeps the public breeding-sows service API stable while delegating
 * persistence concerns to focused query and command modules.
 */
class BreedingSowsService {
  async getAll() {
    return await getAllBreedingSows();
  }

  async getById(id: number) {
    return await getBreedingSowById(id);
  }

  async checkSowTagNumberExists(sowTagNumber: string) {
    const sow = await getBreedingSowByNormalizedTagNumber(sowTagNumber);
    return Boolean(sow);
  }

  async create(data: Prisma.breedingsowsUncheckedCreateInput) {
    return await createBreedingSow(data);
  }

  async update(id: number, data: Prisma.breedingsowsUncheckedUpdateInput) {
    return await updateBreedingSow(id, data);
  }

  async delete(id: number) {
    return await deleteBreedingSow(id);
  }

  async retire(ids: number[], data: RetireBreedingSowInput) {
    return await retireBreedingSow(ids, data);
  }

  async getAllByStatus(status: string) {
    return await getBreedingSowsByStatus(status);
  }
}

export default new BreedingSowsService();
