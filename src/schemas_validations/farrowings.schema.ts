import { z } from "zod";

const dateStringSchema = (fieldName: string) =>
  z
    .string()
    .refine((date) => !Number.isNaN(Date.parse(date)), {
      message: `Invalid ${fieldName} format`,
    });

const nonNegativeIntegerSchema = z.number().int().nonnegative();
const optionalCountWithZeroDefault = nonNegativeIntegerSchema.optional().default(0);

// Farrowing creation does not accept weaning_date because it is derived from farrowing_date.
export const farrowingsSchema = z.object({
  sow_id: z.number().int().positive(),
  farrowing_date: dateStringSchema("farrowing_date"),
  male_piglets: nonNegativeIntegerSchema,
  female_piglets: nonNegativeIntegerSchema,
  still_births: optionalCountWithZeroDefault,
  mummies: optionalCountWithZeroDefault,
  notes: z.string().optional(),
});

// Updates can change farrowing_date, but weaning_date remains derived data.
export const farrowingUpdateSchema = z.object({
  sow_id: z.number().int().positive().optional(),
  farrowing_date: dateStringSchema("farrowing_date").optional(),
  male_piglets: nonNegativeIntegerSchema.optional(),
  female_piglets: nonNegativeIntegerSchema.optional(),
  still_births: nonNegativeIntegerSchema.optional(),
  mummies: nonNegativeIntegerSchema.optional(),
  weaned_piglets: nonNegativeIntegerSchema.optional(),
  notes: z.string().optional(),
});
