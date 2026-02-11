"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, CalendarOff } from "lucide-react";

import { BookingForm } from "@/components/booking/booking-form";

export default function NewBookingPage() {
  const [loading, setLoading] = useState(true);
  const [hasActiveCustomBook, setHasActiveCustomBook] = useState(false);

  useEffect(() => {
    async function checkBooks() {
      try {
        const res = await fetch("/api/books");
        if (res.ok) {
          const data = await res.json();
          const books = data.books || [];
          const hasCustom = books.some(
            (b: { type: string; isActive: boolean }) =>
              b.type === "CUSTOM" && b.isActive
          );
          setHasActiveCustomBook(hasCustom);
        }
      } catch {
        // If check fails, still show the form — booking POST will fail with a clear error
        setHasActiveCustomBook(true);
      } finally {
        setLoading(false);
      }
    }
    checkBooks();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/bookings"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to bookings
        </Link>
        <h1 className="text-2xl font-light tracking-wide">New Booking</h1>
        <p className="text-sm text-muted-foreground">
          Request a tattoo appointment with Jane
        </p>
      </div>

      {hasActiveCustomBook ? (
        <BookingForm />
      ) : (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <CalendarOff className="size-12 text-muted-foreground" />
          <div>
            <p className="font-medium">
              Not accepting custom requests right now
            </p>
            <p className="text-sm text-muted-foreground">
              Check back soon!
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
