import { z } from "zod";
import {
  isAllowedBreedingSowCreationStatus,
  normalizeSowTagNumber,
  parseBreedingSowStatus,
} from "../services/breedingSows/breedingSowsRules";
import { parseCalendarDateInput } from "../utils/calendarDateInput";
import {
  animalMeasurementSchema,
  databaseIdSchema,
  nonNegativeDatabaseIntegerSchema,
} from "./common.schema";

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

const manuallyAssignableStatusSchema = z.string().transform((status, context) => {
  const parsedStatus = parseBreedingSowStatus(status);

  if (!parsedStatus || !isAllowedBreedingSowCreationStatus(parsedStatus)) {
    context.addIssue({
      code: "custom",
      message: "Status must be Vacia or No Productiva.",
    });
    return z.NEVER;
  }

  return parsedStatus;
});

// A purchased sow may bring a prior farrowing count, but lifecycle dates remain workflow-owned.
export const breedingSowSchema = z.strictObject({
  status: manuallyAssignableStatusSchema,
  breed_id: databaseIdSchema,
  sow_tag_number: z
    .string()
    .max(50)
    .refine((tag) => normalizeSowTagNumber(tag).length > 0, {
      message: "The breeding sow tag number cannot be blank",
    }),
  entry_date: dateInputSchema,
  weight: animalMeasurementSchema.nullable().optional(),
  length: animalMeasurementSchema.nullable().optional(),
  mammary_glands: databaseIdSchema,
  farrowing_number: nonNegativeDatabaseIntegerSchema,
  description: z.string().nullable().optional(),
});

// Ordinary updates expose profile fields while reproductive workflows retain history ownership.
export const breedingSowUpdateSchema = z
  .strictObject({
    status: manuallyAssignableStatusSchema,
    breed_id: databaseIdSchema,
    sow_tag_number: z
      .string()
      .max(50)
      .refine((tag) => normalizeSowTagNumber(tag).length > 0, {
        message: "The breeding sow tag number cannot be blank",
      }),
    entry_date: dateInputSchema,
    weight: animalMeasurementSchema.nullable(),
    length: animalMeasurementSchema.nullable(),
    mammary_glands: databaseIdSchema,
    description: z.string().nullable(),
  })
  .partial();

// Validation schema for changing the status of a breeding sow
export const breedingSowStatusChangeValidationSchema = z.strictObject({
  status: manuallyAssignableStatusSchema,
});

export const breedingSowRetireSchema = z.strictObject({
  sow_ids: z.union([databaseIdSchema, z.array(databaseIdSchema).nonempty()]),
  removal_date: dateInputSchema.optional(),
  removal_reason: z.string().nullable().optional(),
});
