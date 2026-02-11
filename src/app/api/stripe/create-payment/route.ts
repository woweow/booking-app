import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, BookingStatus } from "@prisma/client";
import { getStripe } from "@/lib/stripe";
import { createPaymentSchema } from "@/lib/validations/payment";
import { checkRateLimit, paymentRateLimiter, getClientIp } from "@/lib/rate-limit";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: "Only clients can make payments" }, { status: 403 });
    }

    // Rate limit
    const clientIp = getClientIp(request);
    const rateLimitResponse = await checkRateLimit(paymentRateLimiter, clientIp);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const result = createPaymentSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { bookingId } = result.data;

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Payment service is not configured" },
        { status: 503 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        client: { select: { id: true, email: true, name: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.clientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (booking.status !== BookingStatus.AWAITING_DEPOSIT) {
      return NextResponse.json(
        { error: "Booking is not awaiting deposit payment" },
        { status: 400 }
      );
    }

    if (!booking.depositAmount) {
      return NextResponse.json(
        { error: "Deposit amount has not been set" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Tattoo Deposit",
              description: "Deposit for tattoo appointment with Jane",
            },
            unit_amount: booking.depositAmount,
          },
          quantity: 1,
        },
      ],
      customer_email: booking.client.email,
      metadata: {
        bookingId: booking.id,
        clientId: booking.clientId,
        type: "deposit",
      },
      success_url: `${baseUrl}/bookings/${booking.id}?payment=success`,
      cancel_url: `${baseUrl}/bookings/${booking.id}?payment=cancelled`,
    });

    await createAuditLog({
      action: AuditAction.PAYMENT_INITIATED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.PAYMENT,
      resourceId: booking.id,
      result: AuditResult.SUCCESS,
      details: { sessionId: checkoutSession.id, amount: booking.depositAmount },
      request,
    });

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("Create payment error:", error);
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 }
    );
  }
}
