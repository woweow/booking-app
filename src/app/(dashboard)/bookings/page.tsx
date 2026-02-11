"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Search, Plus, CalendarDays, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { BookingCard, type BookingCardData } from "@/components/booking/booking-card";

const TABS = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "COMPLETED", label: "Completed" },
];

export default function BookingsPage() {
  const { data: session } = useSession();
  const [bookings, setBookings] = useState<BookingCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const isArtist = session?.user?.role === "ARTIST";

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true);
      try {
        const res = await fetch(`/api/bookings`);
        if (res.ok) {
          const data = await res.json();
          setBookings(Array.isArray(data) ? data : data.bookings || []);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchBookings();
  }, []);

  const tabFiltered = useMemo(
    () => tab === "all" ? bookings : bookings.filter((b) => b.status === tab),
    [bookings, tab]
  );

  const pendingCount = useMemo(
    () => bookings.filter((b) => b.status === "PENDING").length,
    [bookings]
  );
  const confirmedCount = useMemo(
    () => bookings.filter((b) => b.status === "CONFIRMED").length,
    [bookings]
  );

  const filtered = search
    ? tabFiltered.filter((b) => {
        const q = search.toLowerCase();
        return (
          b.description.toLowerCase().includes(q) ||
          b.placement.toLowerCase().includes(q) ||
          b.client?.name.toLowerCase().includes(q) ||
          b.client?.email.toLowerCase().includes(q)
        );
      })
    : tabFiltered;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light tracking-wide">Bookings</h1>
          <p className="text-sm text-muted-foreground">
            {isArtist ? "Manage all booking requests" : "Your booking history"}
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Tabs value={tab} onValueChange={setTab} className="w-full sm:w-auto">
          <TabsList>
            {TABS.map((t) => {
              const count =
                t.value === "PENDING" ? pendingCount :
                t.value === "CONFIRMED" ? confirmedCount :
                0;
              return (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                  {count > 0 && (
                    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1 text-xs font-medium text-muted-foreground">
                      {count}
                    </span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={
              isArtist ? "Search by client, description..." : "Search bookings..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <CalendarDays className="size-12 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {search
                  ? "No matching bookings found"
                  : tab !== "all"
                    ? `No ${TABS.find((t) => t.value === tab)?.label.toLowerCase()} bookings`
                    : "No bookings yet"}
              </p>
              <p className="text-sm text-muted-foreground">
                {!search && tab === "all" && !isArtist
                  ? "Create your first booking to get started"
                  : "Try adjusting your search or filter"}
              </p>
            </div>
            {!search && tab === "all" && !isArtist && (
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
          {filtered.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              showClient={isArtist}
            />
          ))}
        </div>
      )}
    </div>
  );
}
