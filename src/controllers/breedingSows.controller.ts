import { Request, Response } from "express";
import BreedingSowsService from "../services/breedingSows.service";

class BreedingSowsController {
  async getAll(_: Request, res: Response) {
    const sows = await BreedingSowsService.getAll();
    res.json(sows);
  }

  async getById(req: Request, res: Response) {
    const id = Number(req.params.id);
    const sow = await BreedingSowsService.getById(id);
    if (!sow) {
      return res.status(404).json({ message: "Sow not found" });
    } else {
      return res.json(sow);
    }
  }

  async create(req: Request, res: Response) {
    const data = req.body;
    const newSow = await BreedingSowsService.create(data);
    res.status(201).json(newSow);
  }

  async update(req: Request, res: Response) {
    const id = Number(req.params.id);
    const data = req.body;
    const updated = await BreedingSowsService.update(id, data);
    res.json(updated);
  }

  async delete(req: Request, res: Response) {
    const id = Number(req.params.id);
    await BreedingSowsService.delete(id);
    res.status(204).send();
  }

  async getAllByStatusId(req: Request, res: Response) {
    const statusId = Number(req.params.statusId);
    const sows = await BreedingSowsService.getAllByStatusId(statusId);
    res.json(sows);
  }

  async countFarrowingsBySow(req: Request, res: Response) {
    const sowId = Number(req.params.sowId);
    const count = await BreedingSowsService.countFarrowingsBySow(sowId);
    res.json({ sowId, farrowingCount: count });
  }
}

export default new BreedingSowsController();