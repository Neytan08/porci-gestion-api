import { Request, Response } from "express";
import StatusService from "../services/status.service";

class StatusController {
  async getAll(_: Request, res: Response) {
    const statuses = await StatusService.getAll();
    res.json(statuses);
  }

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const status = await StatusService.getById(id);
    if (!status) return res.status(404).json({ message: "Status not found" });
    return res.json(status);
  }

  async create(req: Request, res: Response) {
    const { status_name } = req.body;
    const newStatus = await StatusService.create(status_name);
    res.status(201).json(newStatus);
  }

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const { status_name } = req.body;
    const updated = await StatusService.update(id, status_name);
    res.json(updated);
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    await StatusService.delete(id);
    res.status(204).send();
  }
}

export default new StatusController();