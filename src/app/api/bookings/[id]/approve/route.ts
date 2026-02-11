import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, BookingStatus } from "@prisma/client";
import { approveBookingSchema } from "@/lib/validations/booking";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";
import { sendEmail, bookingApprovedEmail } from "@/lib/email";
import { sendSMS } from "@/lib/sms";

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
      include: {
        book: { select: { id: true, depositAmountCents: true } },
      },
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

    const { duration, depositAmount, totalAmount, artistNotes } = result.data;

    // Convert dollars to cents
    const depositAmountCents = Math.round(depositAmount * 100);
    const totalAmountCents = totalAmount ? Math.round(totalAmount * 100) : null;

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.APPROVED,
        duration,
        depositAmount: depositAmountCents,
        totalAmount: totalAmountCents,
        artistNotes: artistNotes || null,
        chatEnabled: true,
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        photos: true,
        book: { select: { id: true, name: true, type: true, depositAmountCents: true } },
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
        depositAmountCents,
        clientId: booking.clientId,
      },
      request,
    });

    // Send "pick your time" email (non-blocking)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const bookingLink = `${baseUrl}/bookings/${id}`;

    const emailData = bookingApprovedEmail(updated.client.name, bookingLink);
    sendEmail(updated.client.email, emailData.subject, emailData.html).catch((err) =>
      console.error("Failed to send approval email:", err)
    );

    if (updated.client.phone) {
      const smsBody = `Hi ${updated.client.name}! Your booking at Studio Saturn has been approved. Choose your appointment time: ${bookingLink}`;
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
