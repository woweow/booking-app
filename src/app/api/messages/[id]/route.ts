import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    let otherUserId: string;

    if (session.user.role === UserRole.CLIENT) {
      // id is ignored for client; always get conversation with artist
      const artist = await prisma.user.findFirst({
        where: { role: UserRole.ARTIST },
        select: { id: true },
      });

      if (!artist) {
        return NextResponse.json({ messages: [] });
      }

      otherUserId = artist.id;
    } else {
      // Artist: id = clientId
      otherUserId = id;
    }

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: session.user.id },
        ],
      },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
        receiver: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark received messages as read
    await prisma.message.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: session.user.id,
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Get conversation error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
