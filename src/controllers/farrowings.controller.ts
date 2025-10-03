import { Request, Response } from "express";
import FarrowingsService from "../services/farrowings.service";
import logger from '../utils/logger';
import ApiError from '../utils/apiError';
import { farrowingsSchema, farrowingUpdateSchema } from "../schemas_validations/farrowings.schema";

class FarrowingsController {
    async getAll(_: Request, res: Response) {
        const farrowings = await FarrowingsService.getAll();
        logger.info(`Found ${farrowings.length} farrowings`);
        res.json(farrowings);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        const farrowing = await FarrowingsService.getById(id);
        if (!farrowing) {
            logger.warn(`Farrowing with id ${id} not found`);
            throw ApiError.notFound("Farrowing not found");
        }
        logger.info(`Farrowing found: ${JSON.stringify(farrowing)}`);
        return res.json(farrowing);
    }

    async create(req: Request, res: Response) {
        const parseResult = farrowingsSchema.safeParse(req.body);
        if (!parseResult.success) {
            logger.warn("Validation error on create farrowing");
            throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
        }
        const newFarrowing = await FarrowingsService.create(parseResult.data);
        logger.info(`Farrowing created: ${JSON.stringify(newFarrowing)}`);
        res.status(201).json(newFarrowing);
    }

    async update(req: Request, res: Response) {
        const parseResult = farrowingUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
            logger.warn("Validation error on update farrowing");
            throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
        }
        const id = Number(req.params.id);
        const updated = await FarrowingsService.update(id, parseResult.data);
        logger.info(`Farrowing updated: ${JSON.stringify(updated)}`);
        res.json(updated);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        const deleted = await FarrowingsService.delete(id);
        if (!deleted) {
            logger.warn(`Farrowing with id ${id} not found for delete`);
            throw ApiError.notFound(`Farrowing with id ${id} not found`);
        }
        logger.info(`Farrowing with id ${id} deleted`);
        res.status(204).send();
    }

    async getAllFarrowingsBySow(req: Request, res: Response) {
        const sowId = Number(req.params.sowId);
        const farrowings = await FarrowingsService.getAllFarrowingsBySow(sowId);
        if (!farrowings) {
            logger.warn(`No farrowings found for sow id ${sowId}`);
            throw ApiError.notFound("No farrowings found for the given sow");
        }
        logger.info(`Found ${farrowings.length} farrowings for sow id ${sowId}`);
        res.json(farrowings);
    }
}

export default new FarrowingsController();