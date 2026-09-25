import {
  createMatingEvent,
  deleteMatingEvent,
  updatePregnancyResult as updateMatingEventsPregnancyResult,
} from "./matingEventsCommands";
import {
  getAllMatingEvents,
  getMatingEventById,
  getMatingEventsByBoar,
  getMatingEventsBySow,
  getMatingEventsGroupedByPregnancyResult,
} from "./matingEventsQueries";
import type { CreateMatingEventInput } from "./matingEventsTypes";
import type { PregnancyResult } from "./pregnancyRules";

/**
 * Keeps the public mating-events service API stable while delegating each responsibility to smaller modules.
 */
class MatingEventsService {
  async getAll() {
    return await getAllMatingEvents();
  }

  async getById(id: number) {
    return await getMatingEventById(id);
  }

  async create(data: CreateMatingEventInput) {
    return await createMatingEvent(data);
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

  async updatePregnancyResult(matingIds: number[], pregnancyResult: PregnancyResult) {
    return await updateMatingEventsPregnancyResult(matingIds, pregnancyResult);
  }
}

export default new MatingEventsService();
