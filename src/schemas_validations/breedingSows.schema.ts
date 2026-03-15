import { z } from "zod";

// Breeding Sows Schema validation using Zod
export const breedingSowsschema = z.object({
  status_id: z.number().int().positive(),
  breed_id: z.number().int().positive(),
  sow_tag_number: z.string().min(1),
  entry_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid entry_date format" }),
  weight: z.number().nullable().optional(),
  length: z.number().nullable().optional(),
  mammary_glands: z.number().int().positive(),
  farrowing_number: z.number().int().nonnegative(),
  last_weaning_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid last_weaning_date format" })
    .nullable()
    .optional(),
  removal_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid removal_date format" })
    .nullable()
    .optional(),
  removal_reason: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

// Partial schema allows optional fields for updates
export const breedingSowsUpdateSchema = breedingSowsschema.partial();
