import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, TimeBlockType } from "@prisma/client";
import { createTimeBlockSchema } from "@/lib/validations/availability";
import { createTimeBlock } from "@/lib/availability";
import { syncTimeBlockToGoogleCalendar, deleteTimeBlockFromGoogleCalendar } from "@/lib/google-calendar";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = createTimeBlockSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { date, startTime, endTime, notes } = result.data;

    const timeBlock = await createTimeBlock(
      null,
      new Date(date),
      startTime,
      endTime,
      TimeBlockType.BLOCKED_OFF,
      notes
    );

    // Sync to Google Calendar (non-blocking)
    const googleEventId = await syncTimeBlockToGoogleCalendar(
      timeBlock.id,
      new Date(date),
      startTime,
      endTime,
      notes
    );

    if (googleEventId) {
      await prisma.timeBlock.update({
        where: { id: timeBlock.id },
        data: { googleEventId },
      });
    }

    return NextResponse.json({ timeBlock }, { status: 201 });
  } catch (error) {
    console.error("Create time block error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Time block ID required" }, { status: 400 });
    }

    const timeBlock = await prisma.timeBlock.findUnique({ where: { id } });
    if (!timeBlock) {
      return NextResponse.json({ error: "Time block not found" }, { status: 404 });
    }

    // Delete from Google Calendar if synced
    if (timeBlock.googleEventId) {
      await deleteTimeBlockFromGoogleCalendar(timeBlock.googleEventId);
    }

    await prisma.timeBlock.delete({ where: { id } });

    return NextResponse.json({ message: "Time block deleted" });
  } catch (error) {
    console.error("Delete time block error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
