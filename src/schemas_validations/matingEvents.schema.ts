import { z } from "zod";

// Mating Events schema validation using Zod
export const matingEventsSchema = z.object({
  sow_id: z.number().int().positive(),
  boar_id: z.number().int().positive(),
  insemination_date: z.string().refine(date => !isNaN(Date.parse(date)), { message: "Invalid insemination_date format" }),
  insemination_type: z.enum(["natural", "artificial"]),
  notes: z.string().optional()
});

// Partial schema allows optional fields for updates
export const matingEventUpdateSchema = matingEventsSchema.partial();