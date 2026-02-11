import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { BookingStatus, PaymentRequestStatus } from "@prisma/client";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";
import Stripe from "stripe";

const MAX_EVENT_AGE_MS = 5 * 60 * 1000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 503 });
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "No signature provided" }, { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Timestamp validation: reject events older than 5 minutes
    const eventAge = Date.now() - event.created * 1000;
    if (eventAge > MAX_EVENT_AGE_MS) {
      return NextResponse.json({ error: "Event too old" }, { status: 400 });
    }

    // Idempotency: check if already processed
    const existing = await prisma.processedWebhookEvent.findUnique({
      where: { eventId: event.id },
    });

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    // Handle event types
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      const metadataType = session.metadata?.type;

      if (!bookingId) {
        console.error("Webhook: No bookingId in session metadata");
        return NextResponse.json({ received: true });
      }

      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id || null;

      if (metadataType === "payment_request") {
        // Payment request flow
        const paymentRequestId = session.metadata?.paymentRequestId;
        if (!paymentRequestId) {
          console.error("Webhook: No paymentRequestId in session metadata");
          return NextResponse.json({ received: true });
        }

        await prisma.$transaction([
          prisma.paymentRequest.update({
            where: { id: paymentRequestId },
            data: {
              status: PaymentRequestStatus.PAID,
              paidAt: new Date(),
              stripePaymentIntentId: paymentIntentId,
            },
          }),
          prisma.processedWebhookEvent.create({
            data: {
              eventId: event.id,
              eventType: event.type,
              eventCreated: new Date(event.created * 1000),
            },
          }),
        ]);

        await createAuditLog({
          action: AuditAction.PAYMENT_REQUEST_PAID,
          userId: session.metadata?.clientId || null,
          resourceType: ResourceType.PAYMENT_REQUEST,
          resourceId: paymentRequestId,
          result: AuditResult.SUCCESS,
          details: {
            eventId: event.id,
            bookingId,
            paymentIntentId,
            amount: session.amount_total,
          },
        });
      } else {
        // Deposit flow (default / legacy)
        await prisma.$transaction([
          prisma.booking.update({
            where: { id: bookingId },
            data: {
              status: BookingStatus.CONFIRMED,
              depositPaidAt: new Date(),
              stripePaymentIntentId: paymentIntentId,
            },
          }),
          prisma.processedWebhookEvent.create({
            data: {
              eventId: event.id,
              eventType: event.type,
              eventCreated: new Date(event.created * 1000),
            },
          }),
        ]);

        await createAuditLog({
          action: AuditAction.PAYMENT_COMPLETED,
          userId: session.metadata?.clientId || null,
          resourceType: ResourceType.PAYMENT,
          resourceId: bookingId,
          result: AuditResult.SUCCESS,
          details: {
            eventId: event.id,
            paymentIntentId,
            amount: session.amount_total,
          },
        });
      }
    } else if (event.type === "checkout.session.expired") {
      // Session expired without payment - just record it
      await prisma.processedWebhookEvent.create({
        data: {
          eventId: event.id,
          eventType: event.type,
          eventCreated: new Date(event.created * 1000),
        },
      });
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      await prisma.processedWebhookEvent.create({
        data: {
          eventId: event.id,
          eventType: event.type,
          eventCreated: new Date(event.created * 1000),
        },
      });

      await createAuditLog({
        action: AuditAction.PAYMENT_FAILED,
        resourceType: ResourceType.PAYMENT,
        resourceId: paymentIntent.metadata?.bookingId || null,
        result: AuditResult.FAILURE,
        details: {
          eventId: event.id,
          error: paymentIntent.last_payment_error?.message,
        },
      });
    }

    // Probabilistic cleanup: ~10% chance to clean old events
    if (Math.random() < 0.1) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      await prisma.processedWebhookEvent
        .deleteMany({
          where: { eventCreated: { lt: thirtyDaysAgo } },
        })
        .catch(() => {});
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
