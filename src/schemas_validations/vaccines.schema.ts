import { z } from "zod";

// Vaccines schema validation using Zod
export const vaccinesSchema = z.object({
  sow_id: z.number().int().positive(),
  boar_id: z.number().int().positive(),
  vaccine_id: z.number().int().positive(),
  administration_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid administration_date format" }),
  dose: z.string().max(50),
  administration_route: z.string().max(50),
  administered_by: z.string().max(100),
  note: z.string().optional(),
});

// Partial schema allows optional fields for updates
export const vaccinesUpdateSchema = vaccinesSchema.partial();
