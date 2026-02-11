import { z } from "zod";

const timeRegex = /^\d{2}:\d{2}$/;
const optionalTime = z.string().regex(timeRegex, "Time must be in HH:MM format").nullable().optional();

export const createBookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.enum(["FLASH", "CUSTOM"]),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  mondayStart: optionalTime,
  mondayEnd: optionalTime,
  tuesdayStart: optionalTime,
  tuesdayEnd: optionalTime,
  wednesdayStart: optionalTime,
  wednesdayEnd: optionalTime,
  thursdayStart: optionalTime,
  thursdayEnd: optionalTime,
  fridayStart: optionalTime,
  fridayEnd: optionalTime,
  saturdayStart: optionalTime,
  saturdayEnd: optionalTime,
  sundayStart: optionalTime,
  sundayEnd: optionalTime,
});

export const updateBookSchema = createBookSchema.partial();
