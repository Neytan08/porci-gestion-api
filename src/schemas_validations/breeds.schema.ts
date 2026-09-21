import { z } from "zod";

const BREED_NAME_MAX_LENGTH = 100;

// Validate the supplied display name without changing its casing or spacing.
export const breedSchema = z.object({
  breed_name: z
    .string()
    .min(1)
    .max(BREED_NAME_MAX_LENGTH)
    .regex(/\S/, "The breed name must contain a non-whitespace character."),
  description: z.string().optional(),
});

// Partial schema allows optional fields for updates
export const breedUpdateSchema = breedSchema.partial();
