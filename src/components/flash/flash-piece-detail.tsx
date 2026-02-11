"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type FlashPieceSize = {
  id: string;
  size: string;
  priceAmountCents: number;
  durationMinutes: number;
};

type FlashPiece = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl: string;
  isRepeatable: boolean;
  isClaimed: boolean;
  sizes: FlashPieceSize[];
};

const sizeLabels: Record<string, string> = {
  SMALL: 'Small (<2")',
  MEDIUM: 'Medium (2-4")',
  LARGE: 'Large (4-6")',
  EXTRA_LARGE: 'Extra Large (6"+)',
};

export function FlashPieceDetail({
  piece,
  bookId,
  open,
  onOpenChange,
}: {
  piece: FlashPiece | null;
  bookId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [selectedSize, setSelectedSize] = useState<string>("");

  useEffect(() => {
    if (piece?.sizes.length) {
      setSelectedSize(piece.sizes[0].size);
    }
  }, [piece]);

  if (!piece) return null;

  const selectedSizeData = piece.sizes.find((s) => s.size === selectedSize);

  function handleBook() {
    if (!piece || !selectedSize) return;
    const params = new URLSearchParams({
      pieceId: piece.id,
      size: selectedSize,
      bookId,
    });

    if (!session) {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(`/bookings/flash?${params.toString()}`)}`
      );
    } else {
      router.push(`/bookings/flash?${params.toString()}`);
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md gap-0 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="relative">
          <img
            src={piece.imageUrl}
            alt={piece.name}
            className="w-full max-h-80 sm:max-h-96 object-contain bg-muted"
          />
        </div>

        <div className="p-4 space-y-4">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg font-medium">
              {piece.name}
            </DialogTitle>
            {piece.description && (
              <DialogDescription>{piece.description}</DialogDescription>
            )}
          </DialogHeader>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">Select Size</p>
            <RadioGroup
              value={selectedSize}
              onValueChange={setSelectedSize}
              className="space-y-2"
            >
              {piece.sizes.map((s) => (
                <label
                  key={s.size}
                  htmlFor={s.size}
                  className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 [&:has([data-state=checked])]:border-[hsl(270_60%_55%)]"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={s.size} id={s.size} />
                    <div>
                      <p className="font-medium text-sm">
                        {sizeLabels[s.size] || s.size}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {s.durationMinutes} min session
                      </p>
                    </div>
                  </div>
                  <span className="font-semibold">
                    ${(s.priceAmountCents / 100).toFixed(0)}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </div>

          <Button
            onClick={handleBook}
            disabled={!selectedSize}
            className="w-full bg-[hsl(270_60%_55%)] hover:bg-[hsl(270_60%_45%)] text-white"
          >
            {session
              ? `Book for $${selectedSizeData ? (selectedSizeData.priceAmountCents / 100).toFixed(0) : "..."}`
              : "Sign in to Book"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
