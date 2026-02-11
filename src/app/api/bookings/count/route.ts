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

    const isClient = session.user.role === UserRole.CLIENT;

    const count = await prisma.booking.count({
      where: {
        status: "PENDING",
        ...(isClient ? { clientId: session.user.id } : {}),
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Bookings count error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
