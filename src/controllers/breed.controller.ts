import type { Request, Response } from "express";
import { breedSchema, breedUpdateSchema } from "../schemas_validations/breeds.schema";
import { breedErrors } from "../services/breeds/breedErrors";
import BreedService from "../services/breeds/breedService";
import logger from "../utils/logger";
import { parsePositiveIdOrThrow } from "../utils/requestParsing";

class BreedController {
  /** Responds with the breed catalog and logs its size. */
  async getAll(_: Request, res: Response) {
    const breeds = await BreedService.getAll();
    logger.info("Fetched breeds", { count: breeds.length });
    res.json(breeds);
  }

  /** Resolves a requested breed or returns the entity-specific not-found error. */
  async getById(req: Request, res: Response) {
    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      breedErrors.invalidBreedId(rawValue, "retrieve"),
    );
    const breed = await BreedService.getById(id);

    if (!breed) {
      throw breedErrors.breedNotFound(id, "retrieve");
    }

    logger.info("Fetched breed", { breedId: id });
    res.json(breed);
  }

  /** Validates breed creation input and responds with the created record. */
  async create(req: Request, res: Response) {
    const parseResult = breedSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw breedErrors.invalidCreatePayload(parseResult.error.issues);
    }

    const newBreed = await BreedService.create(parseResult.data);
    logger.info("Created breed", {
      breedId: newBreed.breed_id,
      breedName: newBreed.breed_name,
    });
    res.status(201).json(newBreed);
  }

  /** Validates a partial breed update and responds with the resulting record. */
  async update(req: Request, res: Response) {
    const parseResult = breedUpdateSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw breedErrors.invalidUpdatePayload(parseResult.error.issues);
    }

    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      breedErrors.invalidBreedId(rawValue, "update"),
    );
    const updated = await BreedService.update(id, parseResult.data);
    logger.info("Updated breed", {
      breedId: updated.breed_id,
      breedName: updated.breed_name,
    });
    res.json(updated);
  }

  /** Requests breed deletion and returns an empty success response. */
  async delete(req: Request, res: Response) {
    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      breedErrors.invalidBreedId(rawValue, "delete"),
    );
    const deleted = await BreedService.delete(id);

    logger.info("Deleted breed", {
      breedId: deleted.breed_id,
      breedName: deleted.breed_name,
    });
    res.status(204).send();
  }
}

export default new BreedController();
