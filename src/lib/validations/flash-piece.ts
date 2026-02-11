import { z } from "zod";

const tattooSizeEnum = z.enum(["SMALL", "MEDIUM", "LARGE", "EXTRA_LARGE"]);

const flashPieceSizeSchema = z.object({
  size: tattooSizeEnum,
  priceAmountCents: z.number().int().min(100).max(10_000_000),
  durationMinutes: z.number().int().min(15).max(480),
});

export const createFlashPieceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  imageUrl: z.string().url(),
  isRepeatable: z.boolean(),
  sizes: z
    .array(flashPieceSizeSchema)
    .min(1)
    .max(4)
    .refine(
      (sizes) => new Set(sizes.map((s) => s.size)).size === sizes.length,
      { message: "Each size can only be listed once" }
    ),
});

export const updateFlashPieceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(1000).optional().nullable(),
  imageUrl: z.string().url().optional(),
  isRepeatable: z.boolean().optional(),
  sizes: z
    .array(flashPieceSizeSchema)
    .min(1)
    .max(4)
    .refine(
      (sizes) => new Set(sizes.map((s) => s.size)).size === sizes.length,
      { message: "Each size can only be listed once" }
    )
    .optional(),
});
