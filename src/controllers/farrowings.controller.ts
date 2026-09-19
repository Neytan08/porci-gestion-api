import type { Request, Response } from "express";
import { farrowingsSchema, farrowingWeanSchema } from "../schemas_validations/farrowings.schema";
import { farrowingErrors } from "../services/farrowings/farrowingErrors";
import FarrowingsService from "../services/farrowings/farrowingsService";
import logger from "../utils/logger";
import { parsePositiveIdOrThrow } from "../utils/requestParsing";

class FarrowingsController {
    async getAll(_: Request, res: Response) {
        const farrowings = await FarrowingsService.getAll();
        logger.info("Fetched farrowings", { count: farrowings.length });
        res.json(farrowings);
    }

    async getById(req: Request, res: Response) {
        const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
            farrowingErrors.invalidFarrowingId(rawValue, "retrieve"),
        );
        const farrowing = await FarrowingsService.getById(id);

        if (!farrowing) {
            throw farrowingErrors.farrowingNotFound(id, "retrieve");
        }

        logger.info("Fetched farrowing", { farrowingId: id });
        return res.json(farrowing);
    }

    async create(req: Request, res: Response) {
        const parseResult = farrowingsSchema.safeParse(req.body);

        if (!parseResult.success) {
            throw farrowingErrors.invalidCreatePayload(parseResult.error.issues);
        }

        const newFarrowing = await FarrowingsService.create(parseResult.data);
        logger.info("Created farrowing", {
            farrowingId: newFarrowing.farrowing_id,
            sowId: newFarrowing.sow_id,
            matingId: newFarrowing.mating_id,
        });
        res.status(201).json(newFarrowing);
    }

    // async update(req: Request, res: Response) {
    //     const parseResult = farrowingUpdateSchema.safeParse(req.body);

    //     if (!parseResult.success) {
    //         throw farrowingErrors.invalidUpdatePayload(parseResult.error.issues);
    //     }

    //     const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
    //         farrowingErrors.invalidFarrowingId(rawValue, "update"),
    //     );
    //     const updated = await FarrowingsService.update(id, parseResult.data);
    //     logger.info("Updated farrowing", {
    //         farrowingId: updated.farrowing_id,
    //         sowId: updated.sow_id,
    //         matingId: updated.mating_id,
    //     });
    //     res.json(updated);
    // }

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
        logger.info("Weaned farrowing", {
            farrowingId: updated.farrowing_id,
            sowId: updated.sow_id,
            weanedDate: updated.weaned_date,
            weanedPiglets: updated.weaned_piglets,
        });
        res.json(updated);
    }

    async delete(req: Request, res: Response) {
        const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
            farrowingErrors.invalidFarrowingId(rawValue, "delete"),
        );
        const deleted = await FarrowingsService.delete(id);

        logger.info("Deleted farrowing", {
            farrowingId: deleted.farrowing_id,
            sowId: deleted.sow_id,
            matingId: deleted.mating_id,
        });
        res.status(204).send();
    }

    async getAllFarrowingsBySow(req: Request, res: Response) {
        const sowId = parsePositiveIdOrThrow(req.params.sowId, farrowingErrors.invalidSowId);
        const result = await FarrowingsService.getAllFarrowingsBySow(sowId);

        logger.info("Fetched farrowings by sow", { sowId, count: result.count });
        res.json(result);
    }
}

export default new FarrowingsController();
