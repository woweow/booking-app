import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { updateBookSchema } from "@/lib/validations/book";

type RouteParams = { params: Promise<{ id: string }> };

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

function buildAvailableHours(book: Record<string, unknown>) {
  const hours: Record<string, { start: string; end: string } | null> = {};
  for (const day of DAYS) {
    const start = book[`${day}Start`] as string | null;
    const end = book[`${day}End`] as string | null;
    hours[day] = start && end ? { start, end } : null;
  }
  return hours;
}

function flattenAvailableHours(
  availableHours: Record<string, { start: string; end: string } | null>
) {
  const data: Record<string, string | null> = {};
  for (const day of DAYS) {
    const h = availableHours[day];
    data[`${day}Start`] = h ? h.start : null;
    data[`${day}End`] = h ? h.end : null;
  }
  return data;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        flashPieces: { include: { sizes: true } },
        _count: { select: { bookings: true } },
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const availableHours = buildAvailableHours(book as unknown as Record<string, unknown>);

    return NextResponse.json({
      ...book,
      availableHours,
    });
  } catch (error) {
    console.error("Get book error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    // Extract availableHours before validation (not in zod schema)
    const { availableHours, ...rest } = body;

    const result = updateBookSchema.safeParse(rest);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { startDate, endDate, ...parsedRest } = result.data;
    const data: Record<string, unknown> = { ...parsedRest };
    if (startDate !== undefined) data.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) data.endDate = endDate ? new Date(endDate) : null;

    // Flatten availableHours object into individual day columns
    if (availableHours && typeof availableHours === "object") {
      const flat = flattenAvailableHours(availableHours);
      Object.assign(data, flat);
    }

    const book = await prisma.book.update({
      where: { id },
      data,
    });

    const builtHours = buildAvailableHours(book as unknown as Record<string, unknown>);

    return NextResponse.json({
      ...book,
      availableHours: builtHours,
    });
  } catch (error) {
    console.error("Update book error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    await prisma.book.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "Book deactivated" });
  } catch (error) {
    console.error("Delete book error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
