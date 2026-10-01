import type { Request, Response } from "express";
import {
  matingEventPregnancyResultUpdateSchema,
  matingEventsSchema,
} from "../schemas_validations/matingEvents.schema";
import { matingEventErrors } from "../services/matingEvents/matingEventErrors";
import MatingEventsService from "../services/matingEvents/matingEventsService";
import { parsePositiveIdOrThrow, parsePositiveIdsOrThrow } from "../utils/requestParsing";

class MatingEventsController {
  async getAll(_: Request, res: Response) {
    const events = await MatingEventsService.getAll();
    return res.json(events);
  }

  async getById(req: Request, res: Response) {
    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      matingEventErrors.invalidMatingEventId(rawValue, "retrieve"),
    );
    const event = await MatingEventsService.getById(id);

    if (!event) {
      throw matingEventErrors.matingEventNotFound(id, "retrieve");
    }

    return res.json(event);
  }

  async create(req: Request, res: Response) {
    const parseResult = matingEventsSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw matingEventErrors.invalidCreatePayload(parseResult.error.issues);
    }

    const newEvent = await MatingEventsService.create(parseResult.data);
    return res.status(201).json(newEvent);
  }

  async delete(req: Request, res: Response) {
    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      matingEventErrors.invalidMatingEventId(rawValue, "delete"),
    );
    await MatingEventsService.delete(id);
    return res.status(204).send();
  }

  async getAllMatingEventsBySow(req: Request, res: Response) {
    const sowId = parsePositiveIdOrThrow(req.params.sowId, matingEventErrors.invalidSowId);
    const events = await MatingEventsService.getAllMatingEventsBySow(sowId);

    return res.json(events);
  }

  async getAllMatingEventsByBoar(req: Request, res: Response) {
    const boarId = parsePositiveIdOrThrow(req.params.boarId, matingEventErrors.invalidBoarId);
    const events = await MatingEventsService.getAllMatingEventsByBoar(boarId);

    return res.json(events);
  }

  async getAllGroupedByPregnancyResult(_: Request, res: Response) {
    const groupedEvents = await MatingEventsService.getAllGroupedByPregnancyResult();

    return res.json(groupedEvents);
  }

  /**
   * Accepts single or bulk pregnancy-result updates and forwards a normalized payload to the service.
   */
  async updatePregnancyResult(req: Request, res: Response) {
    const parseResult = matingEventPregnancyResultUpdateSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw matingEventErrors.invalidPregnancyUpdatePayload(parseResult.error.issues);
    }

    const matingIds = parsePositiveIdsOrThrow(
      parseResult.data.mating_ids,
      matingEventErrors.invalidMatingIds,
    );

    const result = await MatingEventsService.updatePregnancyResult(
      matingIds,
      parseResult.data.pregnancy_result,
    );

    return res.json(result);
  }
}

export default new MatingEventsController();
