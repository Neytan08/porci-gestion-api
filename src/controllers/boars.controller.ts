import { Request, Response } from "express";
import BoarsService from "../services/boars.service";
import logger from '../utils/logger';
import ApiError from '../utils/apiError';
import { z } from "zod";

// Boars schema validation using Zod
const boarsSchema = z.object({
  boar_tag_number: z.string().min(1),
  weight: z.number().positive().optional(),
  length: z.number().positive().optional(),
  breed: z.string().min(1),
  entry_date: z.string().refine(date => !isNaN(Date.parse(date)), { message: "Invalid entry_date format" }),
  removal_date: z.string().refine(date => !isNaN(Date.parse(date)), { message: "Invalid removal_date format" }).optional(),
  removal_reason: z.string().optional()
});

class BoarsController {

  async getAll(_: Request, res: Response) {
    const boars = await BoarsService.getAll();
    logger.info(`Found ${boars.length} boars`);
    res.json(boars);
  }

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const boar = await BoarsService.getById(id);
    if (!boar) {
      logger.warn(`Boar with id ${id} not found`);
      throw ApiError.notFound("Boar not found");
    }
    logger.info(`Boar found: ${JSON.stringify(boar)}`);
    return res.json(boar);
  }

  async create(req: Request, res: Response) {
    const parseResult = boarsSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn("Validation error on create boar");
      throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
    }
    const newBoar = await BoarsService.create(parseResult.data);
    logger.info(`Boar created: ${JSON.stringify(newBoar)}`);
    res.status(201).json(newBoar);
  }

  async update(req: Request, res: Response) {
    const parseResult = boarsSchema.partial().safeParse(req.body);
    if (!parseResult.success) {
      logger.warn("Validation error on update boar");
      throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
    }
    const id = Number(req.params.id);
    const updatedBoar = await BoarsService.update(id, parseResult.data);
    logger.info(`Boar updated: ${JSON.stringify(updatedBoar)}`);
    res.json(updatedBoar);
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    const deleted = await BoarsService.delete(id);
    if (!deleted) {
      logger.warn(`Boar with id ${id} not found for delete`);
      throw ApiError.notFound(`Boar with id ${id} not found`);
    }
    logger.info(`Boar with id ${id} deleted`);
    res.status(204).send();
  }
}

export default new BoarsController();