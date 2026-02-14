import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, BookingStatus } from "@prisma/client";
import { scheduleBookingSchema } from "@/lib/validations/booking";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";
import { reserveSlot } from "@/lib/availability";
import { scheduleBookingNotifications } from "@/lib/notifications";
import { syncBookingToGoogleCalendar } from "@/lib/google-calendar";
import { sendEmail, depositRequestEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";
import { trackNotification } from "@/lib/notifications";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: "Only clients can schedule bookings" }, { status: 403 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        book: { select: { id: true, name: true, type: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.clientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (booking.status !== BookingStatus.APPROVED) {
      return NextResponse.json(
        { error: "Only approved bookings can be scheduled" },
        { status: 400 }
      );
    }

    if (!booking.bookId || !booking.book) {
      return NextResponse.json(
        { error: "No book assigned to this booking" },
        { status: 400 }
      );
    }

    if (!booking.duration) {
      return NextResponse.json(
        { error: "Booking duration not set" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = scheduleBookingSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const { date, startTime, endTime } = result.data;
    const appointmentDate = new Date(`${date}T${startTime}:00`);

    // Attempt atomic slot reservation
    const reservation = await reserveSlot(
      id,
      new Date(date),
      startTime,
      endTime,
      booking.bookId,
      booking.duration
    );

    if (!reservation.success) {
      if (reservation.error === "SLOT_TAKEN") {
        return NextResponse.json(
          {
            error: "This time slot is no longer available",
            alternativeSlot: reservation.alternativeSlot,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to reserve slot. Please try again." },
        { status: 500 }
      );
    }

    // Update booking with scheduled time
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.AWAITING_DEPOSIT,
        appointmentDate,
        scheduledStartTime: startTime,
        scheduledEndTime: endTime,
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        photos: true,
        book: { select: { id: true, name: true, type: true, depositAmountCents: true } },
      },
    });

    // Schedule automated notifications (non-blocking)
    scheduleBookingNotifications(id, appointmentDate).catch((err) =>
      console.error("Failed to schedule notifications:", err)
    );

    // Sync to Google Calendar (non-blocking)
    const endDateTime = new Date(`${date}T${endTime}:00`);
    syncBookingToGoogleCalendar(
      id,
      updated.client.name,
      booking.book.type,
      booking.description,
      appointmentDate,
      endDateTime
    ).catch((err) =>
      console.error("Failed to sync to Google Calendar:", err)
    );

    // Track deposit request notifications (non-blocking)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const paymentLink = `${baseUrl}/bookings/${id}`;
    const apptDateStr = appointmentDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (updated.depositAmount) {
      const emailData = depositRequestEmail(
        updated.client.name,
        updated.depositAmount,
        apptDateStr,
        paymentLink
      );
      trackNotification({
        bookingId: id,
        type: "DEPOSIT_REQUEST",
        channel: "EMAIL",
        sendFn: () => sendEmail(updated.client.email, emailData.subject, emailData.html),
      }).catch((err) => console.error("Failed to track deposit email:", err));
    }

    if (updated.client.phone) {
      const smsBody = `Hi ${updated.client.name}! Your appointment at Studio Saturn is set for ${apptDateStr}. Please pay your deposit to confirm: ${paymentLink}`;
      trackNotification({
        bookingId: id,
        type: "DEPOSIT_REQUEST",
        channel: "SMS",
        sendFn: () => sendSMS(updated.client.phone!, smsBody),
      }).catch((err) => console.error("Failed to track deposit SMS:", err));
    }

    // Audit log
    await createAuditLog({
      action: AuditAction.BOOKING_SCHEDULED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.BOOKING,
      resourceId: id,
      result: AuditResult.SUCCESS,
      details: {
        date,
        startTime,
        endTime,
        clientId: booking.clientId,
      },
      request,
    });

    return NextResponse.json({ booking: updated });
  } catch (error) {
    console.error("Schedule booking error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
