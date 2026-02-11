"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft,
  CalendarDays,
  Loader2,
  Mail,
  Phone,
  UserCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BookingCard, type BookingCardData } from "@/components/booking/booking-card";

type ClientDetail = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  createdAt: string;
  bookings: BookingCardData[];
};

export default function ClientDetailPage() {
  const params = useParams();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClient() {
      try {
        const res = await fetch(`/api/clients/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          const clientData = data.client ?? data;
          // Ensure bookings is always an array
          if (!Array.isArray(clientData.bookings)) {
            clientData.bookings = [];
          }
          setClient(clientData);
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    fetchClient();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center gap-4 py-12">
        <p className="text-muted-foreground">Client not found</p>
        <Button asChild variant="outline">
          <Link href="/clients">Back to clients</Link>
        </Button>
      </div>
    );
  }

  const bookings = client.bookings ?? [];

  const upcomingBooking = bookings.find(
    (b) =>
      b.status === "CONFIRMED" &&
      b.appointmentDate &&
      new Date(b.appointmentDate) > new Date()
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/clients"
          className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to clients
        </Link>
        <h1 className="text-2xl font-light tracking-wide">{client.name}</h1>
        <p className="text-sm text-muted-foreground">Client profile</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="font-medium">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <UserCircle className="size-5 text-muted-foreground" />
                <span>{client.name}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Mail className="size-5 text-muted-foreground" />
                <span className="text-sm">{client.email}</span>
              </div>
              {client.phone && (
                <>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Phone className="size-5 text-muted-foreground" />
                    <span className="text-sm">{client.phone}</span>
                  </div>
                </>
              )}
              <Separator />
              <div className="flex items-center gap-3">
                <CalendarDays className="size-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Member since</p>
                  <p className="text-sm">
                    {client.createdAt
                      ? format(new Date(client.createdAt), "MMMM d, yyyy")
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-medium">Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Bookings</span>
                <span className="font-medium">{bookings.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Active</span>
                <span className="font-medium">
                  {
                    bookings.filter((b) =>
                      ["PENDING", "INFO_REQUESTED", "AWAITING_DEPOSIT", "CONFIRMED"].includes(
                        b.status
                      )
                    ).length
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium">
                  {
                    bookings.filter((b) => b.status === "COMPLETED")
                      .length
                  }
                </span>
              </div>
            </CardContent>
          </Card>

          {upcomingBooking && (
            <Card className="border-[hsl(82_8%_48%)]/30">
              <CardHeader>
                <CardTitle className="font-medium">Next Appointment</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">
                  {format(
                    new Date(upcomingBooking.appointmentDate!),
                    "EEEE, MMMM d, yyyy 'at' h:mm a"
                  )}
                </p>
                <Button asChild variant="link" className="mt-1 h-auto p-0">
                  <Link href={`/bookings/${upcomingBooking.id}`}>
                    View details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <h2 className="mb-4 text-lg font-medium">Booking History</h2>
          {bookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No bookings yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {bookings.map((booking) => (
                <BookingCard key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
