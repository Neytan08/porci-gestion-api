import { z } from "zod";

// Notifications schema validation using Zod
export const notificationsSchema = z.object({
  sow_id: z.number().int().positive(),
  event_type: z.string().min(1),
  schedule_date: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), { message: "Invalid schedule_date format" }),
  status: z.string().min(1),
  note: z.string().optional(),
});

// Partial schema allows optional fields for updates
export const notificationUpdateSchema = notificationsSchema.partial();
