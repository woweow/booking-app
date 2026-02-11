import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, BookingStatus } from "@prisma/client";
import { declineBookingSchema } from "@/lib/validations/booking";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Only artists can decline bookings" }, { status: 403 });
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
        { error: "Only pending or info-requested bookings can be declined" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = declineBookingSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: BookingStatus.DECLINED,
        declineReason: result.data.reason,
      },
      include: {
        client: { select: { id: true, name: true, email: true, phone: true } },
        photos: true,
      },
    });

    await createAuditLog({
      action: AuditAction.BOOKING_DECLINED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.BOOKING,
      resourceId: id,
      result: AuditResult.SUCCESS,
      details: { reason: result.data.reason, clientId: booking.clientId },
      request,
    });

    return NextResponse.json({ booking: updated });
  } catch (error) {
    console.error("Decline booking error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
