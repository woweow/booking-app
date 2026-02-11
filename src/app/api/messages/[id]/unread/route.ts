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

    // Find the most recent message from the OTHER party and mark it unread
    const lastMessageFromOther = await prisma.message.findFirst({
      where: {
        bookingId,
        senderId: { not: session.user.id },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!lastMessageFromOther) {
      return NextResponse.json({ error: "No messages to mark as unread" }, { status: 400 });
    }

    await prisma.message.update({
      where: { id: lastMessageFromOther.id },
      data: { read: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark unread error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
