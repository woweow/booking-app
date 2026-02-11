import { z } from "zod";

export const createPaymentRequestSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  amountDollars: z.number().positive("Amount must be positive"),
  note: z.string().max(500, "Note must be 500 characters or less").optional(),
});

export const payPaymentRequestSchema = z.object({
  paymentRequestId: z.string().min(1, "Payment request ID is required"),
});
