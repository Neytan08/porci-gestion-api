import { z } from "zod";
import {
  BREEDING_SOW_STATUSES,
  isAllowedBreedingSowCreationStatus,
  normalizeSowTagNumber,
  parseBreedingSowStatus,
} from "../services/breedingSows/breedingSowsRules";
import { parseCalendarDateInput } from "../utils/calendarDateInput";

const breedingSowStatusNames = Object.values(BREEDING_SOW_STATUSES)
  .filter((status) => status !== BREEDING_SOW_STATUSES.retirada)
  .join(", ");

const breedingSowStatusSchema = z.string().transform((status, context) => {
  const parsedStatus = parseBreedingSowStatus(status);

  if (!parsedStatus) {
    context.addIssue({
      code: "custom",
      message: `Status must be one of: ${breedingSowStatusNames}.`,
    });
    return z.NEVER;
  }

  return parsedStatus;
});

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
const measurementSchema = z.number().nonnegative().max(999.99).multipleOf(0.01);
const breedingSowCreationStatusSchema = z.string().transform((status, context) => {
  const parsedStatus = parseBreedingSowStatus(status);

  if (!parsedStatus || !isAllowedBreedingSowCreationStatus(parsedStatus)) {
    context.addIssue({
      code: "custom",
      message: "Status must be Vacia or No Productiva when creating a breeding sow.",
    });
    return z.NEVER;
  }

  return parsedStatus;
});

// A purchased sow may bring a prior farrowing count, but lifecycle dates remain workflow-owned.
export const breedingSowSchema = z.strictObject({
  status: breedingSowCreationStatusSchema,
  breed_id: z.number().int().positive(),
  sow_tag_number: z.string().max(50).refine((tag) => normalizeSowTagNumber(tag).length > 0, {
    message: "The breeding sow tag number cannot be blank",
  }),
  entry_date: dateInputSchema,
  weight: measurementSchema.nullable().optional(),
  length: measurementSchema.nullable().optional(),
  mammary_glands: z.number().int().positive(),
  farrowing_number: z.number().int().nonnegative(),
  description: z.string().nullable().optional(),
});

// Ordinary updates cannot overwrite imported history or workflow-owned lifecycle values.
export const breedingSowUpdateSchema = breedingSowSchema.partial();
// export const breedingSowUpdateSchema = z.strictObject({
//   status: breedingSowStatusSchema.optional(),
//   breed_id: positiveIdSchema.optional(),
//   sow_tag_number: z
//     .string()
//     .max(50)
//     .refine((tag) => normalizeSowTagNumber(tag).length > 0, {
//       message: "The breeding sow tag number cannot be blank",
//     })
//     .optional(),
//   entry_date: dateInputSchema.optional(),
//   weight: measurementSchema.nullable().optional(),
//   length: measurementSchema.nullable().optional(),
//   mammary_glands: z.number().int().positive().optional(),
//   description: z.string().nullable().optional(),
// });

// Validation schema for changing the status of a breeding sow 
export const breedingSowStatusChangeValidationSchema = z.strictObject({
  status: breedingSowStatusSchema,
});

export const breedingSowRetireSchema = z.strictObject({
  sow_ids: z.union([positiveIdSchema, z.array(positiveIdSchema).nonempty()]),
  removal_date: dateInputSchema.optional(),
  removal_reason: z.string().nullable().optional(),
});
