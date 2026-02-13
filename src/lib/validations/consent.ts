import { z } from "zod";

export const consentFormSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  fullLegalName: z.string().min(1, "Full legal name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  emergencyContact: z.string().min(1, "Emergency contact name is required"),
  emergencyPhone: z.string().min(1, "Emergency contact phone is required").max(20),
  skinConditions: z.string().max(500).optional().or(z.literal("")),
  allergies: z.string().max(500).optional().or(z.literal("")),
  medications: z.string().max(500).optional().or(z.literal("")),
  bloodDisorders: z.boolean().default(false),
  isPregnant: z.boolean().default(false),
  recentSubstances: z.boolean().default(false),
  risksAcknowledged: z.literal(true, "You must acknowledge the risks"),
  aftercareAgreed: z.literal(true, "You must agree to follow aftercare instructions"),
  photoReleaseAgreed: z.boolean().default(false),
  signatureDataUrl: z.string().min(1, "Signature is required"),
});
