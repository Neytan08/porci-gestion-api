import type { Request, Response } from "express";
import { breedingSowRetireSchema, breedingSowSchema, breedingSowStatusChangeValidationSchema, breedingSowUpdateSchema } from "../schemas_validations/breedingSows.schema";
import { breedingSowErrors } from "../services/breedingSows/breedingSowErrors";
import { parseBreedingSowStatus } from "../services/breedingSows/breedingSowsRules";
import BreedingSowsService from "../services/breedingSows/breedingSowsService";
import { parsePositiveIdOrThrow, parsePositiveIdsOrThrow, parseRequiredStringParamOrThrow } from "../utils/requestParsing";

class BreedingSowsController {
  /** Returns the active breeding-sow collection. */
  async getAll(_: Request, res: Response) {
    const sows = await BreedingSowsService.getAll();
    return res.json(sows);
  }

  /** Returns one active breeding sow identified by its route parameter. */
  async getById(req: Request, res: Response) {
    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      breedingSowErrors.invalidBreedingSowId(rawValue, "retrieve"),
    );
    const sow = await BreedingSowsService.getById(id);

    if (!sow) {
      throw breedingSowErrors.breedingSowNotFound(id, "retrieve");
    }

    return res.json(sow);
  }

  /** Reports whether a normalized sow tag is already registered. */
  async checkSowTagNumberExists(req: Request, res: Response) {
    const sowTagNumber = parseRequiredStringParamOrThrow(
      req.params.sowTagNumber,
      breedingSowErrors.invalidSowTagNumber,
    );
    const exists = await BreedingSowsService.checkSowTagNumberExists(sowTagNumber);

    return res.json(exists);
  }

  /** Validates and registers a breeding sow. */
  async create(req: Request, res: Response) {
    const parseResult = breedingSowSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw breedingSowErrors.invalidCreatePayload(parseResult.error.issues);
    }

    const newSow = await BreedingSowsService.create(parseResult.data);
    return res.status(201).json(newSow);
  }

  /** Validates whether a proposed manual status change is currently allowed. */
  async validateStatusChange(req: Request, res: Response) {
    const parseResult = breedingSowStatusChangeValidationSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw breedingSowErrors.invalidStatusChangePayload(parseResult.error.issues);
    }

    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      breedingSowErrors.invalidBreedingSowId(rawValue, "retrieve"),
    );
    await BreedingSowsService.validateStatusChange(id, parseResult.data.status);
    return res.status(204).send();
  }

  /** Validates and updates editable fields on an active breeding sow. */
  async update(req: Request, res: Response) {
    const parseResult = breedingSowUpdateSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw breedingSowErrors.invalidUpdatePayload(parseResult.error.issues);
    }

    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      breedingSowErrors.invalidBreedingSowId(rawValue, "update"),
    );
    const updatedSow = await BreedingSowsService.update(id, parseResult.data);
    return res.json(updatedSow);
  }

  /** Permanently deletes an eligible active breeding sow. */
  async delete(req: Request, res: Response) {
    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      breedingSowErrors.invalidBreedingSowId(rawValue, "delete"),
    );
    await BreedingSowsService.delete(id);
    return res.status(204).send();
  }

  /** Retires one or more active sows and closes their open reproductive workflows. */
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

    return res.json(result);
  }

  /** Returns active breeding sows matching the requested canonical status. */
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

    return res.json(sows);
  }
}

export default new BreedingSowsController();
