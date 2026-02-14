"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Download,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
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
import { AvailabilityPicker } from "@/components/booking/availability-picker";
import { OutreachTimeline } from "@/components/booking/outreach-timeline";
import {
  PaymentRequired,
  PaymentSuccess,
  PaymentCancelled,
  DepositPaid,
} from "@/components/payment/payment-status";

const sizeLabels: Record<string, string> = {
  SMALL: "Small (Under 2\")",
  MEDIUM: "Medium (2-4\")",
  LARGE: "Large (4-6\")",
  EXTRA_LARGE: "Extra Large (Over 6\")",
};

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

type BookingDetail = {
  id: string;
  status: string;
  bookingType: string;
  description: string;
  size: string;
  placement?: string | null;
  isFirstTattoo: boolean;
  preferredDates: string;
  medicalNotes?: string | null;
  artistNotes?: string | null;
  declineReason?: string | null;
  appointmentDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  duration?: number | null;
  depositAmount?: number | null;
  totalAmount?: number | null;
  depositPaidAt?: string | null;
  chatEnabled?: boolean;
  createdAt: string;
  client?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
  };
  photos?: { id: string; blobUrl: string; filename: string }[];
  consentForm?: { id: string; signedAt: string } | null;
  book?: {
    id: string;
    name: string;
    type: string;
    depositAmountCents?: number | null;
  } | null;
  flashPiece?: {
    id: string;
    name: string;
    description?: string | null;
    imageUrl: string;
    sizes: { size: string; priceAmountCents: number; durationMinutes: number }[];
  } | null;
  paymentRequests?: {
    id: string;
    amountCents: number;
    note?: string | null;
    status: string;
    paidAt?: string | null;
    createdAt: string;
  }[];
};

type Slot = { start: string; end: string };

