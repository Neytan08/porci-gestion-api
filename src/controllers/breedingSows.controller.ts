import { Request, Response } from "express";
import BreedingSowsService from "../services/breedingSows.service";
import logger from '../utils/logger';

class BreedingSowsController {
  async getAll(_: Request, res: Response) {
    logger.info("Fetching all breeding sows");
    const sows = await BreedingSowsService.getAll();
    logger.info(`Found ${sows.length} breeding sows`);
    res.json(sows);
  }

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    logger.info(`Fetching breeding sow with id: ${id}`);
    const sow = await BreedingSowsService.getById(id);
    if (!sow) {
      logger.warn(`Breeding sow with id ${id} not found`);
      return res.status(404).json({ message: "Breeding sow not found" });
    }
    logger.info(`Breeding sow found: ${JSON.stringify(sow)}`);
    return res.json(sow);
  }

  async create(req: Request, res: Response) {
    const data = req.body;
    logger.info(`Creating breeding sow with data: ${JSON.stringify(data)}`);
    const newSow = await BreedingSowsService.create(data);
    logger.info(`Breeding sow created: ${JSON.stringify(newSow)}`);
    res.status(201).json(newSow);
  }

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = req.body;
    logger.info(`Updating breeding sow id ${id} with data: ${JSON.stringify(data)}`);
    const updatedSow = await BreedingSowsService.update(id, data);
    logger.info(`Breeding sow updated: ${JSON.stringify(updatedSow)}`);
    res.json(updatedSow);
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    logger.info(`Deleting breeding sow with id: ${id}`);
    await BreedingSowsService.delete(id);
    logger.info(`Breeding sow with id ${id} deleted`);
    res.status(204).send();
  }

  async getAllByStatusId(req: Request, res: Response) {
    const statusId = Number(req.params.statusId);
    logger.info(`Fetching breeding sows with status id: ${statusId}`);
    const sows = await BreedingSowsService.getAllByStatusId(statusId);
    logger.info(`Found ${sows.length} breeding sows with status id ${statusId}`);
    res.json(sows);
  }

  async countFarrowingsBySow(req: Request, res: Response) {
    const sowId = Number(req.params.sowId);
    logger.info(`Counting farrowings for sow id: ${sowId}`);
    const count = await BreedingSowsService.countFarrowingsBySow(sowId);
    logger.info(`Sow id ${sowId} has ${count} farrowings`);
    res.json({ sowId, farrowingCount: count });
  }
}

export default new BreedingSowsController();