import type { Request, Response } from "express";
import {
  matingEventsSchema,
  matingEventUpdateSchema,
} from "../schemas_validations/matingEvents.schema";
import MatingEventsService from "../services/matingEvents/matingEventsService";
import ApiError from "../utils/apiError";
import logger from "../utils/logger";

/**
 * Guards the endpoint against non-integer or non-positive ids before hitting the service layer.
 */
const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/**
 * Normalizes a single id or an id list into the deduplicated batch format expected by the service.
 */
const parseMatingIds = (value: unknown) => {
  const rawIds = Array.isArray(value) ? value : [value];

  if (rawIds.length === 0 || !rawIds.every(isPositiveInteger)) {
    return null;
  }

  return Array.from(new Set(rawIds));
};

class MatingEventsController {
  async getAll(_: Request, res: Response) {
    const events = await MatingEventsService.getAll();
    logger.info(`Found ${events.length} mating events`);
    res.json(events);
  }

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const event = await MatingEventsService.getById(id);
    if (!event) {
      logger.warn(`Mating event with id ${id} not found`);
      throw ApiError.notFound("Mating event not found");
    }
    logger.info(`Mating event found: ${JSON.stringify(event)}`);
    return res.json(event);
  }

  async create(req: Request, res: Response) {
    const parseResult = matingEventsSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn("Validation error on create mating event");
      throw ApiError.badRequest(`Validation error: ${JSON.stringify(parseResult.error.issues)}`);
    }
    const newEvent = await MatingEventsService.create(parseResult.data);
    logger.info(`Mating event created: ${JSON.stringify(newEvent)}`);
    res.status(201).json(newEvent);
  }

  async update(req: Request, res: Response) {
    const parseResult = matingEventUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn("Validation error on update mating event");
      throw ApiError.badRequest(`Validation error: ${JSON.stringify(parseResult.error.issues)}`);
    }
    const id = Number(req.params.id);
    const updatedEvent = await MatingEventsService.update(id, parseResult.data);
    logger.info(`Mating event updated: ${JSON.stringify(updatedEvent)}`);
    res.json(updatedEvent);
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    const deleted = await MatingEventsService.delete(id);
    if (!deleted) {
      logger.warn(`Mating event with id ${id} not found for delete`);
      throw ApiError.notFound(`Mating event with id ${id} not found`);
    }
    logger.info(`Mating event with id ${id} deleted`);
    res.status(204).send();
  }

  async getAllMatingEventsBySow(req: Request, res: Response) {
    const sowId = Number(req.params.sowId);
    const events = await MatingEventsService.getAllMatingEventsBySow(sowId);
    if (!events) {
      logger.warn(`No mating events found for sow id ${sowId}`);
      throw ApiError.notFound("No mating events found for the given sow");
    }
    logger.info(`Found ${events.length} mating events for sow id ${sowId}`);
    res.json(events);
  }

  async getAllMatingEventsByBoar(req: Request, res: Response) {
    const boarId = Number(req.params.boarId);
    const events = await MatingEventsService.getAllMatingEventsByBoar(boarId);
    if (!events) {
      logger.warn(`No mating events found for boar id ${boarId}`);
      throw ApiError.notFound("No mating events found for the given boar");
    }
    logger.info(`Found ${events.length} mating events for boar id ${boarId}`);
    res.json(events);
  }

  async getAllGroupedByPregnancyResult(_: Request, res: Response) {
    const groupedEvents = await MatingEventsService.getAllGroupedByPregnancyResult();
    logger.info(`Grouped mating events by pregnancy result`);
    res.json(groupedEvents);
  }

  /**
   * Accepts single or bulk pregnancy-result updates and forwards a normalized payload to the service.
   */
  async updatePregnancyResult(req: Request, res: Response) {
    const { mating_ids, pregnancy_result } = req.body ?? {};
    const matingIds = parseMatingIds(mating_ids);

    if (!matingIds) {
      logger.warn("Validation error on update pregnancy result");
      throw ApiError.badRequest(
        "Validation error: mating_ids must be a positive integer or an array of positive integers",
      );
    }

    if (typeof pregnancy_result !== "string" || pregnancy_result.trim().length === 0) {
      logger.warn("Validation error on update pregnancy result");
      throw ApiError.badRequest("Validation error: pregnancy_result must be a string");
    }

    const result = await MatingEventsService.updatePregnancyResult(
      matingIds,
      pregnancy_result.trim(),
    );
    logger.info(`Updated pregnancy result for mating events with ids: ${matingIds.join(", ")}`);
    res.json(result);
  }
}

export default new MatingEventsController();
