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

  async create(data: CreateBoarInput) {
    return await createBoar(data);
  }

  async update(id: number, data: UpdateBoarInput) {
    return await updateBoar(id, data);
  }

  async delete(id: number) {
    return await deleteBoar(id);
  }

  async retire(ids: number[], data: RetireBoarInput) {
    return await retireBoar(ids, data);
  }

  async checkBoarTagNumberExists(boarTagNumber: string) {
    const boar = await getBoarByNormalizedTagNumber(boarTagNumber);
    return Boolean(boar);
  }
}

export default new BoarsService();
