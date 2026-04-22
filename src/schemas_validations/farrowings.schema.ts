import { z } from "zod";

// Farrowing Schema validation using Zod
export const farrowingsSchema = z.object({
  sow_id: z.number().int().positive(),
  farrowing_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid farrowing_date format" }),
  male_piglets: z.number().int().nonnegative(),
  female_piglets: z.number().int().nonnegative(),
  still_births: z.number().int().nonnegative(),
  mummies: z.number().int().nonnegative(),
  weaning_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid weaning_date format" }),
  weaned_piglets: z.number().int().nonnegative(),
  notes: z.string().optional(),
});

// Partial schema allows optional fields for updates
export const farrowingUpdateSchema = farrowingsSchema.partial();
