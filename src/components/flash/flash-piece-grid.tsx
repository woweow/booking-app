"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type FlashPieceWithSizes = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl: string;
  isRepeatable: boolean;
  isClaimed: boolean;
  sizes: { size: string; priceAmountCents: number; durationMinutes: number }[];
  _count: { bookings: number };
};

const sizeLabels: Record<string, string> = {
  SMALL: "S",
  MEDIUM: "M",
  LARGE: "L",
  EXTRA_LARGE: "XL",
};

function getPriceRange(sizes: { priceAmountCents: number }[]): string {
  if (sizes.length === 0) return "$0";
  const prices = sizes.map((s) => s.priceAmountCents);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return `$${(min / 100).toFixed(0)}`;
  return `$${(min / 100).toFixed(0)} - $${(max / 100).toFixed(0)}`;
}

export function FlashPieceGrid({
  pieces,
  onEdit,
  onDelete,
}: {
  pieces: FlashPieceWithSizes[];
  onEdit: (piece: FlashPieceWithSizes) => void;
  onDelete: (piece: FlashPieceWithSizes) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="group relative rounded-lg border overflow-hidden bg-card"
        >
          <div className="aspect-square relative">
            <img
              src={piece.imageUrl}
              alt={piece.name}
              className="w-full h-full object-cover"
            />
            {!piece.isRepeatable && piece.isClaimed && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white font-medium text-sm">Taken</span>
              </div>
            )}
          </div>
          <div className="p-3 space-y-1.5">
            <p className="font-medium text-sm truncate">{piece.name}</p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {getPriceRange(piece.sizes)}
              </span>
              <div className="flex gap-1">
                {piece.sizes.map((s) => (
                  <Badge
                    key={s.size}
                    variant="secondary"
                    className="text-xs px-1.5"
                  >
                    {sizeLabels[s.size] || s.size}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(piece)}
                className="flex-1 h-8"
              >
                <Pencil className="size-3 mr-1" /> Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(piece)}
                className="flex-1 h-8 text-destructive hover:text-destructive"
              >
                <Trash2 className="size-3 mr-1" /> Delete
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
