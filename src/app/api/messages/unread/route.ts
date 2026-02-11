import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const isClient = session.user.role === UserRole.CLIENT;

    const count = await prisma.message.count({
      where: {
        read: false,
        senderId: { not: userId },
        booking: isClient
          ? { clientId: userId, chatEnabled: true }
          : undefined,
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Unread count error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
