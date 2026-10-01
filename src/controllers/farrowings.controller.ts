import type { Request, Response } from "express";
import { farrowingsSchema, farrowingWeanSchema } from "../schemas_validations/farrowings.schema";
import { farrowingErrors } from "../services/farrowings/farrowingErrors";
import FarrowingsService from "../services/farrowings/farrowingsService";
import { parsePositiveIdOrThrow } from "../utils/requestParsing";

class FarrowingsController {
    /** Returns the full farrowing collection. */
    async getAll(_: Request, res: Response) {
        const farrowings = await FarrowingsService.getAll();
        return res.json(farrowings);
    }

    /** Validates the identifier and returns one farrowing. */
    async getById(req: Request, res: Response) {
        const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
            farrowingErrors.invalidFarrowingId(rawValue, "retrieve"),
        );
        const farrowing = await FarrowingsService.getById(id);

        if (!farrowing) {
            throw farrowingErrors.farrowingNotFound(id, "retrieve");
        }

        return res.json(farrowing);
    }

    /** Validates and creates a farrowing through its reproductive workflow. */
    async create(req: Request, res: Response) {
        const parseResult = farrowingsSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw farrowingErrors.invalidCreatePayload(parseResult.error.issues);
        }

        const newFarrowing = await FarrowingsService.create(parseResult.data);
        return res.status(201).json(newFarrowing);
    }

    /** Validates the request before completing the weaning and sow status transaction. */
    async wean(req: Request, res: Response) {
        const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
            farrowingErrors.invalidFarrowingId(rawValue, "wean"),
        );
        const parseResult = farrowingWeanSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw farrowingErrors.invalidWeanPayload(parseResult.error.issues);
        }

        const updated = await FarrowingsService.wean(id, parseResult.data);
        return res.json(updated);
    }

    /** Deletes an unweaned farrowing and restores the preceding reproductive state. */
    async delete(req: Request, res: Response) {
        const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
            farrowingErrors.invalidFarrowingId(rawValue, "delete"),
        );
        await FarrowingsService.delete(id);
        return res.status(204).send();
    }

    /** Returns every farrowing registered for one validated sow identifier. */
    async getAllFarrowingsBySow(req: Request, res: Response) {
        const sowId = parsePositiveIdOrThrow(req.params.sowId, farrowingErrors.invalidSowId);
        const result = await FarrowingsService.getAllFarrowingsBySow(sowId);

        return res.json(result);
    }
}

export default new FarrowingsController();
