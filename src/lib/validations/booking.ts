import { z } from "zod";

const tattooSizeEnum = z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]);

export const createBookingSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters"),
  size: tattooSizeEnum,
  placement: z.string().min(1, "Placement is required"),
  isFirstTattoo: z.boolean().default(false),
  preferredDates: z
    .array(z.string())
    .max(3, "Maximum 3 preferred dates")
    .optional(),
  medicalNotes: z.string().optional(),
  photoUrls: z.array(z.string().url()).optional(),
});

export const updateBookingClientSchema = z.object({
  description: z.string().min(10, "Description must be at least 10 characters").optional(),
  size: tattooSizeEnum.optional(),
  placement: z.string().min(1, "Placement is required").optional(),
  isFirstTattoo: z.boolean().optional(),
  preferredDates: z
    .array(z.string())
    .min(1, "At least one preferred date is required")
    .max(3, "Maximum 3 preferred dates")
    .optional(),
  medicalNotes: z.string().optional(),
});

export const approveBookingSchema = z.object({
  appointmentDate: z.string().min(1, "Appointment date is required"),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  duration: z.number().int().positive().default(120),
  depositAmount: z.number().positive("Deposit amount must be positive"),
  totalAmount: z.number().positive().optional(),
  artistNotes: z.string().optional(),
});

export const declineBookingSchema = z.object({
  reason: z.string().min(1, "A reason for declining is required"),
});

export const requestInfoSchema = z.object({
  artistNotes: z.string().min(1, "A message is required"),
});
