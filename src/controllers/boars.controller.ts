import { Request, Response } from "express";
import BoarsService from "../services/boars.service";
import logger from '../utils/logger';

class BoarsController {

    async getAll(_: Request, res: Response) {
    logger.info("Fetching all boars");
    const boars = await BoarsService.getAll();
    logger.info(`Found ${boars.length} boars`);
    res.json(boars);
  }

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    logger.info(`Fetching boar with id: ${id}`);
    const boar = await BoarsService.getById(id);
    if (!boar) {
      logger.warn(`Boar with id ${id} not found`);
      return res.status(404).json({ message: "Boar not found" });
    }
    logger.info(`Boar found: ${JSON.stringify(boar)}`);
    return res.json(boar);
  }

  async create(req: Request, res: Response) {
    const data = req.body;
    logger.info(`Creating boar with data: ${JSON.stringify(data)}`);
    const newBoar = await BoarsService.create(data);
    logger.info(`Boar created: ${JSON.stringify(newBoar)}`);
    res.status(201).json(newBoar);
  }

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = req.body;
    logger.info(`Updating boar id ${id} with data: ${JSON.stringify(data)}`);
    const updatedBoar = await BoarsService.update(id, data);
    logger.info(`Boar updated: ${JSON.stringify(updatedBoar)}`);
    res.json(updatedBoar);
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    logger.info(`Deleting boar with id: ${id}`);
    await BoarsService.delete(id);
    logger.info(`Boar with id ${id} deleted`);
    res.status(204).send();
  }
}

export default new BoarsController();