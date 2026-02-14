import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const notifications = await prisma.bookingNotification.findMany({
      where: { bookingId: id },
      select: {
        id: true,
        type: true,
        channel: true,
        status: true,
        scheduledFor: true,
        sentAt: true,
        failedAt: true,
      },
      orderBy: { scheduledFor: "asc" },
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error("Fetch booking notifications error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
