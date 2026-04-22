import { z } from "zod";

// Vaccine Type schema validation using Zod
export const vaccineTypesSchema = z.object({
  vaccine_name: z.string().min(1),
});

// Partial schema allows optional fields for updates
export const vaccineTypesUpdateSchema = vaccineTypesSchema.partial();
