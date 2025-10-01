import { Request, Response } from "express";
import StatusService from "../services/status.service";
import logger from '../utils/logger';

class StatusController {
  async getAll(_: Request, res: Response) {
    logger.info("Fetching all statuses");
    const statuses = await StatusService.getAll();
    logger.info(`Found ${statuses.length} statuses`);
    res.json(statuses);
  }

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    logger.info(`Fetching status with id: ${id}`);
    const status = await StatusService.getById(id);
    if (!status) {
      logger.warn(`Status with id ${id} not found`);
      return res.status(404).json({ message: "Status not found" });
    }
    logger.info(`Status found: ${JSON.stringify(status)}`);
    return res.json(status);
  }

  async create(req: Request, res: Response) {
    const { status_name } = req.body;
    logger.info(`Creating status with name: ${status_name}`);
    const newStatus = await StatusService.create(status_name);
    logger.info(`Status created: ${JSON.stringify(newStatus)}`);
    res.status(201).json(newStatus);
  }

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { status_name } = req.body;
    logger.info(`Updating status id ${id} with name: ${status_name}`);
    const updated = await StatusService.update(id, status_name);
    logger.info(`Status updated: ${JSON.stringify(updated)}`);
    res.json(updated);
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    logger.info(`Deleting status with id: ${id}`);
    await StatusService.delete(id);
    logger.info(`Status with id ${id} deleted`);
    res.status(204).send();
  }
}

export default new StatusController();