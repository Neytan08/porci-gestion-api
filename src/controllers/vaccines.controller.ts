import { Request, Response } from "express";
import VaccinesService from "../services/vaccines.service";
import logger from '../utils/logger';
import ApiError from '../utils/apiError';
import { z } from "zod";

// Vaccine schema validation using Zod
const vaccineSchema = z.object({
  sow_id: z.number().int().positive(),
  boar_id: z.number().int().positive(),
  vaccine_id: z.number().int().positive(),
  administration_date: z.string().refine(date => !isNaN(Date.parse(date)), { message: "Invalid administration_date format" }),
  dose: z.string().max(50),
  administration_route: z.string().max(50),
  administered_by: z.string().max(100),
  note: z.string().optional()
});

class VaccinesController {

    async getAll(_: Request, res: Response) {
        const vaccines = await VaccinesService.getAll();
        logger.info(`Found ${vaccines.length} vaccines`);
        res.json(vaccines);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        const vaccine = await VaccinesService.getById(id);
        if (!vaccine) {
            logger.warn(`Vaccine with id ${id} not found`);
            throw ApiError.notFound("Vaccine not found");
        }
        logger.info(`Vaccine found: ${JSON.stringify(vaccine)}`);
        return res.json(vaccine);
    }

    async create(req: Request, res: Response) {
        const parseResult = vaccineSchema.safeParse(req.body);
        if (!parseResult.success) {
            logger.warn("Validation error on create vaccine");
            throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
        }
        const newVaccine = await VaccinesService.create(parseResult.data);
        logger.info(`Vaccine created: ${JSON.stringify(newVaccine)}`);
        res.status(201).json(newVaccine);
    }

    async update(req: Request, res: Response) {
        const parseResult = vaccineSchema.partial().safeParse(req.body);
        if (!parseResult.success) {
            logger.warn("Validation error on update vaccine");
            throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
        }
        const id = Number(req.params.id);
        const updatedVaccine = await VaccinesService.update(id, parseResult.data);
        logger.info(`Vaccine updated: ${JSON.stringify(updatedVaccine)}`);
        res.json(updatedVaccine);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        const deleted = await VaccinesService.delete(id);
        if (!deleted) {
            logger.warn(`Vaccine with id ${id} not found for delete`);
            throw ApiError.notFound(`Vaccine with id ${id} not found`);
        }
        logger.info(`Vaccine with id ${id} deleted`);
        res.status(204).send();
    }

    async getVaccinesByCowId(req: Request, res: Response) {
        const cowId = Number(req.params.cowId);
        const vaccines = await VaccinesService.getVaccinesByCowId(cowId);
        if (!vaccines) {
            logger.warn(`No vaccines found for cow id ${cowId}`);
            throw ApiError.notFound(`No vaccines found for cow id ${cowId}`);
        }
        logger.info(`Found ${vaccines.length} vaccines for cow id ${cowId}`);
        res.json(vaccines);
    }

    async getVaccinesByBoarId(req: Request, res: Response) {
        const boarId = Number(req.params.boarId);
        const vaccines = await VaccinesService.getVaccinesByBoarId(boarId);
        if (!vaccines) {
            logger.warn(`No vaccines found for boar id ${boarId}`);
            throw ApiError.notFound(`No vaccines found for boar id ${boarId}`);
        }
        logger.info(`Found ${vaccines.length} vaccines for boar id ${boarId}`);
        res.json(vaccines);
    }
}

export default new VaccinesController();