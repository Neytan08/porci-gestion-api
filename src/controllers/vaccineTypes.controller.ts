import {Request, Response} from 'express';
import VaccineTypesService from '../services/vaccineTypes.service';
import logger from '../utils/logger';
import ApiError from '../utils/apiError';
import { vaccineTypesSchema, vaccineTypesUpdateSchema  } from '../schemas_validations/vaccineTypes.schema';

class VaccineTypesController {

    async getAll(_: Request, res: Response) {
        const types = await VaccineTypesService.getAll();
        logger.info(`Found ${types.length} vaccine types`);
        res.json(types);
    }

    async getById(req: Request, res: Response) {
        const id = Number(req.params.id);
        const type = await VaccineTypesService.getById(id);
        if (!type) {
            logger.warn(`Vaccine type with id ${id} not found`);
            throw ApiError.notFound("Vaccine type not found");
        }
        logger.info(`Vaccine type found: ${JSON.stringify(type)}`);
        return res.json(type);
    }

    async create(req: Request, res: Response) {
        const parseResult = vaccineTypesSchema.safeParse(req.body);
        if (!parseResult.success) {
            logger.warn("Validation error on create vaccine type");
            throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
        }
        const newType = await VaccineTypesService.create(parseResult.data);
        logger.info(`Vaccine type created: ${JSON.stringify(newType)}`);
        res.status(201).json(newType);
    }

    async update(req: Request, res: Response) {
        const parseResult = vaccineTypesUpdateSchema.safeParse(req.body);
        if (!parseResult.success) {
            logger.warn("Validation error on update vaccine type");
            throw ApiError.badRequest("Validation error: " + JSON.stringify(parseResult.error.issues));
        }
        const id = Number(req.params.id);
        const updatedType = await VaccineTypesService.update(id, parseResult.data);
        logger.info(`Vaccine type updated: ${JSON.stringify(updatedType)}`);
        res.json(updatedType);
    }

    async delete(req: Request, res: Response) {
        const id = Number(req.params.id);
        const deleted = await VaccineTypesService.delete(id);
        if (!deleted) {
            logger.warn(`Vaccine type with id ${id} not found for delete`);
            throw ApiError.notFound(`Vaccine type with id ${id} not found`);
        }
        logger.info(`Vaccine type with id ${id} deleted`);
        res.status(204).send();
    }
}

export default new VaccineTypesController();