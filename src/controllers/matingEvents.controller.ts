import type { Request, Response } from "express";
import {
  matingEventsSchema,
  matingEventUpdateSchema,
} from "../schemas_validations/matingEvents.schema";
import { matingEventErrors } from "../services/matingEvents/matingEventErrors";
import MatingEventsService from "../services/matingEvents/matingEventsService";
import logger from "../utils/logger";

/**
 * Guards the endpoint against non-integer or non-positive ids before hitting the service layer.
 */
const isPositiveInteger = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

const parsePositiveIdOrThrow = (
  value: unknown,
  buildError: (rawValue: unknown) => Error,
) => {
  const parsedValue = Number(value);

  if (!isPositiveInteger(parsedValue)) {
    throw buildError(value);
  }

  return parsedValue;
};

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
    logger.info("Fetched mating events", { count: events.length });
    res.json(events);
  }

  async getById(req: Request, res: Response) {
    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      matingEventErrors.invalidMatingEventId(rawValue, "retrieve"),
    );
    const event = await MatingEventsService.getById(id);

    if (!event) {
      throw matingEventErrors.matingEventNotFound(id, "retrieve");
    }

    logger.info("Fetched mating event", { matingEventId: id });
    return res.json(event);
  }

  async create(req: Request, res: Response) {
    const parseResult = matingEventsSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw matingEventErrors.invalidCreatePayload(parseResult.error.issues);
    }

    const newEvent = await MatingEventsService.create(parseResult.data);

    logger.info("Created mating event", {
      matingEventId: newEvent.mating_id,
      sowId: newEvent.sow_id,
      boarId: newEvent.boar_id ?? null,
    });

    res.status(201).json(newEvent);
  }

  async update(req: Request, res: Response) {
    const parseResult = matingEventUpdateSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw matingEventErrors.invalidUpdatePayload(parseResult.error.issues);
    }

    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      matingEventErrors.invalidMatingEventId(rawValue, "update"),
    );
    const updatedEvent = await MatingEventsService.update(id, parseResult.data);

    logger.info("Updated mating event", {
      matingEventId: updatedEvent.mating_id,
      sowId: updatedEvent.sow_id,
      boarId: updatedEvent.boar_id ?? null,
    });

    res.json(updatedEvent);
  }

  async delete(req: Request, res: Response) {
    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      matingEventErrors.invalidMatingEventId(rawValue, "delete"),
    );
    const deleted = await MatingEventsService.delete(id);

    logger.info("Deleted mating event", {
      matingEventId: deleted.mating_id,
      sowId: deleted.sow_id,
    });

    res.status(204).send();
  }

  async getAllMatingEventsBySow(req: Request, res: Response) {
    const sowId = parsePositiveIdOrThrow(req.params.sowId, matingEventErrors.invalidSowId);
    const events = await MatingEventsService.getAllMatingEventsBySow(sowId);

    logger.info("Fetched mating events by sow", { sowId, count: events.length });
    res.json(events);
  }

  async getAllMatingEventsByBoar(req: Request, res: Response) {
    const boarId = parsePositiveIdOrThrow(req.params.boarId, matingEventErrors.invalidBoarId);
    const events = await MatingEventsService.getAllMatingEventsByBoar(boarId);

    logger.info("Fetched mating events by boar", { boarId, count: events.length });
    res.json(events);
  }

  async getAllGroupedByPregnancyResult(_: Request, res: Response) {
    const groupedEvents = await MatingEventsService.getAllGroupedByPregnancyResult();

    logger.info("Grouped mating events by pregnancy result", {
      groups: groupedEvents.length,
    });

    res.json(groupedEvents);
  }

  /**
   * Accepts single or bulk pregnancy-result updates and forwards a normalized payload to the service.
   */
  async updatePregnancyResult(req: Request, res: Response) {
    const { mating_ids, pregnancy_result } = req.body ?? {};
    const matingIds = parseMatingIds(mating_ids);

    if (!matingIds) {
      throw matingEventErrors.invalidMatingIds(mating_ids);
    }

    if (typeof pregnancy_result !== "string" || pregnancy_result.trim().length === 0) {
      throw matingEventErrors.invalidPregnancyResult(pregnancy_result);
    }

    const normalizedPregnancyResult = pregnancy_result.trim();

    const result = await MatingEventsService.updatePregnancyResult(
      matingIds,
      normalizedPregnancyResult,
    );

    logger.info("Updated mating event pregnancy result", {
      matingIds,
      pregnancyResult: normalizedPregnancyResult,
      updatedCount: result.count,
    });

    res.json(result);
  }
}

export default new MatingEventsController();
