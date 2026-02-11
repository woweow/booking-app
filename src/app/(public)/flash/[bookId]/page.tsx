"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { FlashPieceDetail } from "@/components/flash/flash-piece-detail";

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

type CatalogData = {
  book: { id: string; name: string; description?: string | null };
  flashPieces: FlashPiece[];
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

export default function FlashCatalogPage() {
  const params = useParams();
  const bookId = params.bookId as string;

  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<FlashPiece | null>(null);

  useEffect(() => {
    async function fetchCatalog() {
      try {
        const res = await fetch(`/api/flash-catalog/${bookId}`);
        if (res.status === 404) {
          setNotFound(true);
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setCatalog(data);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchCatalog();
  }, [bookId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !catalog) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-light text-muted-foreground">
          Flash book not found
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This flash book may have ended or doesn&apos;t exist.
        </p>
      </div>
    );
  }

  const availablePieces = catalog.flashPieces.filter(
    (p) => p.isRepeatable || !p.isClaimed
  );
  const claimedPieces = catalog.flashPieces.filter(
    (p) => !p.isRepeatable && p.isClaimed
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wide">
          {catalog.book.name}
        </h1>
        {catalog.book.description && (
          <p className="mt-1 text-sm text-muted-foreground">
            {catalog.book.description}
          </p>
        )}
      </div>

      {catalog.flashPieces.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">No flash pieces available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Available pieces first, then claimed */}
          {[...availablePieces, ...claimedPieces].map((piece) => {
            const isTaken = !piece.isRepeatable && piece.isClaimed;

            return (
              <button
                key={piece.id}
                onClick={() => !isTaken && setSelectedPiece(piece)}
                disabled={isTaken}
                className="group relative rounded-lg border overflow-hidden bg-card text-left transition-colors hover:border-ring disabled:cursor-not-allowed"
              >
                <div className="aspect-square relative">
                  <img
                    src={piece.imageUrl}
                    alt={piece.name}
                    className="w-full h-full object-cover"
                  />
                  {isTaken && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        Taken
                      </span>
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
                </div>
              </button>
            );
          })}
        </div>
      )}

      <FlashPieceDetail
        piece={selectedPiece}
        bookId={bookId}
        open={!!selectedPiece}
        onOpenChange={(open) => {
          if (!open) setSelectedPiece(null);
        }}
      />
    </div>
  );
}
