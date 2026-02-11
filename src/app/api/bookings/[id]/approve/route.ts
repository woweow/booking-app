import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, BookingStatus } from "@prisma/client";
import { approveBookingSchema } from "@/lib/validations/booking";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";
import { scheduleBookingNotifications } from "@/lib/notifications";
import { sendEmail, depositRequestEmail } from "@/lib/email";
import { sendSMS, bookingApprovedSMS } from "@/lib/sms";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Only artists can approve bookings" }, { status: 403 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.INFO_REQUESTED
    ) {
      return NextResponse.json(
        { error: "Only pending or info-requested bookings can be approved" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = approveBookingSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const { appointmentDate, appointmentTime, duration, depositAmount, totalAmount, artistNotes } =
      result.data;

    // Combine date and time
    const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}:00`);

    // Convert dollars to cents
    const depositAmountCents = Math.round(depositAmount * 100);
    const totalAmountCents = totalAmount ? Math.round(totalAmount * 100) : null;

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.AWAITING_DEPOSIT,
        appointmentDate: appointmentDateTime,
        duration,
        depositAmount: depositAmountCents,
        totalAmount: totalAmountCents,
        artistNotes: artistNotes || null,
        chatEnabled: true,
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        photos: true,
      },
    });

    await createAuditLog({
      action: AuditAction.BOOKING_APPROVED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.BOOKING,
      resourceId: id,
      result: AuditResult.SUCCESS,
      details: {
        appointmentDate: appointmentDateTime.toISOString(),
        depositAmountCents,
        clientId: booking.clientId,
      },
      request,
    });

    // Schedule automated notifications (non-blocking)
    scheduleBookingNotifications(id, appointmentDateTime).catch((err) =>
      console.error("Failed to schedule notifications:", err)
    );

    // Send immediate deposit request email and SMS (non-blocking)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const paymentLink = `${baseUrl}/bookings/${id}`;
    const apptDateStr = appointmentDateTime.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailData = depositRequestEmail(
      updated.client.name,
      depositAmountCents,
      apptDateStr,
      paymentLink
    );
    sendEmail(updated.client.email, emailData.subject, emailData.html).catch((err) =>
      console.error("Failed to send deposit email:", err)
    );

    if (updated.client.phone) {
      const smsBody = bookingApprovedSMS(updated.client.name, apptDateStr);
      sendSMS(updated.client.phone, smsBody).catch((err) =>
        console.error("Failed to send approval SMS:", err)
      );
    }

    return NextResponse.json({ booking: updated });
  } catch (error) {
    console.error("Approve booking error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
