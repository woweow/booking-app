import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { checkRateLimit, apiRateLimiter, getClientIp } from "@/lib/rate-limit";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const isArtist = session.user.role === UserRole.ARTIST;

    // Fetch bookings that have chat enabled OR have messages
    const bookings = await prisma.booking.findMany({
      where: isArtist
        ? {
            OR: [
              { chatEnabled: true },
              { messages: { some: {} } },
            ],
          }
        : {
            clientId: userId,
            chatEnabled: true,
          },
      include: {
        client: { select: { id: true, name: true } },
        photos: { take: 1, select: { blobUrl: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true, senderId: true, createdAt: true },
        },
        _count: {
          select: {
            messages: {
              where: {
                read: false,
                senderId: { not: userId },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const threads = bookings.map((b) => ({
      bookingId: b.id,
      bookingDescription: b.description,
      bookingStatus: b.status,
      bookingType: b.bookingType,
      clientName: b.client.name,
      clientId: b.client.id,
      photoUrl: b.photos[0]?.blobUrl ?? null,
      chatEnabled: b.chatEnabled,
      lastMessage: b.messages[0]
        ? {
            content: b.messages[0].content,
            senderId: b.messages[0].senderId,
            createdAt: b.messages[0].createdAt.toISOString(),
          }
        : null,
      unreadCount: b._count.messages,
    }));

    // Sort by most recent message, then by updatedAt for threads with no messages
    threads.sort((a, b) => {
      const aTime = a.lastMessage
        ? new Date(a.lastMessage.createdAt).getTime()
        : 0;
      const bTime = b.lastMessage
        ? new Date(b.lastMessage.createdAt).getTime()
        : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ threads });
  } catch (error) {
    console.error("List messages error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimitResponse = await checkRateLimit(apiRateLimiter, clientIp);
    if (rateLimitResponse) return rateLimitResponse;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const content = body.content?.trim();
    const bookingId = body.bookingId;

    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, clientId: true, chatEnabled: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (session.user.role === UserRole.CLIENT) {
      if (booking.clientId !== session.user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!booking.chatEnabled) {
        return NextResponse.json(
          { error: "Chat is not yet enabled for this booking." },
          { status: 403 }
        );
      }
    }

    // Artist can message any booking; if chat not enabled, flip it on
    if (session.user.role === UserRole.ARTIST && !booking.chatEnabled) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { chatEnabled: true },
      });
    }

    const message = await prisma.message.create({
      data: {
        bookingId,
        senderId: session.user.id,
        content,
      },
      include: {
        sender: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
