"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { CheckCircle, Loader2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ConsentFormComponent } from "@/components/consent/consent-form";

type BookingForConsent = {
  id: string;
  status: string;
  clientId: string;
  consentForm?: {
    id: string;
    signedAt: string;
  } | null;
};

export default function ConsentPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<BookingForConsent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bookingId = params.bookingId as string;

  useEffect(() => {
    async function fetchBooking() {
      try {
        const res = await fetch(`/api/bookings/${bookingId}`);
        if (!res.ok) {
          setError("Booking not found");
          return;
        }
        setBooking(await res.json());
      } catch {
        setError("Something went wrong");
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-muted-foreground">{error || "Booking not found"}</p>
        <Button asChild variant="outline">
          <Link href="/bookings">Back to bookings</Link>
        </Button>
      </div>
    );
  }

  // Already submitted
  if (booking.consentForm) {
    return (
      <div className="mx-auto max-w-lg space-y-6 py-12">
        <Card className="border-[hsl(82_8%_48%)]/30">
          <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
            <CheckCircle className="size-12 text-[hsl(82_8%_48%)]" />
            <div>
              <h2 className="text-xl font-medium text-[hsl(82_8%_48%)]">
                Consent Form Already Submitted
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Signed on{" "}
                {format(
                  new Date(booking.consentForm.signedAt),
                  "MMMM d, yyyy 'at' h:mm a"
                )}
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              If you need to make changes, please contact the artist directly.
            </p>
            <Button asChild variant="outline">
              <Link href={`/bookings/${bookingId}`}>Back to Booking</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/bookings/${bookingId}`}
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to booking
        </Link>
        <h1 className="text-2xl font-light tracking-wide">
          Tattoo Consent Form
        </h1>
        <p className="text-sm text-muted-foreground">
          Please complete all required fields before your appointment. This form
          must be submitted at least 24 hours before your scheduled appointment.
        </p>
      </div>

      <ConsentFormComponent
        bookingId={bookingId}
        userName={session?.user?.name || ""}
      />
    </div>
  );
}
