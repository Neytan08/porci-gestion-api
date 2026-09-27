import { z } from "zod";
import { parseCalendarDateInput } from "../utils/calendarDateInput";

/** Validates supported calendar input and normalizes it before domain workflows run. */
const calendarDateSchema = (fieldName: string) =>
  z.string().transform((value, context) => {
    const date = parseCalendarDateInput(value);

    if (!date) {
      context.addIssue({
        code: "custom",
        message: `Invalid ${fieldName}. Expected M/D/YYYY, YYYY-MM-DD, or an ISO 8601 timestamp with an offset`,
      });
      return z.NEVER;
    }

    return date;
  });

const nonNegativeIntegerSchema = z.number().int().nonnegative();
const optionalCountWithZeroDefault = nonNegativeIntegerSchema.optional().default(0);

// The planned weaning_date is derived; actual weaning fields belong to the wean endpoint.
export const farrowingsSchema = z.object({
  sow_id: z.number().int().positive(),
  farrowing_date: calendarDateSchema("farrowing_date"),
  male_piglets: nonNegativeIntegerSchema,
  female_piglets: nonNegativeIntegerSchema,
  still_births: optionalCountWithZeroDefault,
  mummies: optionalCountWithZeroDefault,
  notes: z.string().optional(),
});

// Both values are required only when completing the weaning workflow. Zero is valid.
export const farrowingWeanSchema = z.object({
  weaned_date: calendarDateSchema("weaned_date"),
  weaned_piglets: nonNegativeIntegerSchema,
});
