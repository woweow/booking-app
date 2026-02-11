"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BookingForm } from "@/components/booking/booking-form";

type BookingData = {
  id: string;
  status: string;
  description: string;
  size: string;
  placement: string;
  isFirstTattoo: boolean;
  medicalNotes?: string | null;
};

export default function EditBookingPage() {
  const params = useParams();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${params.id}`);
        if (res.ok) {
          setBooking(await res.json());
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-muted-foreground">Booking not found</p>
        <Button asChild variant="outline">
          <Link href="/bookings">Back to bookings</Link>
        </Button>
      </div>
    );
  }

  if (!["PENDING", "INFO_REQUESTED"].includes(booking.status)) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-muted-foreground">
          This booking can no longer be edited
        </p>
        <Button asChild variant="outline">
          <Link href={`/bookings/${booking.id}`}>View Booking</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/bookings/${booking.id}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to booking
        </Link>
        <h1 className="text-2xl font-light tracking-wide">Edit Booking</h1>
        <p className="text-sm text-muted-foreground">
          Update your booking details
        </p>
      </div>

      <BookingForm
        bookingId={booking.id}
        isEdit
        initialData={{
          description: booking.description,
          size: booking.size,
          placement: booking.placement,
          isFirstTattoo: booking.isFirstTattoo,
          medicalNotes: booking.medicalNotes || "",
        }}
      />
    </div>
  );
}
