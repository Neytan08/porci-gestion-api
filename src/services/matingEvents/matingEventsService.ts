import type { Prisma } from "@prisma/client";
import {
  createMatingEvent,
  deleteMatingEvent,
  updateMatingEvent,
  updatePregnancyResult as updateMatingEventsPregnancyResult,
} from "./matingEventsCommands";
import {
  getAllMatingEvents,
  getMatingEventById,
  getMatingEventsByBoar,
  getMatingEventsBySow,
  getMatingEventsGroupedByPregnancyResult,
  getSowByIdWithStatus,
} from "./matingEventsQueries";

/**
 * Keeps the public mating-events service API stable while delegating each responsibility to smaller modules.
 */
class MatingEventsService {
  async getAll() {
    return await getAllMatingEvents();
  }

  async getSowByIdWithStatus(sowId: number) {
    return await getSowByIdWithStatus(sowId);
  }

  async getById(id: number) {
    return await getMatingEventById(id);
  }

  async create(data: Prisma.matingeventsUncheckedCreateInput) {
    return await createMatingEvent(data);
  }

  async update(id: number, data: Prisma.matingeventsUncheckedUpdateInput) {
    return await updateMatingEvent(id, data);
  }

  async delete(id: number) {
    return await deleteMatingEvent(id);
  }

  async getAllMatingEventsBySow(sowId: number) {
    return await getMatingEventsBySow(sowId);
  }

  async getAllMatingEventsByBoar(boarId: number) {
    return await getMatingEventsByBoar(boarId);
  }

  async getAllGroupedByPregnancyResult() {
    return await getMatingEventsGroupedByPregnancyResult();
  }

  async updatePregnancyResult(matingIds: number[], pregnancyResult: string) {
    return await updateMatingEventsPregnancyResult(matingIds, pregnancyResult);
  }
}

export default new MatingEventsService();
