import { Request, Response} from "express";
import MatingEventsService from "../services/matingEvents.service";
import logger from '../utils/logger';
class MatingEventsController {

    async getAll(_: Request, res: Response) {
        logger.info("Fetching all mating events");
        const events = await MatingEventsService.getAll();
        logger.info(`Found ${events.length} mating events`);
        res.json(events);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        logger.info(`Fetching mating event with id: ${id}`);
        const event = await MatingEventsService.getById(id);
        if (!event) {
            logger.warn(`Mating event with id ${id} not found`);
            return res.status(404).json({ message: "Mating event not found" });
        }
        logger.info(`Mating event found: ${JSON.stringify(event)}`);
        return res.json(event);
    }

    async create(req: Request, res: Response) {
        const data = req.body;
        logger.info(`Creating mating event with data: ${JSON.stringify(data)}`);
        const newEvent = await MatingEventsService.create(data);
        logger.info(`Mating event created: ${JSON.stringify(newEvent)}`);
        res.status(201).json(newEvent);
    }

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = req.body;
        logger.info(`Updating mating event id ${id} with data: ${JSON.stringify(data)}`);
        const updatedEvent = await MatingEventsService.update(id, data);
        logger.info(`Mating event updated: ${JSON.stringify(updatedEvent)}`);
        res.json(updatedEvent);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        logger.info(`Deleting mating event with id: ${id}`);
        await MatingEventsService.delete(id);
        logger.info(`Mating event with id ${id} deleted`);
        res.status(204).send();
    }

    async getAllMatingEventsBySow(req: Request, res: Response) {
        const sowId = Number(req.params.sowId);
        logger.info(`Fetching all mating events for sow id: ${sowId}`);
        const events = await MatingEventsService.getAllMatingEventsBySow(sowId);
        logger.info(`Found ${events.length} mating events for sow id ${sowId}`);
        res.json(events);
    }

    async getAllMatingEventsByBoar(req: Request, res: Response) {
        const boarId = Number(req.params.boarId);
        logger.info(`Fetching all mating events for boar id: ${boarId}`);
        const events = await MatingEventsService.getAllMatingEventsByBoar(boarId);
        logger.info(`Found ${events.length} mating events for boar id ${boarId}`);
        res.json(events);
    }
}

export default new MatingEventsController();