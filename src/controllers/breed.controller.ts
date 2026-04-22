import type { Request, Response } from "express";
import { breedSchema, breedUpdateSchema } from "../schemas_validations/breeds.schema";
import BreedService from "../services/breed.service";
import ApiError from "../utils/apiError";
import logger from "../utils/logger";

class BreedController {
  async getAll(_: Request, res: Response) {
    const breeds = await BreedService.getAll();
    logger.info(`Found ${breeds.length} breeds`);
    res.json(breeds);
  }

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const breed = await BreedService.getById(id);
    if (!breed) {
      logger.warn(`Breed with id ${id} not found`);
      throw ApiError.notFound("Breed not found");
    }
    logger.info(`breed found: ${JSON.stringify(breed)}`);
    res.json(breed);
  }

  async create(req: Request, res: Response) {
    const parseResult = breedSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn("Validation on create breed");
      throw ApiError.badRequest(
        "Breed name is required" + JSON.stringify(parseResult.error.issues),
      );
    }
    logger.info(`Creating breed with name: ${parseResult.data}`);
    const newbreed = await BreedService.create(parseResult.data);
    res.status(201).json(newbreed);
  }

  async update(req: Request, res: Response) {
    const parseResult = breedUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn("Validation error on update breed");
      throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
    }
    const id = Number(req.params.id);
    const updated = await BreedService.update(id, parseResult.data);
    logger.info(`Breed updated: ${JSON.stringify(updated)}`);
    res.json(updated);
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    const deleted = await BreedService.delete(id);
    if (!deleted) {
      logger.warn(`Breed with id ${id} not found for delete`);
      throw ApiError.notFound(`Breed with id ${id} not found`);
    }
    logger.info(`Breed with id ${id} deleted`);
    res.status(204).send();
  }
}

export default new BreedController();
