import { Request, Response } from "express";
import VaccinesService from "../services/vaccines.service";
import logger from '../utils/logger';

class VaccinesController {

    async getAll(_: Request, res: Response) {
        logger.info("Fetching all vaccines");
        const vaccines = await VaccinesService.getAll();
        logger.info(`Found ${vaccines.length} vaccines`);
        res.json(vaccines);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        logger.info(`Fetching vaccine with id: ${id}`);
        const vaccine = await VaccinesService.getById(id);
        if (!vaccine) {
            logger.warn(`Vaccine with id ${id} not found`);
            return res.status(404).json({ message: "Vaccine not found" });
        }
        logger.info(`Vaccine found: ${JSON.stringify(vaccine)}`);
        return res.json(vaccine);
    }

    async create(req: Request, res: Response) {
        const data = req.body;
        logger.info(`Creating vaccine with data: ${JSON.stringify(data)}`);
        const newVaccine = await VaccinesService.create(data);
        logger.info(`Vaccine created: ${JSON.stringify(newVaccine)}`);
        res.status(201).json(newVaccine);
    }

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = req.body;
        logger.info(`Updating vaccine id ${id} with data: ${JSON.stringify(data)}`);
        const updatedVaccine = await VaccinesService.update(id, data);
        logger.info(`Vaccine updated: ${JSON.stringify(updatedVaccine)}`);
        res.json(updatedVaccine);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        logger.info(`Deleting vaccine with id: ${id}`);
        await VaccinesService.delete(id);
        logger.info(`Vaccine with id ${id} deleted`);
        res.status(204).send();
    }

    async getVaccinesByCowId(req: Request, res: Response) {
        const cowId = Number(req.params.cowId);
        logger.info(`Fetching vaccines for cow id: ${cowId}`);
        const vaccines = await VaccinesService.getVaccinesByCowId(cowId);
        logger.info(`Found ${vaccines.length} vaccines for cow id ${cowId}`);
        res.json(vaccines);
    }

    async getVaccinesByBoarId(req: Request, res: Response) {
        const boarId = Number(req.params.boarId);
        logger.info(`Fetching vaccines for boar id: ${boarId}`);
        const vaccines = await VaccinesService.getVaccinesByBoarId(boarId);
        logger.info(`Found ${vaccines.length} vaccines for boar id ${boarId}`);
        res.json(vaccines);
    }
}

export default new VaccinesController();