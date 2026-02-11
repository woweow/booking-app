import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { createBookingSchema } from "@/lib/validations/booking";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get("status");

    const where: Record<string, unknown> = {};

    // CLIENT: own bookings only. ARTIST: all bookings.
    if (session.user.role === UserRole.CLIENT) {
      where.clientId = session.user.id;
    }

    if (statusFilter) {
      where.status = statusFilter;
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
        _count: { select: { photos: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("List bookings error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: "Only clients can create bookings" }, { status: 403 });
    }

    const body = await request.json();
    const result = createBookingSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const { description, size, placement, isFirstTattoo, preferredDates, medicalNotes, photoUrls } =
      result.data;

    const booking = await prisma.booking.create({
      data: {
        clientId: session.user.id,
        bookingType: "CUSTOM",
        description,
        size,
        placement,
        isFirstTattoo,
        preferredDates: JSON.stringify(preferredDates),
        medicalNotes: medicalNotes || null,
        photos: photoUrls?.length
          ? {
              create: photoUrls.map((url) => ({
                blobUrl: url,
                filename: url.split("/").pop() || "photo",
              })),
            }
          : undefined,
      },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true },
        },
        photos: true,
      },
    });

    await createAuditLog({
      action: AuditAction.BOOKING_CREATED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.BOOKING,
      resourceId: booking.id,
      result: AuditResult.SUCCESS,
      request,
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error("Create booking error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
