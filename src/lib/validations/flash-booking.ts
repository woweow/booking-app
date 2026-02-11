import { z } from "zod";

const tattooSizeEnum = z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]);

export const createFlashBookingSchema = z
  .object({
    flashPieceId: z.string().min(1),
    size: tattooSizeEnum,
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
    startTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
    endTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "End time must be after start time",
    path: ["endTime"],
  });
