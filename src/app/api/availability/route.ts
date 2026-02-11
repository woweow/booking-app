import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { getAvailableSlots, getAvailabilityForDateRange } from "@/lib/availability";
import { bookAvailabilityQuerySchema } from "@/lib/validations/availability";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = bookAvailabilityQuerySchema.safeParse({
      date: searchParams.get("date") || undefined,
      month: searchParams.get("month") || undefined,
      bookId: searchParams.get("bookId") || undefined,
      duration: searchParams.get("duration") || undefined,
    });

    if (!query.success) {
      return NextResponse.json(
        { error: "Invalid query parameters", errors: query.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { date, month, bookId, duration } = query.data;

    // Mode 1: Artist month view (no bookId)
    if (month && !bookId && session.user.role === UserRole.ARTIST) {
      const [year, monthNum] = month.split("-").map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);

      const [timeBlocks, exceptions] = await Promise.all([
        prisma.timeBlock.findMany({
          where: {
            date: { gte: startDate, lte: endDate },
          },
          include: {
            booking: {
              select: { id: true, clientId: true, status: true, bookingType: true, placement: true,
                client: { select: { name: true, email: true } },
              },
            },
          },
          orderBy: [{ date: "asc" }, { startTime: "asc" }],
        }),
        prisma.availabilityException.findMany({
          where: {
            date: { gte: startDate, lte: endDate },
          },
          orderBy: { date: "asc" },
        }),
      ]);

      return NextResponse.json({ month, timeBlocks, exceptions });
    }

    // Mode 2: Client month availability (bookId + month + duration)
    if (month && bookId && duration) {
      const [year, monthNum] = month.split("-").map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0);

      const book = await prisma.book.findUnique({ where: { id: bookId } });
      if (!book) {
        return NextResponse.json({ error: "Book not found", bookId }, { status: 404 });
      }

      console.log("[availability] Mode 2:", { bookId, month, duration, bookActive: book.isActive, bookStart: book.startDate, bookEnd: book.endDate, thurStart: book.thursdayStart, satStart: book.saturdayStart });

      const availability = await getAvailabilityForDateRange(bookId, startDate, endDate, duration);
      const availabilityObj = Object.fromEntries(availability);
      const availCount = Object.values(availabilityObj).filter(Boolean).length;
      console.log("[availability] Result:", { totalDates: Object.keys(availabilityObj).length, availableDates: availCount });

      return NextResponse.json({ month, bookId, availability: availabilityObj });
    }

    // Mode 3: Single date slots (date + bookId + duration)
    if (date && bookId && duration) {
      const slots = await getAvailableSlots(bookId, new Date(date), duration);
      return NextResponse.json({ date, bookId, slots });
    }

    return NextResponse.json(
      { error: "Invalid query: provide (month) for artist view, (month+bookId+duration) for availability, or (date+bookId+duration) for slots" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Availability error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
