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

    if (session.user.role === UserRole.CLIENT) {
      // Find the artist
      const artist = await prisma.user.findFirst({
        where: { role: UserRole.ARTIST },
        select: { id: true, name: true, email: true },
      });

      if (!artist) {
        return NextResponse.json({ threads: [] });
      }

      const lastMessage = await prisma.message.findFirst({
        where: {
          OR: [
            { senderId: session.user.id, receiverId: artist.id },
            { senderId: artist.id, receiverId: session.user.id },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      const unreadCount = await prisma.message.count({
        where: {
          senderId: artist.id,
          receiverId: session.user.id,
          read: false,
        },
      });

      if (!lastMessage) {
        return NextResponse.json({
          threads: [{ participant: artist, lastMessage: null, unreadCount: 0 }],
        });
      }

      return NextResponse.json({
        threads: [{ participant: artist, lastMessage, unreadCount }],
      });
    }

    if (session.user.role === UserRole.ARTIST) {
      const clients = await prisma.user.findMany({
        where: { role: UserRole.CLIENT },
        select: { id: true, name: true, email: true },
      });

      const threads = [];

      for (const client of clients) {
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: session.user.id, receiverId: client.id },
              { senderId: client.id, receiverId: session.user.id },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

        if (!lastMessage) continue;

        const unreadCount = await prisma.message.count({
          where: {
            senderId: client.id,
            receiverId: session.user.id,
            read: false,
          },
        });

        threads.push({ participant: client, lastMessage, unreadCount });
      }

      // Sort by most recent message
      threads.sort(
        (a, b) => new Date(b.lastMessage!.createdAt).getTime() - new Date(a.lastMessage!.createdAt).getTime()
      );

      return NextResponse.json({ threads });
    }

    return NextResponse.json({ error: "Invalid role" }, { status: 403 });
  } catch (error) {
    console.error("List messages error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

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

    const body = await request.json();
    const content = body.content?.trim();

    if (!content) {
      return NextResponse.json({ error: "Message content is required" }, { status: 400 });
    }

    let receiverId: string;

    if (session.user.role === UserRole.CLIENT) {
      const artist = await prisma.user.findFirst({
        where: { role: UserRole.ARTIST },
        select: { id: true },
      });

      if (!artist) {
        return NextResponse.json({ error: "No artist found" }, { status: 404 });
      }

      receiverId = artist.id;
    } else if (session.user.role === UserRole.ARTIST) {
      if (!body.receiverId) {
        return NextResponse.json({ error: "Receiver ID is required" }, { status: 400 });
      }

      const receiver = await prisma.user.findUnique({
        where: { id: body.receiverId },
        select: { id: true, role: true },
      });

      if (!receiver || receiver.role !== UserRole.CLIENT) {
        return NextResponse.json({ error: "Invalid receiver" }, { status: 400 });
      }

      receiverId = body.receiverId;
    } else {
      return NextResponse.json({ error: "Invalid role" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content,
      },
      include: {
        sender: { select: { id: true, name: true, email: true } },
        receiver: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
