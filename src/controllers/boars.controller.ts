import { Request, Response } from "express";
import BoarsService from "../services/boars.service";

class BoarsController {

    async getAll(_: Request, res: Response) {
        const boars = await BoarsService.getAll();
        res.json(boars);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        const boar = await BoarsService.getById(id);
        if (!boar) {
            return res.status(404).json({ message: "Boar not found" });
        }
        return res.json(boar);
    }

    async create(req: Request, res: Response) {
        const data = req.body;
        const newBoar = await BoarsService.create(data);
        res.status(201).json(newBoar);
    }

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = req.body;
        const updatedBoar = await BoarsService.update(id, data);
        res.json(updatedBoar);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        await BoarsService.delete(id);
        res.status(204).send();
    }
}

export default new BoarsController();