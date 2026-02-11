"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

import { ArtistCalendar } from "@/components/calendar/artist-calendar";
import { CalendarStats } from "@/components/calendar/calendar-stats";

export default function CalendarPage() {
  const [stats, setStats] = useState({
    confirmed: 0,
    completed: 0,
    totalHours: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/bookings");
        if (res.ok) {
          const data = await res.json();
          const bookings = Array.isArray(data) ? data : data.bookings || [];
          const now = new Date();
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

          const thisMonth = bookings.filter((b: { appointmentDate?: string }) => {
            if (!b.appointmentDate) return false;
            const d = new Date(b.appointmentDate);
            return d >= monthStart && d <= monthEnd;
          });

          const confirmed = thisMonth.filter(
            (b: { status: string }) => b.status === "CONFIRMED"
          ).length;
          const completed = thisMonth.filter(
            (b: { status: string }) => b.status === "COMPLETED"
          ).length;
          const totalMinutes = thisMonth
            .filter((b: { status: string }) => b.status === "COMPLETED")
            .reduce(
              (acc: number, b: { duration?: number }) =>
                acc + (b.duration || 0),
              0
            );

          setStats({
            confirmed,
            completed,
            totalHours: Math.round(totalMinutes / 60),
          });
        }
      } catch {
        // silently fail
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-light tracking-wide">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Manage your schedule and availability
        </p>
      </div>

      <CalendarStats
        confirmed={stats.confirmed}
        completed={stats.completed}
        totalHours={stats.totalHours}
      />

      <ArtistCalendar />
    </div>
  );
}
