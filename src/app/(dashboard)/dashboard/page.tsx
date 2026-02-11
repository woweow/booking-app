"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  CalendarDays,
  Clock,
  Plus,
  MessageSquare,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BookingCard, type BookingCardData } from "@/components/booking/booking-card";

type Stats = {
  total: number;
  active: number;
  upcoming: number;
  pending?: number;
  unread?: number;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<BookingCardData[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, upcoming: 0 });
  const [loading, setLoading] = useState(true);

  const isArtist = session?.user?.role === "ARTIST";

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/bookings");
        if (res.ok) {
          const data = await res.json();
          const all = Array.isArray(data) ? data : data.bookings || [];
          setBookings(all.slice(0, 5));

          const pending = all.filter(
            (b: BookingCardData) => b.status === "PENDING"
          ).length;
          const confirmed = all.filter(
            (b: BookingCardData) => b.status === "CONFIRMED"
          ).length;
          const active = all.filter((b: BookingCardData) =>
            ["PENDING", "INFO_REQUESTED", "AWAITING_DEPOSIT", "CONFIRMED"].includes(
              b.status
            )
          ).length;
          const upcoming = all.filter(
            (b: BookingCardData) =>
              b.status === "CONFIRMED" &&
              b.appointmentDate &&
              new Date(b.appointmentDate) > new Date()
          ).length;

          setStats({
            total: all.length,
            active,
            upcoming,
            pending,
          });
        }
      } catch {
        // silently fail, show empty state
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">
            {isArtist ? "Welcome back, Jane" : `Welcome, ${session?.user?.name || "there"}`}
          </h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        {!isArtist && (
          <Button asChild>
            <Link href="/bookings/new" className="gap-2">
              <Plus className="size-4" />
              New Booking
            </Link>
          </Button>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {isArtist ? "Pending Requests" : "Total Bookings"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-light">
              {isArtist ? stats.pending || 0 : stats.total}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {isArtist ? "This Week" : "Active Bookings"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CalendarDays className="size-5 text-muted-foreground" />
              <p className="text-3xl font-light">{stats.active}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {isArtist ? "Unread Messages" : "Upcoming Appointments"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isArtist ? (
                <MessageSquare className="size-5 text-muted-foreground" />
              ) : (
                <Clock className="size-5 text-muted-foreground" />
              )}
              <p className="text-3xl font-light">
                {isArtist ? stats.unread || 0 : stats.upcoming}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent bookings */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium">
            {isArtist ? "Recent Booking Requests" : "Recent Bookings"}
          </h2>
          <Button variant="ghost" asChild>
            <Link href="/bookings">View all</Link>
          </Button>
        </div>

        {bookings.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <CalendarDays className="size-12 text-muted-foreground" />
              <div>
                <p className="font-medium">No bookings yet</p>
                <p className="text-sm text-muted-foreground">
                  {isArtist
                    ? "Booking requests will appear here"
                    : "Create your first booking to get started"}
                </p>
              </div>
              {!isArtist && (
                <Button asChild>
                  <Link href="/bookings/new" className="gap-2">
                    <Plus className="size-4" />
                    Create Your First Booking
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                showClient={isArtist}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
