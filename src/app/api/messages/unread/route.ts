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

    const count = await prisma.message.count({
      where: {
        receiverId: session.user.id,
        read: false,
        ...(session.user.role === UserRole.CLIENT
          ? { sender: { role: UserRole.ARTIST } }
          : { sender: { role: UserRole.CLIENT } }),
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Unread count error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
