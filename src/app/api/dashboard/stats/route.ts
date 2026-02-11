import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, BookingStatus } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role === UserRole.CLIENT) {
      const [totalBookings, activeBookings, upcomingAppointment] = await Promise.all([
        prisma.booking.count({
          where: { clientId: session.user.id },
        }),
        prisma.booking.count({
          where: {
            clientId: session.user.id,
            status: {
              in: [
                BookingStatus.PENDING,
                BookingStatus.INFO_REQUESTED,
                BookingStatus.AWAITING_DEPOSIT,
                BookingStatus.CONFIRMED,
              ],
            },
          },
        }),
        prisma.booking.findFirst({
          where: {
            clientId: session.user.id,
            status: BookingStatus.CONFIRMED,
            appointmentDate: { gte: new Date() },
          },
          orderBy: { appointmentDate: "asc" },
          select: {
            id: true,
            appointmentDate: true,
            duration: true,
            placement: true,
          },
        }),
      ]);

      return NextResponse.json({
        stats: { totalBookings, activeBookings, upcomingAppointment },
      });
    }

    if (session.user.role === UserRole.ARTIST) {
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      const [pendingRequests, thisWeekAppointments, unreadMessages, totalClients] =
        await Promise.all([
          prisma.booking.count({
            where: { status: BookingStatus.PENDING },
          }),
          prisma.booking.count({
            where: {
              status: BookingStatus.CONFIRMED,
              appointmentDate: { gte: startOfWeek, lt: endOfWeek },
            },
          }),
          prisma.message.count({
            where: { read: false, senderId: { not: session.user.id } },
          }),
          prisma.user.count({
            where: { role: UserRole.CLIENT },
          }),
        ]);

      return NextResponse.json({
        stats: { pendingRequests, thisWeekAppointments, unreadMessages, totalClients },
      });
    }

    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
