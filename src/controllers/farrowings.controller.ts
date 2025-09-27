import { Request, Response } from "express";
import FarrowingsService from "../services/farrowings.service";

class FarrowingsController {
    async getAll(_: Request, res: Response) {
        const farrowings = await FarrowingsService.getAll();
        res.json(farrowings);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        const farrowing = await FarrowingsService.getById(id);
        if (!farrowing) {
            return res.status(404).json({ message: "Farrowing not found" });
        } else {
            return res.json(farrowing);
        }
    }

    async create(req: Request, res: Response) {
        const data = req.body;
        const newFarrowing = await FarrowingsService.create(data);
        res.status(201).json(newFarrowing);
    }

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = req.body;
        const updated = await FarrowingsService.update(id, data);
        res.json(updated);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        await FarrowingsService.delete(id);
        res.status(204).send();
    }

    async getAllFarrowingsBySow(req: Request, res: Response) {
        const sowId = Number(req.params.sowId);
        const farrowings = await FarrowingsService.getAllFarrowingsBySow(sowId);
        res.json(farrowings);
    }
}

export default new FarrowingsController();