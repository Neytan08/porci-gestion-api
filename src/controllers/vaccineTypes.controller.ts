import {Request, Response} from 'express';
import VaccineTypesService from '../services/vaccineTypes.service';

class VaccineTypesController {

    async getAll(_: Request, res: Response) {
        const types = await VaccineTypesService.getAll();
        res.json(types);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        const type = await VaccineTypesService.getById(id);
        if (!type) {
            return res.status(404).json({ message: "Vaccine type not found" });
        }
        return res.json(type);
    }

    async create(req: Request, res: Response) {
        const data = req.body;
        const newType = await VaccineTypesService.create(data);
        res.status(201).json(newType);
    }

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = req.body;
        const updatedType = await VaccineTypesService.update(id, data);
        res.json(updatedType);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        await VaccineTypesService.delete(id);
        res.status(204).send();
    }
}

export default new VaccineTypesController();