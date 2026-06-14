import type { Prisma } from "@prisma/client";
import { createBoar, deleteBoar, updateBoar } from "./boarsCommands";
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

  async create(data: Prisma.boarsUncheckedCreateInput) {
    return await createBoar(data);
  }

  async update(id: number, data: Prisma.boarsUncheckedUpdateInput) {
    return await updateBoar(id, data);
  }

  async delete(id: number) {
    return await deleteBoar(id);
  }

  async checkBoarTagNumberExists(boarTagNumber: string) {
    const boar = await getBoarByNormalizedTagNumber(boarTagNumber);
    return Boolean(boar);
  }
}

export default new BoarsService();
