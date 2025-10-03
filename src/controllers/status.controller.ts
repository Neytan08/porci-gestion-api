import { Request, Response } from "express";
import StatusService from "../services/status.service";
import logger from "../utils/logger";
import ApiError from "../utils/apiError";
import { statusSchema, statusUpdateSchema } from "../schemas_validations/status.schema";

class StatusController {

  async getAll(_: Request, res: Response) {
    const statuses = await StatusService.getAll();
    logger.info(`Found ${statuses.length} statuses`);
    res.json(statuses);
  }

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const status = await StatusService.getById(id);
    if (!status) {
      logger.warn(`Status with id ${id} not found`);
      throw ApiError.notFound("Status not found");
    }
    logger.info(`Status found: ${JSON.stringify(status)}`);
    res.json(status);
  }

  async create(req: Request, res: Response) {
    const parseResult = statusSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn("Validation on create status");
      throw ApiError.badRequest("Status name is required" + JSON.stringify(parseResult.error.issues));
    }
    logger.info(`Creating status with name: ${parseResult.data}`);
    const newStatus = await StatusService.create(parseResult.data);
    res.status(201).json(newStatus);
  }

  async update(req: Request, res: Response) {
    const parseResult = statusUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn("Validation error on update status");
      throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
    }
    const id = Number(req.params.id);
    const updated = await StatusService.update(id, parseResult.data);
    logger.info(`Status updated: ${JSON.stringify(updated)}`);
    res.json(updated);
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    const deleted = await StatusService.delete(id);
    if (!deleted) {
      logger.warn(`Status with id ${id} not found for delete`);
      throw ApiError.notFound(`Status with id ${id} not found`);
    }
    logger.info(`Status with id ${id} deleted`);
    res.status(204).send();
  }
}

export default new StatusController();