import { z } from "zod";

const timeRegex = /^\d{2}:\d{2}$/;

export const createTimeBlockSchema = z.object({
  date: z.string().min(1, "Date is required"),
  startTime: z.string().regex(timeRegex, "Start time must be in HH:MM format"),
  endTime: z.string().regex(timeRegex, "End time must be in HH:MM format"),
  notes: z.string().optional(),
});

export const createExceptionSchema = z
  .object({
    date: z.string().min(1, "Date is required"),
    type: z.enum(["UNAVAILABLE", "CUSTOM_HOURS"]),
    customStartTime: z.string().regex(timeRegex, "Start time must be in HH:MM format").optional(),
    customEndTime: z.string().regex(timeRegex, "End time must be in HH:MM format").optional(),
    reason: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.type === "CUSTOM_HOURS") {
        return !!data.customStartTime && !!data.customEndTime;
      }
      return true;
    },
    { message: "Custom hours require start and end times", path: ["customStartTime"] }
  );

export const bookAvailabilityQuerySchema = z.object({
  date: z.string().optional(),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format").optional(),
  bookId: z.string().optional(),
  duration: z.coerce.number().int().positive().optional(),
});
