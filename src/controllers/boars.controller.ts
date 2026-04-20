import type { Request, Response } from "express";
import { boarsSchema, boarsUpdateSchema } from "../schemas_validations/boars.schema";
import BoarsService from "../services/boars.service";
import ApiError from "../utils/apiError";
import { GetAge } from "../utils/getAgeFromDate";
import logger from "../utils/logger";

class BoarsController {
  async getAll(_: Request, res: Response) {
    const boars = await BoarsService.getAll();
    const boarsWithAge = boars.map((boar: any) => {
      const birthDate = new Date(boar.birth_date);
      const { years, months } = GetAge.calculateAge(birthDate);
      return { ...boar, age: { years: years, months: months } };
    });
    logger.info(`Found ${boars.length} boars`);
    res.json(boarsWithAge);
  }

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const boar = await BoarsService.getById(id);
    if (!boar) {
      logger.warn(`Boar with id ${id} not found`);
      throw ApiError.notFound("Boar not found");
    }
    const birthDate = new Date(boar.birth_date);
    const { years, months } = GetAge.calculateAge(birthDate);
    logger.info(`Boar found: ${JSON.stringify(boar)}`);
    return res.json({ ...boar, age: { years: years, months: months } });
  }

  async create(req: Request, res: Response) {
    const parseResult = boarsSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn("Validation error on create boar");
      throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
    }
    const newBoar = await BoarsService.create(parseResult.data);
    logger.info(`Boar created: ${JSON.stringify(newBoar)}`);
    res.status(201).json({ newBoar });
  }

  async update(req: Request, res: Response) {
    const parseResult = boarsUpdateSchema.safeParse(req.body);
    if (!parseResult.success) {
      logger.warn("Validation error on update boar");
      throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
    }
    const id = Number(req.params.id);
    const updatedBoar = await BoarsService.update(id, parseResult.data);
    logger.info(`Boar updated: ${JSON.stringify(updatedBoar)}`);
    res.json({ updatedBoar });
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
