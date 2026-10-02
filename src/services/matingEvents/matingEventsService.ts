import logger from "../../utils/logger";
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

  /** Creates a mating event and records the committed reproductive operation. */
  async create(data: CreateMatingEventInput) {
    const createdEvent = await createMatingEvent(data);

    logger.info("Created mating event", {
      event: "mating_event.created",
      matingEventId: createdEvent.mating_id,
      sowId: createdEvent.sow_id,
      boarId: createdEvent.boar_id ?? null,
    });

    return createdEvent;
  }

  /** Deletes an eligible mating event and records the restored workflow state. */
  async delete(id: number) {
    const deletedEvent = await deleteMatingEvent(id);

    logger.info("Deleted mating event", {
      event: "mating_event.deleted",
      matingEventId: deletedEvent.mating_id,
      sowId: deletedEvent.sow_id,
    });

    return deletedEvent;
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

  /** Updates pregnancy results and records the completed batch operation. */
  async updatePregnancyResult(matingIds: number[], pregnancyResult: PregnancyResult) {
    const result = await updateMatingEventsPregnancyResult(matingIds, pregnancyResult);

    logger.info("Updated mating event pregnancy result", {
      event: "mating_events.pregnancy_result_updated",
      matingIds,
      pregnancyResult,
      updatedCount: result.count,
    });

    return result;
  }
}

export default new MatingEventsService();
