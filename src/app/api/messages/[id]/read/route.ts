import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: bookingId } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, clientId: true, chatEnabled: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (session.user.role === UserRole.CLIENT) {
      if (booking.clientId !== session.user.id || !booking.chatEnabled) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const result = await prisma.message.updateMany({
      where: {
        bookingId,
        senderId: { not: session.user.id },
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({ updated: result.count });
  } catch (error) {
    console.error("Mark read error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
