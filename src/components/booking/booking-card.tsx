import Link from "next/link";
import { format } from "date-fns";
import { CalendarDays, MapPin, Ruler } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./status-badge";

const sizeLabels: Record<string, string> = {
  SMALL: "Small (<2\")",
  MEDIUM: "Medium (2-4\")",
  LARGE: "Large (4-6\")",
  EXTRA_LARGE: "Extra Large (6\"+)",
};

export type BookingCardData = {
  id: string;
  status: string;
  description: string;
  size: string;
  placement: string;
  createdAt: string;
  appointmentDate?: string | null;
  client?: {
    name: string;
    email: string;
  };
};

export function BookingCard({
  booking,
  showClient = false,
}: {
  booking: BookingCardData;
  showClient?: boolean;
}) {
  return (
    <Link href={`/bookings/${booking.id}`}>
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-2">
          <div className="min-w-0 flex-1">
            {showClient && booking.client && (
              <p className="text-sm font-medium">{booking.client.name}</p>
            )}
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {booking.description}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Ruler className="size-4" />
              <Badge variant="secondary" className="font-normal">
                {sizeLabels[booking.size] || booking.size}
              </Badge>
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" />
              {booking.placement}
            </span>
            {booking.appointmentDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" />
                {format(new Date(booking.appointmentDate), "MMM d, yyyy")}
              </span>
            )}
            <span className="ml-auto text-xs">
              Submitted {format(new Date(booking.createdAt), "MMM d, yyyy")}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
