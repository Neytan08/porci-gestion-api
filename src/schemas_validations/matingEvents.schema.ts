import { z } from "zod";
import {
  canPregnancyResultBeProvidedByRequest,
  parsePregnancyResult,
} from "../services/matingEvents/pregnancyRules";
import { REPRODUCTION_TYPES } from "../services/matingEvents/matingEventsTypes";
import { parseCalendarDateInput } from "../utils/calendarDateInput";

const positiveIdSchema = z.number().int().positive();

const calendarDateSchema = z.string().transform((value, context) => {
  const date = parseCalendarDateInput(value);

  if (!date) {
    context.addIssue({
      code: "custom",
      message: "Expected M/D/YYYY, YYYY-MM-DD, or an ISO 8601 timestamp with an offset",
    });
    return z.NEVER;
  }

  return date;
});

const pregnancyResultRequestSchema = z.string().transform((value, context) => {
  const result = parsePregnancyResult(value);

  if (!result || !canPregnancyResultBeProvidedByRequest(result)) {
    context.addIssue({
      code: "custom",
      message: "Pregnancy result must be Pendiente, Positivo or Negativo",
    });
    return z.NEVER;
  }

  return result;
});

/** Validates and normalizes a new mating workflow request. */
export const matingEventsSchema = z.strictObject({
  sow_id: positiveIdSchema,
  boar_id: positiveIdSchema.optional(),
  reproduction_date: calendarDateSchema,
  reproduction_type: z.enum([
    REPRODUCTION_TYPES.naturalMating,
    REPRODUCTION_TYPES.artificialInsemination,
  ]),
  pregnancy_result: pregnancyResultRequestSchema,
  notes: z.string().optional(),
});

/** Validates a single or bulk request to transition pregnancy results. */
export const matingEventPregnancyResultUpdateSchema = z.strictObject({
  mating_ids: z.union([positiveIdSchema, z.array(positiveIdSchema).nonempty()]),
  pregnancy_result: pregnancyResultRequestSchema,
});
