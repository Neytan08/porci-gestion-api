import type { Request, Response } from "express";
import { breedingSowRetireSchema, breedingSowSchema, breedingSowStatusChangeValidationSchema, breedingSowUpdateSchema } from "../schemas_validations/breedingSows.schema";
import { breedingSowErrors } from "../services/breedingSows/breedingSowErrors";
import { parseBreedingSowStatus } from "../services/breedingSows/breedingSowsRules";
import BreedingSowsService from "../services/breedingSows/breedingSowsService";
import logger from "../utils/logger";
import { parsePositiveIdOrThrow, parsePositiveIdsOrThrow, parseRequiredStringParamOrThrow } from "../utils/requestParsing";

class BreedingSowsController {
  async getAll(_: Request, res: Response) {
    const sows = await BreedingSowsService.getAll();
    logger.info("Fetched breeding sows", { count: sows.length });
    res.json(sows);
  }

  async getById(req: Request, res: Response) {
    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      breedingSowErrors.invalidBreedingSowId(rawValue, "retrieve"),
    );
    const sow = await BreedingSowsService.getById(id);

    if (!sow) {
      throw breedingSowErrors.breedingSowNotFound(id, "retrieve");
    }

    logger.info("Fetched breeding sow", { sowId: id });
    return res.json(sow);
  }

  async checkSowTagNumberExists(req: Request, res: Response) {
    const sowTagNumber = parseRequiredStringParamOrThrow(
      req.params.sowTagNumber,
      breedingSowErrors.invalidSowTagNumber,
    );
    const exists = await BreedingSowsService.checkSowTagNumberExists(sowTagNumber);

    logger.info("Checked breeding sow tag number", { sowTagNumber, exists });
    return res.json(exists);
  }

  async create(req: Request, res: Response) {
    const parseResult = breedingSowSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw breedingSowErrors.invalidCreatePayload(parseResult.error.issues);
    }

    const newSow = await BreedingSowsService.create(parseResult.data);
    logger.info("Created breeding sow", {
      sowId: newSow.sow_id,
      sowTagNumber: newSow.sow_tag_number,
      breedId: newSow.breed_id,
      status: newSow.status,
    });
    res.status(201).json(newSow);
  }

  async validateStatusChange(req: Request, res: Response) {
    const parseResult = breedingSowStatusChangeValidationSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw breedingSowErrors.invalidStatusChangePayload(parseResult.error.issues);
    }

    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      breedingSowErrors.invalidBreedingSowId(rawValue, "retrieve"),
    );
    await BreedingSowsService.validateStatusChange(id, parseResult.data.status);

    logger.info("Validated breeding sow status change", {
      sowId: id,
      status: parseResult.data.status,
    });
    res.status(204).send();
  }

  async update(req: Request, res: Response) {
    const parseResult = breedingSowUpdateSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw breedingSowErrors.invalidUpdatePayload(parseResult.error.issues);
    }

    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      breedingSowErrors.invalidBreedingSowId(rawValue, "update"),
    );
    const updatedSow = await BreedingSowsService.update(id, parseResult.data);
    logger.info("Updated breeding sow", {
      sowId: updatedSow.sow_id,
      sowTagNumber: updatedSow.sow_tag_number,
      breedId: updatedSow.breed_id,
      status: updatedSow.status,
    });
    res.json(updatedSow);
  }

  async delete(req: Request, res: Response) {
    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      breedingSowErrors.invalidBreedingSowId(rawValue, "delete"),
    );
    const deleted = await BreedingSowsService.delete(id);

    logger.info("Deleted breeding sow", {
      sowId: deleted.sow_id,
      sowTagNumber: deleted.sow_tag_number,
    });
    res.status(204).send();
  }

  async retire(req: Request, res: Response) {
    const parseResult = breedingSowRetireSchema.safeParse(req.body ?? {});

    if (!parseResult.success) {
      throw breedingSowErrors.invalidRetirePayload(parseResult.error.issues);
    }

    const { sow_ids, ...retireData } = parseResult.data;
    const sowIds = parsePositiveIdsOrThrow(
      sow_ids,
      breedingSowErrors.invalidBreedingSowIds,
    );

    const result = await BreedingSowsService.retire(sowIds, retireData);

    logger.info("Retired breeding sows", {
      sowIds,
      retiredCount: result.count,
      removalDate: retireData.removal_date ?? null,
    });
    res.json(result);
  }

  async getAllByStatus(req: Request, res: Response) {
    const rawStatus = parseRequiredStringParamOrThrow(
      req.params.status,
      breedingSowErrors.invalidStatus,
    );
    const status = parseBreedingSowStatus(rawStatus);

    if (!status) {
      throw breedingSowErrors.invalidStatus(rawStatus);
    }

    const sows = await BreedingSowsService.getAllBreedingSowsByStatus(status);

    logger.info("Fetched breeding sows by status", { status, count: sows.length });
    res.json(sows);
  }

  // async countFarrowingsBySow(req: Request, res: Response) {
  //   const sowId = Number(req.params.sowId);
  //   const count = await BreedingSowsService.countFarrowingsBySow(sowId);
  //   logger.info(`Sow id ${sowId} has ${count} farrowings`);
  //   res.json({ sowId, farrowingCount: count });
  // }
}

export default new BreedingSowsController();
