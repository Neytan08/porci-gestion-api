import { z } from "zod";

const positiveIdSchema = z.number().int().positive();

// Boars schema validation using Zod
export const boarsSchema = z.object({
  boar_tag_number: z.string().min(1).max(50),
  breed_id: z.number().int().positive(),
  weight: z.number().nullable().optional(),
  length: z.number().nullable().optional(),
  birth_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid birth_date format" }),
  removal_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid removal_date format" })
    .nullable()
    .optional(),
  removal_reason: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

// Partial schema allows optional fields for updates
export const boarsUpdateSchema = boarsSchema.partial();

export const boarsRetireSchema = z.object({
  boar_ids: z.union([positiveIdSchema, z.array(positiveIdSchema).nonempty()]),
  removal_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid removal_date format" })
    .optional(),
  removal_reason: z.string().nullable().optional(),
});
