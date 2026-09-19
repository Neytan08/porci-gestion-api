import { z } from "zod";

const dateStringSchema = (fieldName: string) =>
  z
    .string()
    .refine((date) => !Number.isNaN(Date.parse(date)), {
      message: `Invalid ${fieldName} format`,
    });

const nonNegativeIntegerSchema = z.number().int().nonnegative();
const optionalCountWithZeroDefault = nonNegativeIntegerSchema.optional().default(0);

// The planned weaning_date is derived; actual weaning fields belong to the wean endpoint.
export const farrowingsSchema = z.object({
  sow_id: z.number().int().positive(),
  farrowing_date: dateStringSchema("farrowing_date"),
  male_piglets: nonNegativeIntegerSchema,
  female_piglets: nonNegativeIntegerSchema,
  still_births: optionalCountWithZeroDefault,
  mummies: optionalCountWithZeroDefault,
  notes: z.string().optional(),
});

// Partial schema allows optional fields for updates
// export const farrowingUpdateSchema = farrowingsSchema.partial();

// Both values are required only when completing the weaning workflow. Zero is valid.
export const farrowingWeanSchema = z.object({
  weaned_date: z.string().refine((date) => !Number.isNaN(Date.parse(date)), {
      message: "Invalid weaned_date format",
    }),
  weaned_piglets: nonNegativeIntegerSchema,
});

export type WeanFarrowingInput = z.infer<typeof farrowingWeanSchema>;
