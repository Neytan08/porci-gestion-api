import { z } from "zod";

// Status schema validation using Zod
export const statusSchema = z.object({
  status_name: z.string().min(1),
});

// Partial schema allows optional fields for updates
export const statusUpdateSchema = statusSchema.partial();