function ScheduleSection({
  bookingId,
  bookId,
  duration,
  onScheduled,
}: {
  bookingId: string;
  bookId: string;
  duration: number;
  onScheduled: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [selectedSlot, setSelectedSlot] = useState<Slot | undefined>();
  const [scheduling, setScheduling] = useState(false);

  function handleSlotSelect(date: string, slot: Slot) {
    setSelectedDate(date);
    setSelectedSlot(slot);
  }

  async function handleConfirm() {
    if (!selectedDate || !selectedSlot) return;

    setScheduling(true);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        const altMsg = data.alternativeSlot
          ? ` Try ${formatTime(data.alternativeSlot.start)} - ${formatTime(data.alternativeSlot.end)} instead.`
          : "";
        toast.error(`That slot was just taken.${altMsg}`);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to schedule");
        return;
      }

      toast.success("Appointment scheduled! Please pay your deposit to confirm.");
      onScheduled();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setScheduling(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium">Choose Your Appointment Time</CardTitle>
        <CardDescription>
          Select a date and time slot for your session
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AvailabilityPicker
          bookId={bookId}
          duration={duration}
          onSlotSelect={handleSlotSelect}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
        />

        {selectedDate && selectedSlot && (
          <div className="flex flex-col gap-3 rounded-lg border border-[hsl(82_8%_48%)]/30 bg-[hsl(82_8%_48%)]/5 p-4">
            <div className="text-sm">
              <span className="font-medium">Selected: </span>
              {format(new Date(selectedDate + "T12:00:00"), "EEEE, MMMM d, yyyy")}
              {" at "}
              {formatTime(selectedSlot.start)} - {formatTime(selectedSlot.end)}
            </div>
            <Button
              onClick={handleConfirm}
              disabled={scheduling}
              className="w-full bg-[hsl(82_8%_48%)] hover:bg-[hsl(82_8%_42%)] sm:w-auto"
            >
              {scheduling && <Loader2 className="mr-2 size-4 animate-spin" />}
              {scheduling ? "Confirming..." : "Confirm This Time"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BookingDetailContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const isArtist = session?.user?.role === "ARTIST";
  const paymentParam = searchParams.get("payment");
  const prParam = searchParams.get("pr");

  useEffect(() => {
    if (paymentParam === "success") toast.success("Deposit paid successfully!");
    if (paymentParam === "cancelled") toast.info("Payment was cancelled");
    if (prParam === "success") toast.success("Payment completed!");
    if (prParam === "cancelled") toast.info("Payment was cancelled");
  }, [paymentParam, prParam]);

  async function fetchBooking() {
    try {
      const res = await fetch(`/api/bookings/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setBooking(data.booking ?? data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const res2 = await fetch(`/api/bookings/${params.id}`);
        if (res2.ok) {
          const data2 = await res2.json();
          setBooking(data2.booking ?? data2);
        }
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
              <StatusBadge status={booking.status} isArtist={isArtist} />
            </div>
            <p className="text-sm text-muted-foreground">
              {booking.createdAt
                ? `Submitted ${format(new Date(booking.createdAt), "MMMM d, yyyy")}`
                : "Submission date unavailable"}
            </p>
          </div>

          {!isArtist && (
            <div className="flex gap-2">
              {canEdit && booking.bookingType !== "FLASH" && (
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
          {/* Payment status cards */}
          {!isArtist && paymentParam === "success" && <PaymentSuccess />}
          {!isArtist &&
            paymentParam === "cancelled" &&
            booking.depositAmount && (
              <PaymentCancelled
                bookingId={booking.id}
                depositAmount={booking.depositAmount}
              />
            )}
          {!isArtist &&
            !paymentParam &&
            booking.status === "AWAITING_DEPOSIT" &&
            booking.depositAmount && (
              <PaymentRequired
                bookingId={booking.id}
                depositAmount={booking.depositAmount}
                totalAmount={booking.totalAmount}
              />
            )}
          {booking.depositPaidAt && (
            <DepositPaid paidAt={booking.depositPaidAt} />
          )}

          {/* Client self-scheduling (APPROVED status) */}
          {!isArtist && booking.status === "APPROVED" && booking.book?.id && booking.duration && (
            <ScheduleSection
              bookingId={booking.id}
              bookId={booking.book.id}
              duration={booking.duration}
              onScheduled={() => fetchBooking()}
            />
          )}
          {!isArtist && booking.status === "APPROVED" && !booking.book?.id && (
            <Card className="border-accent">
              <CardContent className="flex items-center gap-3 py-6">
                <AlertCircle className="size-5 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  No appointment times available yet. Check back soon!
                </p>
              </CardContent>
            </Card>
          )}

          {/* Client info (artist view) */}
          {isArtist && booking.client && (
            <Card>
              <CardHeader>
                <CardTitle className="font-medium">
                  Client Information
                </CardTitle>
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
          {booking.bookingType === "FLASH" && booking.flashPiece ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="font-medium">Flash Design</CardTitle>
                  <Badge className="bg-[hsl(270_60%_55%)] text-white text-xs">Flash</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <img
                  src={booking.flashPiece.imageUrl}
                  alt={booking.flashPiece.name}
                  className="w-full max-w-sm rounded-lg object-contain"
                />
                <div>
                  <p className="font-medium">{booking.flashPiece.name}</p>
                  {booking.flashPiece.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{booking.flashPiece.description}</p>
                  )}
                </div>
                <Separator />
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <Ruler className="size-4 text-muted-foreground" />
                    <Badge variant="secondary">{sizeLabels[booking.size] || booking.size}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
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
                  {booking.placement && (
                    <div className="flex items-center gap-2">
                      <MapPin className="size-4 text-muted-foreground" />
                      <span className="text-sm">{booking.placement}</span>
                    </div>
                  )}
                  {booking.isFirstTattoo && (
                    <Badge variant="outline">First Tattoo</Badge>
                  )}
                </div>

                {preferredDates.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Preferred Dates
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {preferredDates
                          .filter((date) => date && !isNaN(new Date(date).getTime()))
                          .map((date) => (
                            <Badge key={date} variant="secondary">
                              {format(new Date(date), "EEEE, MMMM d, yyyy")}
                            </Badge>
                          ))}
                      </div>
                    </div>
                  </>
                )}

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
          )}

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

          {/* Outreach timeline (artist only) */}
          {isArtist && <OutreachTimeline bookingId={booking.id} />}

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
                    {booking.scheduledStartTime && booking.scheduledEndTime
                      ? `${formatTime(booking.scheduledStartTime)} - ${formatTime(booking.scheduledEndTime)}`
                      : format(new Date(booking.appointmentDate), "h:mm a")}
                  </span>
                </div>
                {booking.duration && (
                  <div className="flex items-center gap-3">
                    <Clock className="size-5 text-muted-foreground" />
                    <span>{booking.duration >= 60 ? `${booking.duration / 60} hours` : `${booking.duration} minutes`}</span>
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
                    <span className="text-muted-foreground">
                      Deposit <span className="text-xs">(non-refundable)</span>
                    </span>
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
                      <span className="text-muted-foreground">Service Estimate</span>
                      <span className="font-medium">
                        ${(booking.totalAmount / 100).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Payment Requests */}
          {booking.paymentRequests && booking.paymentRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="font-medium">Payment Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {booking.paymentRequests.map((pr) => (
                  <div
                    key={pr.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="min-w-0">
                      <span className="font-medium">
                        ${(pr.amountCents / 100).toFixed(2)}
                      </span>
                      {pr.note && (
                        <p className="truncate text-xs text-muted-foreground">
                          {pr.note}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        pr.status === "PAID"
                          ? "text-[hsl(82_8%_48%)] border-[hsl(82_8%_48%)]/30"
                          : pr.status === "CANCELLED"
                            ? "text-muted-foreground"
                            : ""
                      }
                    >
                      {pr.status === "PAID"
                        ? "Paid"
                        : pr.status === "CANCELLED"
                          ? "Cancelled"
                          : "Pending"}
                    </Badge>
                  </div>
                ))}
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
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-[hsl(82_8%_48%)]">
                      <CheckCircle className="size-4" />
                      {booking.consentForm.signedAt
                        ? `Signed on ${format(
                            new Date(booking.consentForm.signedAt),
                            "MMMM d, yyyy"
                          )}`
                        : "Signed"}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      asChild
                    >
                      <a
                        href={`/api/consent/${booking.consentForm.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download className="size-4" />
                        Download PDF
                      </a>
                    </Button>
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

          {/* Chat link */}
          {(isArtist || booking.chatEnabled) && (
            <Button asChild variant="outline" className="w-full gap-2">
              <Link href={`/messages?bookingId=${booking.id}`}>
                <MessageSquare className="size-4" />
                View Messages
              </Link>
            </Button>
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
                  defaultDepositCents={booking.book?.depositAmountCents}
                  totalAmountCents={booking.totalAmount}
                  unpaidPaymentRequestCount={
                    booking.paymentRequests?.filter(
                      (pr) => pr.status === "PENDING"
                    ).length ?? 0
                  }
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BookingDetailContent />
    </Suspense>
  );
}
