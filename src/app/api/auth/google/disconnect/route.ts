import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.googleConnection.delete({
      where: { userId: session.user.id },
    }).catch(() => {
      // Ignore if doesn't exist
    });

    return NextResponse.json({ message: "Google Calendar disconnected" });
  } catch (error) {
    console.error("Google disconnect error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
