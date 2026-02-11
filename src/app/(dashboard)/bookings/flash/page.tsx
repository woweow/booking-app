"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { AvailabilityPicker } from "@/components/booking/availability-picker";

type FlashPieceSize = {
  size: string;
  priceAmountCents: number;
  durationMinutes: number;
};

type FlashPieceData = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl: string;
  isRepeatable: boolean;
  isClaimed: boolean;
  sizes: FlashPieceSize[];
  book: {
    id: string;
    name: string;
    depositAmountCents?: number | null;
  };
};

type Slot = { start: string; end: string };

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

const sizeLabels: Record<string, string> = {
  SMALL: 'Small (<2")',
  MEDIUM: 'Medium (2-4")',
  LARGE: 'Large (4-6")',
  EXTRA_LARGE: 'Extra Large (6"+)',
};

const steps = ["Review", "Schedule", "Confirm"];

function FlashBookingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const pieceId = searchParams.get("pieceId");
  const sizeParam = searchParams.get("size");
  const bookIdParam = searchParams.get("bookId");

  const [step, setStep] = useState(0);
  const [piece, setPiece] = useState<FlashPieceData | null>(null);
  const [selectedSize, setSelectedSize] = useState(sizeParam || "");
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<Slot | undefined>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPiece() {
      if (!pieceId || !bookIdParam) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`/api/flash-catalog/${bookIdParam}`);
        if (res.ok) {
          const data = await res.json();
          const found = data.flashPieces?.find(
            (p: { id: string }) => p.id === pieceId
          );
          if (found) {
            setPiece({
              ...found,
              book: {
                id: data.book.id,
                name: data.book.name,
                depositAmountCents: data.book.depositAmountCents,
              },
            });
          }
        }
      } catch {
        // silently fail — will show not-found state
      } finally {
        setLoading(false);
      }
    }
    fetchPiece();
  }, [pieceId, bookIdParam]);

  const selectedSizeData = piece?.sizes.find((s) => s.size === selectedSize);
  const depositAmount = piece?.book?.depositAmountCents || 0;

  const handleSlotSelect = useCallback(
    (date: string, slot: Slot) => {
      setSelectedDate(date);
      setSelectedSlot(slot);
    },
    []
  );

  async function handleSubmit() {
    if (!piece || !selectedSizeData || !selectedDate || !selectedSlot) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/flash-bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flashPieceId: piece.id,
          size: selectedSize,
          date: selectedDate,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        if (data.error?.includes("claimed")) {
          toast.error("This design has already been claimed");
          router.push(`/flash/${bookIdParam}`);
        } else {
          toast.error(
            "That time slot is no longer available. Please choose another."
          );
          setStep(1);
        }
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create booking");
        return;
      }

      const data = await res.json();
      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        router.push(`/bookings/${data.booking.id}`);
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!piece || !pieceId) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Link
          href={bookIdParam ? `/flash/${bookIdParam}` : "/bookings"}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <p className="text-muted-foreground">Flash piece not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={bookIdParam ? `/flash/${bookIdParam}` : "/bookings"}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to catalog
      </Link>

      <h1 className="text-2xl font-light tracking-wide">Book Flash Tattoo</h1>

      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {steps.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                "flex size-8 items-center justify-center rounded-full text-sm font-medium",
                i <= step
                  ? "bg-[hsl(270_60%_55%)] text-white"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </div>
            <span
              className={cn(
                "text-sm hidden sm:inline",
                i === step ? "font-medium" : "text-muted-foreground"
              )}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight className="size-4 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Review */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="rounded-lg border overflow-hidden">
            <img
              src={piece.imageUrl}
              alt={piece.name}
              className="w-full max-h-72 sm:max-h-96 object-contain bg-muted"
            />
          </div>

          <div>
            <h2 className="text-lg font-medium">{piece.name}</h2>
            {piece.description && (
              <p className="mt-1 text-sm text-muted-foreground">
                {piece.description}
              </p>
            )}
          </div>

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
                  htmlFor={`size-${s.size}`}
                  className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 [&:has([data-state=checked])]:border-[hsl(270_60%_55%)]"
                >
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value={s.size} id={`size-${s.size}`} />
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

          {selectedSizeData && (
            <Card>
              <CardContent className="pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tattoo price</span>
                  <span className="font-medium">
                    ${(selectedSizeData.priceAmountCents / 100).toFixed(2)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit due now</span>
                  <span className="font-medium">
                    ${(depositAmount / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Remaining balance
                  </span>
                  <span className="font-medium">
                    $
                    {(
                      (selectedSizeData.priceAmountCents - depositAmount) /
                      100
                    ).toFixed(2)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          <Button
            onClick={() => setStep(1)}
            disabled={!selectedSize}
            className="w-full bg-[hsl(270_60%_55%)] hover:bg-[hsl(270_60%_45%)] text-white"
          >
            Continue to Schedule
          </Button>
        </div>
      )}

      {/* Step 2: Schedule */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Mini summary */}
          <Card>
            <CardContent className="flex items-center gap-4 pt-4">
              <img
                src={piece.imageUrl}
                alt={piece.name}
                className="size-16 rounded-lg object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{piece.name}</p>
                <p className="text-xs text-muted-foreground">
                  {sizeLabels[selectedSize] || selectedSize}
                  {selectedSizeData &&
                    ` — $${(selectedSizeData.priceAmountCents / 100).toFixed(0)}`}
                </p>
              </div>
            </CardContent>
          </Card>

          <AvailabilityPicker
            bookId={piece.book.id}
            duration={selectedSizeData?.durationMinutes || 60}
            onSlotSelect={handleSlotSelect}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(0)}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={() => setStep(2)}
              disabled={!selectedDate || !selectedSlot}
              className="flex-1 bg-[hsl(270_60%_55%)] hover:bg-[hsl(270_60%_45%)] text-white"
            >
              Continue to Confirm
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm & Pay */}
      {step === 2 && selectedSizeData && selectedDate && selectedSlot && (
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-4 space-y-4">
              <div className="flex gap-4">
                <img
                  src={piece.imageUrl}
                  alt={piece.name}
                  className="size-20 rounded-lg object-cover"
                />
                <div className="space-y-1">
                  <p className="font-medium">{piece.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {sizeLabels[selectedSize] || selectedSize}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">
                    {format(
                      new Date(selectedDate + "T12:00:00"),
                      "EEEE, MMMM d, yyyy"
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">
                    {formatTime(selectedSlot.start)} -{" "}
                    {formatTime(selectedSlot.end)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">
                    {selectedSizeData.durationMinutes} min
                  </span>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tattoo price</span>
                  <span className="font-medium">
                    ${(selectedSizeData.priceAmountCents / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deposit due now</span>
                  <span className="font-semibold">
                    ${(depositAmount / 100).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Remaining at appointment
                  </span>
                  <span className="font-medium">
                    $
                    {(
                      (selectedSizeData.priceAmountCents - depositAmount) /
                      100
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1"
            >
              Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 bg-[hsl(270_60%_55%)] hover:bg-[hsl(270_60%_45%)] text-white"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin mr-2" />
              ) : null}
              {depositAmount > 0
                ? `Pay Deposit — $${(depositAmount / 100).toFixed(2)}`
                : "Confirm Booking"}
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Deposits are non-refundable unless cancelled by the artist.
          </p>
        </div>
      )}
    </div>
  );
}

export default function FlashBookingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <FlashBookingContent />
    </Suspense>
  );
}
