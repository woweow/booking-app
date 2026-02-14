"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Smartphone,
  XCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Notification = {
  id: string;
  type: string;
  channel: "EMAIL" | "SMS";
  status: "PENDING" | "SENT" | "FAILED";
  scheduledFor: string;
  sentAt: string | null;
  failedAt: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  BOOKING_APPROVED: "Booking Approved",
  DEPOSIT_REQUEST: "Deposit Request",
  PAYMENT_REQUEST: "Payment Request",
  REMINDER_1WEEK: "1-Week Reminder",
  REMINDER_1DAY: "1-Day Reminder",
  REMINDER_2HOURS: "2-Hour Reminder",
  AFTERCARE_6WEEKS: "Aftercare Follow-up",
  TOUCHUP_6MONTHS: "Touch-up Offer",
};

function StatusIcon({ status }: { status: Notification["status"] }) {
  switch (status) {
    case "SENT":
      return <CheckCircle2 className="size-4 text-[hsl(82_8%_48%)]" />;
    case "FAILED":
      return <XCircle className="size-4 text-destructive" />;
    default:
      return <Clock className="size-4 text-muted-foreground" />;
  }
}

function ChannelIcon({ channel }: { channel: Notification["channel"] }) {
  return channel === "EMAIL" ? (
    <Mail className="size-4 text-muted-foreground" />
  ) : (
    <Smartphone className="size-4 text-muted-foreground" />
  );
}

export function OutreachTimeline({ bookingId }: { bookingId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}/notifications`)
      .then((res) => (res.ok ? res.json() : { notifications: [] }))
      .then((data) => setNotifications(data.notifications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-medium">Outreach</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-medium">Outreach</CardTitle>
      </CardHeader>
      <CardContent>
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notifications yet</p>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-3 text-sm"
              >
                <ChannelIcon channel={n.channel} />
                <div className="min-w-0 flex-1">
                  <span className="font-medium">
                    {TYPE_LABELS[n.type] || n.type}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(n.scheduledFor), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
                <StatusIcon status={n.status} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
