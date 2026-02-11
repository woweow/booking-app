import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, Prisma, TimeBlockType, BookingStatus } from "@prisma/client";
import { createFlashBookingSchema } from "@/lib/validations/flash-booking";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";
import { checkRateLimit, apiRateLimiter, getClientIp } from "@/lib/rate-limit";
import { getEarliestSlot } from "@/lib/availability";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const clientIp = getClientIp(request);
    const rateLimitResponse = await checkRateLimit(apiRateLimiter, clientIp);
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: "Only clients can create bookings" }, { status: 403 });
    }

    const body = await request.json();
    const result = createFlashBookingSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const { flashPieceId, size: selectedSize, date, startTime, endTime } = result.data;

    // Fetch flash piece with book and sizes
    const piece = await prisma.flashPiece.findUnique({
      where: { id: flashPieceId },
      include: {
        book: true,
        sizes: true,
      },
    });

    if (!piece) {
      return NextResponse.json({ error: "Flash piece not found" }, { status: 404 });
    }

    const book = piece.book;

    // Validate book is FLASH, active, and within date range
    if (book.type !== "FLASH") {
      return NextResponse.json({ error: "Not a flash book" }, { status: 400 });
    }

    if (!book.isActive) {
      return NextResponse.json({ error: "Book is not active" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    if (book.startDate && today < book.startDate.toISOString().split("T")[0]) {
      return NextResponse.json({ error: "Book is not yet open" }, { status: 400 });
    }
    if (book.endDate && today > book.endDate.toISOString().split("T")[0]) {
      return NextResponse.json({ error: "Book has closed" }, { status: 400 });
    }

    // Find matching size
    const pieceSize = piece.sizes.find((s) => s.size === selectedSize);
    if (!pieceSize) {
      return NextResponse.json(
        { error: "Selected size is not available for this piece" },
        { status: 400 }
      );
    }

    // Early claim check for non-repeatable
    if (!piece.isRepeatable && piece.isClaimed) {
      return NextResponse.json(
        { error: "This design has already been claimed" },
        { status: 409 }
      );
    }

    // Validate deposit is configured
    if (!book.depositAmountCents) {
      return NextResponse.json(
        { error: "Book deposit not configured" },
        { status: 400 }
      );
    }

    const durationMinutes = pieceSize.durationMinutes;

    // Serializable transaction
    const txResult = await prisma.$transaction(
      async (tx) => {
        // Check overlapping time blocks
        const overlapping = await tx.timeBlock.findFirst({
          where: {
            date: new Date(date),
            OR: [{ startTime: { lt: endTime }, endTime: { gt: startTime } }],
          },
        });

        if (overlapping) {
          return { success: false as const, error: "SLOT_TAKEN" as const };
        }

        // For non-repeatable, re-check claim inside transaction
        if (!piece.isRepeatable) {
          const freshPiece = await tx.flashPiece.findUnique({
            where: { id: piece.id },
          });
          if (freshPiece?.isClaimed) {
            return { success: false as const, error: "ALREADY_CLAIMED" as const };
          }
        }

        // Create TimeBlock
        const timeBlock = await tx.timeBlock.create({
          data: {
            date: new Date(date),
            startTime,
            endTime,
            type: TimeBlockType.APPOINTMENT,
          },
        });

        // Create Booking
        const booking = await tx.booking.create({
          data: {
            clientId: session.user.id,
            bookingType: "FLASH",
            bookId: book.id,
            flashPieceId: piece.id,
            status: BookingStatus.AWAITING_DEPOSIT,
            description: piece.name,
            size: selectedSize,
            placement: null,
            preferredDates: "[]",
            appointmentDate: new Date(date),
            scheduledStartTime: startTime,
            scheduledEndTime: endTime,
            duration: durationMinutes,
            depositAmount: book.depositAmountCents,
            totalAmount: pieceSize.priceAmountCents,
          },
        });

        // Link time block to booking
        await tx.timeBlock.update({
          where: { id: timeBlock.id },
          data: { bookingId: booking.id },
        });

        // Claim piece if non-repeatable
        if (!piece.isRepeatable) {
          await tx.flashPiece.update({
            where: { id: piece.id },
            data: { isClaimed: true, claimedByBookingId: booking.id },
          });
        }

        return { success: true as const, booking, timeBlock };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (!txResult.success) {
      if (txResult.error === "ALREADY_CLAIMED") {
        return NextResponse.json(
          { error: "This design has already been claimed" },
          { status: 409 }
        );
      }

      // Slot taken — suggest alternative
      const alternativeSlot = await getEarliestSlot(
        book.id,
        new Date(date),
        durationMinutes
      );

      return NextResponse.json(
        {
          error: "Time slot is no longer available",
          alternativeSlot,
        },
        { status: 409 }
      );
    }

    const { booking } = txResult;

    // Create Stripe checkout session
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Payment service is not configured" },
        { status: 503 }
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
              name: `Flash Tattoo Deposit - ${piece.name}`,
              description: `Deposit for flash tattoo: ${piece.name} (${selectedSize})`,
            },
            unit_amount: book.depositAmountCents,
          },
          quantity: 1,
        },
      ],
      customer_email: session.user.email!,
      metadata: {
        bookingId: booking.id,
        clientId: session.user.id,
        type: "deposit",
      },
      success_url: `${baseUrl}/bookings/${booking.id}?payment=success`,
      cancel_url: `${baseUrl}/bookings/${booking.id}?payment=cancelled`,
    });

    await createAuditLog({
      action: AuditAction.BOOKING_CREATED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.BOOKING,
      resourceId: booking.id,
      result: AuditResult.SUCCESS,
      details: {
        bookingType: "FLASH",
        flashPieceId: piece.id,
        size: selectedSize,
        date,
        startTime,
        endTime,
      },
      request,
    });

    return NextResponse.json(
      { booking, paymentUrl: checkoutSession.url },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create flash booking error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
