import { z } from "zod";

// Mating Events schema validation using Zod
export const matingEventsSchema = z.object({
  sow_id: z.number().int().positive(),
  boar_id: z.number().int().optional(),
  reproduction_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid reproduction_date format" }),
  reproduction_type: z.enum(["Monta Natural", "Inseminación Artificial"]),
  pregnancy_result: z.enum(["Pendiente", "Positivo", "Negativo"]),
  notes: z.string().optional(),
});

// Partial schema allows optional fields for updates
export const matingEventUpdateSchema = matingEventsSchema.partial();
