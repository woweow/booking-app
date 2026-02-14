import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, BookingStatus } from "@prisma/client";
import { createPaymentRequestSchema } from "@/lib/validations/payment-request";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";
import { checkRateLimit, paymentRateLimiter, getClientIp } from "@/lib/rate-limit";
import { sendEmail, paymentRequestEmail } from "@/lib/email";
import { trackNotification } from "@/lib/notifications";

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResponse = await checkRateLimit(paymentRateLimiter, clientIp);
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = createPaymentRequestSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { bookingId, amountDollars, note } = result.data;
    const amountCents = Math.round(amountDollars * 100);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (
      booking.status !== BookingStatus.CONFIRMED &&
      booking.status !== BookingStatus.COMPLETED
    ) {
      return NextResponse.json(
        { error: "Payment requests can only be sent for confirmed or completed bookings" },
        { status: 400 }
      );
    }

    // Transaction: create PaymentRequest + Message + enable chat
    const paymentRequest = await prisma.$transaction(async (tx) => {
      const pr = await tx.paymentRequest.create({
        data: {
          bookingId,
          amountCents,
          note: note || null,
        },
      });

      await tx.message.create({
        data: {
          bookingId,
          senderId: session.user.id,
          content: `Payment request: $${amountDollars.toFixed(2)}${note ? ` — ${note}` : ""}`,
          type: "PAYMENT_REQUEST",
          paymentRequestId: pr.id,
        },
      });

      if (!booking.chatEnabled) {
        await tx.booking.update({
          where: { id: bookingId },
          data: { chatEnabled: true },
        });
      }

      return pr;
    });

    // Track payment request email (non-blocking)
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const bookingLink = `${baseUrl}/bookings/${bookingId}`;
    const emailData = paymentRequestEmail(
      booking.client.name,
      amountCents,
      note || null,
      bookingLink
    );
    trackNotification({
      bookingId,
      type: "PAYMENT_REQUEST",
      channel: "EMAIL",
      sendFn: () => sendEmail(booking.client.email, emailData.subject, emailData.html),
    }).catch((err) => console.error("Failed to track payment request email:", err));

    await createAuditLog({
      action: AuditAction.PAYMENT_REQUEST_CREATED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.PAYMENT_REQUEST,
      resourceId: paymentRequest.id,
      result: AuditResult.SUCCESS,
      details: { bookingId, amountCents, note },
      request,
    });

    return NextResponse.json({ paymentRequest }, { status: 201 });
  } catch (error) {
    console.error("Create payment request error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
