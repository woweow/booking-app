"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Ruler,
  UserCircle,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/booking/status-badge";
import { BookingActions } from "@/components/booking/booking-actions";

const sizeLabels: Record<string, string> = {
  SMALL: "Small (Under 2\")",
  MEDIUM: "Medium (2-4\")",
  LARGE: "Large (4-6\")",
  EXTRA_LARGE: "Extra Large (Over 6\")",
};

type BookingDetail = {
  id: string;
  status: string;
  description: string;
  size: string;
  placement: string;
  isFirstTattoo: boolean;
  preferredDates: string;
  medicalNotes?: string | null;
  artistNotes?: string | null;
  declineReason?: string | null;
  appointmentDate?: string | null;
  duration?: number | null;
  depositAmount?: number | null;
  totalAmount?: number | null;
  depositPaidAt?: string | null;
  createdAt: string;
  client?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  photos?: { id: string; blobUrl: string; filename: string }[];
  consentForm?: { id: string; signedAt: string } | null;
};

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isArtist = session?.user?.role === "ARTIST";

  useEffect(() => {
    const payment = searchParams.get("payment");
    if (payment === "success") toast.success("Deposit paid successfully!");
    if (payment === "cancelled") toast.info("Payment was cancelled");
  }, [searchParams]);

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

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/bookings/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Booking cancelled successfully");
        router.refresh();
        setCancelOpen(false);
        // Refetch
        const res2 = await fetch(`/api/bookings/${params.id}`);
        if (res2.ok) setBooking(await res2.json());
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCancelling(false);
    }
  }

  async function handlePayDeposit() {
    try {
      const res = await fetch("/api/stripe/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: params.id }),
      });

      if (res.ok) {
        const { url } = await res.json();
        if (url) {
          window.location.href = url;
          return;
        }
      }
      toast.error("Failed to create payment session");
    } catch {
      toast.error("Something went wrong");
    }
  }

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

  const preferredDates: string[] = (() => {
    try {
      return JSON.parse(booking.preferredDates);
    } catch {
      return [];
    }
  })();

  const canEdit = ["PENDING", "INFO_REQUESTED"].includes(booking.status);
  const canCancel = !["COMPLETED", "CANCELLED", "DECLINED"].includes(
    booking.status
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/bookings"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to bookings
        </Link>

        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h1 className="text-2xl font-light tracking-wide">
                Booking Details
              </h1>
              <StatusBadge status={booking.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Submitted {format(new Date(booking.createdAt), "MMMM d, yyyy")}
            </p>
          </div>

          {!isArtist && (
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="outline" asChild>
                  <Link href={`/bookings/${booking.id}/edit`}>
                    Edit Booking
                  </Link>
                </Button>
              )}
              {canCancel && (
                <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive">Cancel Booking</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Booking</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to cancel this booking? This
                        action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setCancelOpen(false)}
                      >
                        Keep Booking
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={cancelling}
                      >
                        {cancelling && (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        )}
                        Cancel Booking
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Payment required (client, awaiting deposit) */}
          {!isArtist && booking.status === "AWAITING_DEPOSIT" && booking.depositAmount && (
            <Card className="border-accent">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-medium">
                  <CreditCard className="size-5" />
                  Payment Required
                </CardTitle>
                <CardDescription>
                  A deposit is required to confirm your appointment
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <p className="text-3xl font-light">
                  ${(booking.depositAmount / 100).toFixed(2)}
                </p>
                <Button onClick={handlePayDeposit} className="gap-2">
                  <CreditCard className="size-4" />
                  Pay Deposit
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Deposit paid */}
          {booking.depositPaidAt && (
            <Card className="border-[hsl(82_8%_48%)]/30">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle className="size-5 text-[hsl(82_8%_48%)]" />
                <div>
                  <p className="font-medium text-[hsl(82_8%_48%)]">
                    Deposit Paid
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Paid on{" "}
                    {format(new Date(booking.depositPaidAt), "MMMM d, yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Client info (artist view) */}
          {isArtist && booking.client && (
            <Card>
              <CardHeader>
                <CardTitle className="font-medium">Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <UserCircle className="size-5 text-muted-foreground" />
                  <span>{booking.client.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="size-5 text-muted-foreground" />
                  <span>{booking.client.email}</span>
                </div>
                {booking.client.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="size-5 text-muted-foreground" />
                    <span>{booking.client.phone}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tattoo details */}
          <Card>
            <CardHeader>
              <CardTitle className="font-medium">
                Tattoo Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p className="mt-1">{booking.description}</p>
              </div>

              <Separator />

              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <Ruler className="size-4 text-muted-foreground" />
                  <Badge variant="secondary">
                    {sizeLabels[booking.size] || booking.size}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span className="text-sm">{booking.placement}</span>
                </div>
                {booking.isFirstTattoo && (
                  <Badge variant="outline">First Tattoo</Badge>
                )}
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground">Preferred Dates</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {preferredDates.map((date) => (
                    <Badge key={date} variant="secondary">
                      {format(new Date(date), "EEEE, MMMM d, yyyy")}
                    </Badge>
                  ))}
                </div>
              </div>

              {booking.medicalNotes && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Medical Notes
                    </p>
                    <p className="mt-1 text-sm">{booking.medicalNotes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Photos */}
          {booking.photos && booking.photos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-medium">
                  Inspiration Photos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {booking.photos.map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.blobUrl}
                      alt={photo.filename}
                      className="aspect-square rounded-lg object-cover"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Artist notes */}
          {booking.artistNotes && (
            <Card>
              <CardHeader>
                <CardTitle className="font-medium">Artist Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{booking.artistNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* Decline reason */}
          {booking.declineReason && (
            <Card className="border-destructive/30">
              <CardHeader>
                <CardTitle className="font-medium text-destructive">
                  Decline Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{booking.declineReason}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Appointment */}
          {booking.appointmentDate && (
            <Card>
              <CardHeader>
                <CardTitle className="font-medium">Appointment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <CalendarDays className="size-5 text-muted-foreground" />
                  <span>
                    {format(
                      new Date(booking.appointmentDate),
                      "EEEE, MMMM d, yyyy"
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="size-5 text-muted-foreground" />
                  <span>
                    {format(new Date(booking.appointmentDate), "h:mm a")}
                  </span>
                </div>
                {booking.duration && (
                  <div className="flex items-center gap-3">
                    <Clock className="size-5 text-muted-foreground" />
                    <span>{booking.duration} minutes</span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment */}
          {(booking.depositAmount || booking.totalAmount) && (
            <Card>
              <CardHeader>
                <CardTitle className="font-medium">Payment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {booking.depositAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Deposit</span>
                    <span className="font-medium">
                      ${(booking.depositAmount / 100).toFixed(2)}
                      {booking.depositPaidAt && (
                        <Badge
                          variant="outline"
                          className="ml-2 text-[hsl(82_8%_48%)]"
                        >
                          Paid
                        </Badge>
                      )}
                    </span>
                  </div>
                )}
                {booking.totalAmount && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-medium">
                        ${(booking.totalAmount / 100).toFixed(2)}
                      </span>
                    </div>
                    {booking.depositAmount && booking.depositPaidAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-medium">
                          $
                          {(
                            (booking.totalAmount - booking.depositAmount) /
                            100
                          ).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Consent form */}
          {booking.status === "CONFIRMED" && (
            <Card
              className={
                booking.consentForm
                  ? "border-[hsl(82_8%_48%)]/30"
                  : "border-accent"
              }
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-medium">
                  <FileText className="size-5" />
                  Consent Form
                </CardTitle>
              </CardHeader>
              <CardContent>
                {booking.consentForm ? (
                  <div className="flex items-center gap-2 text-sm text-[hsl(82_8%_48%)]">
                    <CheckCircle className="size-4" />
                    Signed on{" "}
                    {format(
                      new Date(booking.consentForm.signedAt),
                      "MMMM d, yyyy"
                    )}
                  </div>
                ) : !isArtist ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Please complete the consent form before your appointment.
                    </p>
                    <Button asChild className="w-full">
                      <Link href={`/consent/${booking.id}`}>
                        Fill Out Consent Form
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="size-4" />
                    Not yet signed
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Artist actions */}
          {isArtist && (
            <Card>
              <CardHeader>
                <CardTitle className="font-medium">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <BookingActions
                  bookingId={booking.id}
                  status={booking.status}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
