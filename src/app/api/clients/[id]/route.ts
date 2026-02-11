import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, BookingStatus } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const client = await prisma.user.findUnique({
      where: { id, role: UserRole.CLIENT },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        bookings: {
          include: {
            photos: true,
            consentForm: { select: { id: true, signedAt: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const activeStatuses: BookingStatus[] = [
      BookingStatus.PENDING,
      BookingStatus.INFO_REQUESTED,
      BookingStatus.AWAITING_DEPOSIT,
      BookingStatus.CONFIRMED,
    ];

    const stats = {
      totalBookings: client.bookings.length,
      activeBookings: client.bookings.filter((b) => activeStatuses.includes(b.status)).length,
      completedSessions: client.bookings.filter((b) => b.status === BookingStatus.COMPLETED).length,
    };

    return NextResponse.json({ client, stats });
  } catch (error) {
    console.error("Get client error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
