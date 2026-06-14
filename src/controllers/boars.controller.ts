import type { Request, Response } from "express";
import { boarsSchema, boarsUpdateSchema } from "../schemas_validations/boars.schema";
import { boarErrors } from "../services/boars/boarErrors";
import BoarsService from "../services/boars/boarsService";
import { calculateAge } from "../utils/getAgeFromDate";
import logger from "../utils/logger";
import { parsePositiveIdOrThrow, parseRequiredStringParamOrThrow } from "../utils/requestParsing";

class BoarsController {
  async getAll(_: Request, res: Response) {
    const boars = await BoarsService.getAll();
    const boarsWithAge = boars.map((boar) => {
      const birthDate = new Date(boar.birth_date);
      const { years, months } = calculateAge(birthDate);
      return { ...boar, age: { years: years, months: months } };
    });
    logger.info("Fetched boars", { count: boars.length });
    res.json(boarsWithAge);
  }

  async getById(req: Request, res: Response) {
    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      boarErrors.invalidBoarId(rawValue, "retrieve"),
    );
    const boar = await BoarsService.getById(id);

    if (!boar) {
      throw boarErrors.boarNotFound(id, "retrieve");
    }

    const birthDate = new Date(boar.birth_date);
    const { years, months } = calculateAge(birthDate);
    logger.info("Fetched boar", { boarId: id });
    return res.json({ ...boar, age: { years: years, months: months } });
  }

  async create(req: Request, res: Response) {
    const parseResult = boarsSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw boarErrors.invalidCreatePayload(parseResult.error.issues);
    }

    const newBoar = await BoarsService.create(parseResult.data);
    logger.info("Created boar", {
      boarId: newBoar.boar_id,
      boarTagNumber: newBoar.boar_tag_number,
      breedId: newBoar.breed_id,
    });
    res.status(201).json({ newBoar });
  }

  async update(req: Request, res: Response) {
    const parseResult = boarsUpdateSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw boarErrors.invalidUpdatePayload(parseResult.error.issues);
    }

    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      boarErrors.invalidBoarId(rawValue, "update"),
    );
    const updatedBoar = await BoarsService.update(id, parseResult.data);
    logger.info("Updated boar", {
      boarId: updatedBoar.boar_id,
      boarTagNumber: updatedBoar.boar_tag_number,
      breedId: updatedBoar.breed_id,
    });
    res.json({ updatedBoar });
  }

  async delete(req: Request, res: Response) {
    const id = parsePositiveIdOrThrow(req.params.id, (rawValue) =>
      boarErrors.invalidBoarId(rawValue, "delete"),
    );
    const deleted = await BoarsService.delete(id);

    logger.info("Deleted boar", {
      boarId: deleted.boar_id,
      boarTagNumber: deleted.boar_tag_number,
    });
    res.status(204).send();
  }

  async checkBoarTagNumberExists(req: Request, res: Response) {
    const boarTagNumber = parseRequiredStringParamOrThrow(
      req.params.boarTagNumber,
      boarErrors.invalidBoarTagNumber,
    );
    const exists = await BoarsService.checkBoarTagNumberExists(boarTagNumber);

    logger.info("Checked boar tag number", { boarTagNumber, exists });
    res.json(exists);
  }
}

export default new BoarsController();
