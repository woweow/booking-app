import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BookingStatus =
  | "PENDING"
  | "INFO_REQUESTED"
  | "APPROVED"
  | "AWAITING_DEPOSIT"
  | "CONFIRMED"
  | "COMPLETED"
  | "DECLINED"
  | "CANCELLED";

const statusConfig: Record<
  BookingStatus,
  { label: string; artistLabel?: string; variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  PENDING: { label: "Pending Review", variant: "outline" },
  INFO_REQUESTED: { label: "Info Requested", variant: "secondary" },
  APPROVED: {
    label: "Pick Your Time",
    artistLabel: "Approved",
    variant: "default",
    className: "bg-amber-500 text-white",
  },
  AWAITING_DEPOSIT: { label: "Awaiting Deposit", variant: "secondary" },
  CONFIRMED: {
    label: "Confirmed",
    variant: "default",
    className: "bg-[hsl(82_8%_48%)] text-white",
  },
  COMPLETED: {
    label: "Completed",
    variant: "default",
    className: "bg-[hsl(82_8%_48%)] text-white",
  },
  DECLINED: { label: "Declined", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export function StatusBadge({ status, isArtist = false }: { status: string; isArtist?: boolean }) {
  const config = statusConfig[status as BookingStatus] || {
    label: status,
    variant: "outline" as const,
  };

  const label = isArtist && config.artistLabel ? config.artistLabel : config.label;

  return (
    <Badge variant={config.variant} className={cn(config.className)}>
      {label}
    </Badge>
  );
}
