import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, BookingStatus } from "@prisma/client";
import { updateBookingClientSchema, requestInfoSchema } from "@/lib/validations/booking";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";
import { cancelBookingNotifications } from "@/lib/notifications";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
        photos: true,
        consentForm: true,
        book: {
          select: { id: true, name: true, type: true, depositAmountCents: true },
        },
        flashPiece: { include: { sizes: true } },
        paymentRequests: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // CLIENT: own bookings only
    if (session.user.role === UserRole.CLIENT && booking.clientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Get booking error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const body = await request.json();

    // ARTIST: can mark as complete or request info
    if (session.user.role === UserRole.ARTIST) {
      // Mark as complete
      if (body.status === BookingStatus.COMPLETED) {
        if (booking.status !== BookingStatus.CONFIRMED) {
          return NextResponse.json(
            { error: "Only confirmed bookings can be marked as complete" },
            { status: 400 }
          );
        }

        const updated = await prisma.booking.update({
          where: { id },
          data: { status: BookingStatus.COMPLETED },
          include: {
            client: { select: { id: true, name: true, email: true, phone: true } },
            photos: true,
          },
        });

        await createAuditLog({
          action: AuditAction.BOOKING_UPDATED,
          userId: session.user.id,
          userEmail: session.user.email!,
          resourceType: ResourceType.BOOKING,
          resourceId: id,
          result: AuditResult.SUCCESS,
          details: { status: "COMPLETED" },
          request,
        });

        return NextResponse.json({ booking: updated });
      }

      // Reopen booking (COMPLETED → CONFIRMED)
      if (body.status === BookingStatus.CONFIRMED && booking.status === BookingStatus.COMPLETED) {
        const updated = await prisma.booking.update({
          where: { id },
          data: { status: BookingStatus.CONFIRMED },
          include: {
            client: { select: { id: true, name: true, email: true, phone: true } },
            photos: true,
          },
        });

        await createAuditLog({
          action: AuditAction.BOOKING_REOPENED,
          userId: session.user.id,
          userEmail: session.user.email!,
          resourceType: ResourceType.BOOKING,
          resourceId: id,
          result: AuditResult.SUCCESS,
          request,
        });

        return NextResponse.json({ booking: updated });
      }

      // Request info
      if (body.status === BookingStatus.INFO_REQUESTED) {
        const infoResult = requestInfoSchema.safeParse(body);
        if (!infoResult.success) {
          return NextResponse.json(
            { error: "Validation failed", errors: infoResult.error.flatten().fieldErrors },
            { status: 400 }
          );
        }

        if (
          booking.status !== BookingStatus.PENDING &&
          booking.status !== BookingStatus.INFO_REQUESTED
        ) {
          return NextResponse.json(
            { error: "Can only request info for pending bookings" },
            { status: 400 }
          );
        }

        const updated = await prisma.booking.update({
          where: { id },
          data: {
            status: BookingStatus.INFO_REQUESTED,
            chatEnabled: true,
          },
          include: {
            client: { select: { id: true, name: true, email: true, phone: true } },
            photos: true,
          },
        });

        // Send the artist's message as a chat message
        if (infoResult.data.artistNotes) {
          await prisma.message.create({
            data: {
              bookingId: id,
              senderId: session.user.id,
              content: infoResult.data.artistNotes,
            },
          });
        }

        await createAuditLog({
          action: AuditAction.BOOKING_UPDATED,
          userId: session.user.id,
          userEmail: session.user.email!,
          resourceType: ResourceType.BOOKING,
          resourceId: id,
          result: AuditResult.SUCCESS,
          details: { status: "INFO_REQUESTED" },
          request,
        });

        return NextResponse.json({ booking: updated });
      }
    }

    // CLIENT: can update if PENDING or INFO_REQUESTED
    if (session.user.role === UserRole.CLIENT) {
      if (booking.clientId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      if (
        booking.status !== BookingStatus.PENDING &&
        booking.status !== BookingStatus.INFO_REQUESTED
      ) {
        return NextResponse.json(
          { error: "Booking can only be edited when pending or info requested" },
          { status: 400 }
        );
      }

      const result = updateBookingClientSchema.safeParse(body);
      if (!result.success) {
        return NextResponse.json(
          { error: "Validation failed", errors: result.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      const data: Record<string, unknown> = {};
      if (result.data.description !== undefined) data.description = result.data.description;
      if (result.data.size !== undefined) data.size = result.data.size;
      if (result.data.placement !== undefined) data.placement = result.data.placement;
      if (result.data.isFirstTattoo !== undefined) data.isFirstTattoo = result.data.isFirstTattoo;
      if (result.data.preferredDates !== undefined)
        data.preferredDates = JSON.stringify(result.data.preferredDates);
      if (result.data.medicalNotes !== undefined) data.medicalNotes = result.data.medicalNotes;

      const updated = await prisma.booking.update({
        where: { id },
        data,
        include: {
          client: { select: { id: true, name: true, email: true, phone: true } },
          photos: true,
        },
      });

      await createAuditLog({
        action: AuditAction.BOOKING_UPDATED,
        userId: session.user.id,
        userEmail: session.user.email!,
        resourceType: ResourceType.BOOKING,
        resourceId: id,
        result: AuditResult.SUCCESS,
        request,
      });

      return NextResponse.json({ booking: updated });
    }

    return NextResponse.json({ error: "Invalid update request" }, { status: 400 });
  } catch (error) {
    console.error("Update booking error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // CLIENT: own bookings only
    if (session.user.role === UserRole.CLIENT && booking.clientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const terminalStatuses: BookingStatus[] = [
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED,
      BookingStatus.DECLINED,
    ];
    if (terminalStatuses.includes(booking.status)) {
      return NextResponse.json(
        { error: "This booking cannot be cancelled" },
        { status: 400 }
      );
    }

    // Soft delete: set status to CANCELLED and cancel pending notifications
    await prisma.booking.update({
      where: { id },
      data: { status: BookingStatus.CANCELLED },
    });

    // Delete associated time blocks so the slot becomes available again
    await prisma.timeBlock.deleteMany({ where: { bookingId: id } });

    // Unclaim flash piece if applicable
    if (booking.bookingType === "FLASH" && booking.flashPieceId) {
      const piece = await prisma.flashPiece.findUnique({
        where: { id: booking.flashPieceId },
      });
      if (piece && !piece.isRepeatable && piece.claimedByBookingId === booking.id) {
        await prisma.flashPiece.update({
          where: { id: piece.id },
          data: { isClaimed: false, claimedByBookingId: null },
        });
      }
    }

    // Cancel pending notifications (non-blocking)
    cancelBookingNotifications(id).catch((err) =>
      console.error("Failed to cancel notifications:", err)
    );

    await createAuditLog({
      action: AuditAction.BOOKING_CANCELLED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.BOOKING,
      resourceId: id,
      result: AuditResult.SUCCESS,
      request,
    });

    return NextResponse.json({ message: "Booking cancelled successfully" });
  } catch (error) {
    console.error("Cancel booking error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
