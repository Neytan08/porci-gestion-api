import { z } from "zod";

const BREED_NAME_MAX_LENGTH = 50;

// Validate the supplied display name without changing its casing or spacing.
export const breedSchema = z.object({
  breed_name: z
    .string()
    .min(1)
    .max(BREED_NAME_MAX_LENGTH)
    .regex(/\S/, "The breed name must contain a non-whitespace character."),
  description: z.string().optional(),
});

// Omitted fields remain unchanged, but stripping unsupported input must not leave an empty update.
export const breedUpdateSchema = breedSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "At least one field must be provided for update",
});
