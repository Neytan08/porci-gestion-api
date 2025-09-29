import { Request, Response } from "express";
import VaccinesService from "../services/vaccines.service";

class VaccinesController {

    async getAll(_: Request, res: Response) {
        const vaccines = await VaccinesService.getAll();
        res.json(vaccines);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        const vaccine = await VaccinesService.getById(id);
        if (!vaccine) {
            return res.status(404).json({ message: "Vaccine not found" });
        }
        return res.json(vaccine);
    }

    async create(req: Request, res: Response) {
        const data = req.body;
        const newVaccine = await VaccinesService.create(data);
        res.status(201).json(newVaccine);
    }

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = req.body;
        const updatedVaccine = await VaccinesService.update(id, data);
        res.json(updatedVaccine);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        await VaccinesService.delete(id);
        res.status(204).send();
    }

    async getVaccinesByCowId(req: Request, res: Response) {
        const cowId = Number(req.params.cowId);
        const vaccines = await VaccinesService.getVaccinesByCowId(cowId);
        res.json(vaccines);
    }

    async getVaccinesByBoarId(req: Request, res: Response) {
        const boarId = Number(req.params.boarId);
        const vaccines = await VaccinesService.getVaccinesByBoarId(boarId);
        res.json(vaccines);
    }
}

export default new VaccinesController();