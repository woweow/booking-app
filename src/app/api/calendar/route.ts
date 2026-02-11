import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, BookingStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json({ error: "Month parameter required (YYYY-MM)" }, { status: 400 });
    }

    const [year, monthNum] = month.split("-").map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const [timeBlocks, exceptions, bookings] = await Promise.all([
      prisma.timeBlock.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        include: {
          booking: {
            select: {
              id: true,
              status: true,
              bookingType: true,
              placement: true,
              size: true,
              client: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      }),
      prisma.availabilityException.findMany({
        where: { date: { gte: startDate, lte: endDate } },
        orderBy: { date: "asc" },
      }),
      prisma.booking.findMany({
        where: {
          appointmentDate: { gte: startDate, lte: endDate },
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED, BookingStatus.AWAITING_DEPOSIT] },
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
        },
        orderBy: { appointmentDate: "asc" },
      }),
    ]);

    // Month stats
    const confirmedCount = bookings.filter((b) => b.status === BookingStatus.CONFIRMED).length;
    const completedCount = bookings.filter((b) => b.status === BookingStatus.COMPLETED).length;
    const totalHours = bookings
      .filter((b) => b.status === BookingStatus.COMPLETED)
      .reduce((sum, b) => sum + (b.duration || 0), 0) / 60;

    return NextResponse.json({
      month,
      timeBlocks,
      exceptions,
      bookings,
      stats: { confirmedCount, completedCount, totalHours },
    });
  } catch (error) {
    console.error("Calendar data error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
