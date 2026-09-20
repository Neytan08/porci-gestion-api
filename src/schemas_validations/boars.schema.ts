import { z } from "zod";
import { normalizeBoarTagNumber } from "../services/boars/boarsRules";
import { parseCalendarDateInput } from "../utils/calendarDateInput";

const positiveIdSchema = z.number().int().positive();
const dateInputSchema = z.string().transform((value, context) => {
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

// Ignore response-only fields when a client sends a loaded boar back for editing.
export const boarsSchema = z.object({
  boar_tag_number: z.string().max(50).refine((tag) => normalizeBoarTagNumber(tag).length > 0, {
    message: "The boar tag number cannot be blank",
  }),
  breed_id: positiveIdSchema,
  weight: z.number().nullable().optional(),
  length: z.number().nullable().optional(),
  birth_date: dateInputSchema,
  description: z.string().nullable().optional(),
});

export const boarsUpdateSchema = boarsSchema.partial();

export const boarsRetireSchema = z.strictObject({
  boar_ids: z.union([positiveIdSchema, z.array(positiveIdSchema).nonempty()]),
  removal_date: dateInputSchema,
  removal_reason: z.string().trim().min(1),
});
