import { Request, Response } from "express";
import FarrowingsService from "../services/farrowings.service";
import logger from '../utils/logger';

class FarrowingsController {
    async getAll(_: Request, res: Response) {
        logger.info("Fetching all farrowings");
        const farrowings = await FarrowingsService.getAll();
        logger.info(`Found ${farrowings.length} farrowings`);
        res.json(farrowings);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        logger.info(`Fetching farrowing with id: ${id}`);
        const farrowing = await FarrowingsService.getById(id);
        if (!farrowing) {
            logger.warn(`Farrowing with id ${id} not found`);
            return res.status(404).json({ message: "Farrowing not found" });
        }
        logger.info(`Farrowing found: ${JSON.stringify(farrowing)}`);
        return res.json(farrowing);
    }

    async create(req: Request, res: Response) {
        const data = req.body;
        logger.info(`Creating farrowing with data: ${JSON.stringify(data)}`);
        const newFarrowing = await FarrowingsService.create(data);
        logger.info(`Farrowing created: ${JSON.stringify(newFarrowing)}`);
        res.status(201).json(newFarrowing);
    }

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = req.body;
        logger.info(`Updating farrowing id ${id} with data: ${JSON.stringify(data)}`);
        const updated = await FarrowingsService.update(id, data);
        logger.info(`Farrowing updated: ${JSON.stringify(updated)}`);
        res.json(updated);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        logger.info(`Deleting farrowing with id: ${id}`);
        await FarrowingsService.delete(id);
        logger.info(`Farrowing with id ${id} deleted`);
        res.status(204).send();
    }

    async getAllFarrowingsBySow(req: Request, res: Response) {
        const sowId = Number(req.params.sowId);
        logger.info(`Fetching all farrowings for sow id: ${sowId}`);
        const farrowings = await FarrowingsService.getAllFarrowingsBySow(sowId);
        logger.info(`Found ${farrowings.length} farrowings for sow id ${sowId}`);
        res.json(farrowings);
    }
}

export default new FarrowingsController();