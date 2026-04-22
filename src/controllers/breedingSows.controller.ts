import type { Request, Response } from "express";
import {
  breedingSowsschema,
  breedingSowsUpdateSchema,
} from "../schemas_validations/breedingSows.schema";
import BreedingSowsService from "../services/breedingSows.service";
import ApiError from "../utils/apiError";
import logger from "../utils/logger";

class BreedingSowsController {
  async getAll(_: Request, res: Response) {
    const sows = await BreedingSowsService.getAll();
    logger.info(`Found ${sows.length} breeding sows`);
    res.json(sows);
  }

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const sow = await BreedingSowsService.getById(id);
    if (!sow) {
      logger.warn(`Breeding sow with id ${id} not found`);
      throw ApiError.notFound("Breeding sow not found");
    }
    logger.info(`Breeding sow found: ${JSON.stringify(sow)}`);
    return res.json(sow);
  }

  async create(req: Request, res: Response) {
    const parseResult = breedingSowsschema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn("Validation error on create breeding sow");
      throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
    }
    const newSow = await BreedingSowsService.create(parseResult.data);
    logger.info(`Breeding sow created: ${JSON.stringify(newSow)}`);
    res.status(201).json(newSow);
  }

  async update(req: Request, res: Response) {
    const parseResult = breedingSowsUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn("Validation error on update breeding sow");
      throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
    }
    const id = Number(req.params.id);
    const updatedSow = await BreedingSowsService.update(id, parseResult.data);
    logger.info(`Breeding sow updated: ${JSON.stringify(updatedSow)}`);
    res.json(updatedSow);
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    const deleted = await BreedingSowsService.delete(id);
    if (!deleted) {
      logger.warn(`Breeding sow with id ${id} not found for delete`);
      throw ApiError.notFound(`Breeding sow with id ${id} not found`);
    }
    logger.info(`Breeding sow with id ${id} deleted`);
    res.status(204).send();
  }

  async getAllByStatusId(req: Request, res: Response) {
    const statusId = Number(req.params.statusId);
    const sows = await BreedingSowsService.getAllByStatusId(statusId);
    if (!sows) {
      logger.warn(`No breeding sows found with status id ${statusId}`);
      throw ApiError.notFound("No breeding sows found for the given status");
    }
    logger.info(`Found ${sows.length} breeding sows with status id ${statusId}`);
    res.json(sows);
  }

  // async countFarrowingsBySow(req: Request, res: Response) {
  //   const sowId = Number(req.params.sowId);
  //   const count = await BreedingSowsService.countFarrowingsBySow(sowId);
  //   logger.info(`Sow id ${sowId} has ${count} farrowings`);
  //   res.json({ sowId, farrowingCount: count });
  // }
}

export default new BreedingSowsController();
