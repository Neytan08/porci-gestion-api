import { z } from "zod";

// Breed schema validation using Zod
export const breedSchema = z.object({
  breed_name: z.string().min(1),
  description: z.string().optional(),
});

// Partial schema allows optional fields for updates
export const breedUpdateSchema = breedSchema.partial();
