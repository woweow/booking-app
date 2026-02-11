import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { isGoogleConfigured } from "@/lib/google-calendar";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isGoogleConfigured()) {
      return NextResponse.json({
        configured: false,
        connected: false,
      });
    }

    const connection = await prisma.googleConnection.findUnique({
      where: { userId: session.user.id },
      select: {
        email: true,
        calendarId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      configured: true,
      connected: !!connection,
      email: connection?.email || null,
      calendarId: connection?.calendarId || "primary",
      connectedAt: connection?.createdAt || null,
    });
  } catch (error) {
    console.error("Google status error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
