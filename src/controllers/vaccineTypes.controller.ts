import {Request, Response} from 'express';
import VaccineTypesService from '../services/vaccineTypes.service';
import logger from '../utils/logger';

class VaccineTypesController {

    async getAll(_: Request, res: Response) {
        logger.info("Fetching all vaccine types");
        const types = await VaccineTypesService.getAll();
        logger.info(`Found ${types.length} vaccine types`);
        res.json(types);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        logger.info(`Fetching vaccine type with id: ${id}`);
        const type = await VaccineTypesService.getById(id);
        if (!type) {
            logger.warn(`Vaccine type with id ${id} not found`);
            return res.status(404).json({ message: "Vaccine type not found" });
        }
        logger.info(`Vaccine type found: ${JSON.stringify(type)}`);
        return res.json(type);
    }

    async create(req: Request, res: Response) {
        const data = req.body;
        logger.info(`Creating vaccine type with data: ${JSON.stringify(data)}`);
        const newType = await VaccineTypesService.create(data);
        logger.info(`Vaccine type created: ${JSON.stringify(newType)}`);
        res.status(201).json(newType);
    }

    async update(req: Request, res: Response) {
        const id = Number(req.params.id);
        const data = req.body;
        logger.info(`Updating vaccine type id ${id} with data: ${JSON.stringify(data)}`);
        const updatedType = await VaccineTypesService.update(id, data);
        logger.info(`Vaccine type updated: ${JSON.stringify(updatedType)}`);
        res.json(updatedType);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        logger.info(`Deleting vaccine type with id: ${id}`);
        await VaccineTypesService.delete(id);
        logger.info(`Vaccine type with id ${id} deleted`);
        res.status(204).send();
    }
}

export default new VaccineTypesController();