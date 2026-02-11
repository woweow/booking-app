"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BookingForm } from "@/components/booking/booking-form";

export default function NewBookingPage() {
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

      <BookingForm />
    </div>
  );
}
