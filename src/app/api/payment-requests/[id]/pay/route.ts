import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, PaymentRequestStatus } from "@prisma/client";
import { getStripe } from "@/lib/stripe";
import { checkRateLimit, paymentRateLimiter, getClientIp } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResponse = await checkRateLimit(paymentRateLimiter, clientIp);
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const { id } = await params;

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        booking: {
          select: { id: true, clientId: true, description: true },
        },
      },
    });

    if (!paymentRequest) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    if (paymentRequest.booking.clientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (paymentRequest.status !== PaymentRequestStatus.PENDING) {
      return NextResponse.json(
        { error: "This payment request is no longer pending" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Payment — ${paymentRequest.booking.description.substring(0, 50)}`,
            },
            unit_amount: paymentRequest.amountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/bookings/${paymentRequest.booking.id}?pr=success`,
      cancel_url: `${baseUrl}/bookings/${paymentRequest.booking.id}?pr=cancelled`,
      metadata: {
        bookingId: paymentRequest.booking.id,
        clientId: session.user.id,
        type: "payment_request",
        paymentRequestId: paymentRequest.id,
      },
    });

    await prisma.paymentRequest.update({
      where: { id },
      data: { stripeCheckoutSessionId: checkoutSession.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Pay payment request error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
