import { Request, Response} from "express";
import MatingEventsService from "../services/matingEvents.service";

class MatingEventsController {

    async getAll(_: Request, res: Response) {
        const events = await MatingEventsService.getAll();
        res.json(events);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        const event = await MatingEventsService.getById(id);
        if (!event) {
            return res.status(404).json({ message: "Mating event not found" });
        }
        return res.json(event);
    }

    async create(req: Request, res: Response) {
        const data = req.body;
        const newEvent = await MatingEventsService.create(data);
        res.status(201).json(newEvent);
    }

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = req.body;
        const updatedEvent = await MatingEventsService.update(id, data);
        res.json(updatedEvent);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        await MatingEventsService.delete(id);
        res.status(204).send();
    }

    async getAllMatingEventsBySow(req: Request, res: Response) {
        const sowId = Number(req.params.sowId);
        const events = await MatingEventsService.getAllMatingEventsBySow(sowId);
        res.json(events);
    }

    async getAllMatingEventsByBoar(req: Request, res: Response) {
        const boarId = Number(req.params.boarId);
        const events = await MatingEventsService.getAllMatingEventsByBoar(boarId);
        res.json(events);
    }
}

export default new MatingEventsController();