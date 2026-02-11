"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Clock,
  Plus,
  Trash2,
  Loader2,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/booking/status-badge";

type Appointment = {
  id: string;
  status: string;
  bookingType?: string;
  placement?: string;
  client?: { name: string; email: string };
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  appointmentDate?: string;
  duration?: number;
};

type TimeBlock = {
  id: string;
  startTime: string;
  endTime: string;
  type: string;
  notes?: string | null;
};

type Exception = {
  id: string;
  type: string;
  reason?: string | null;
  customStartTime?: string | null;
  customEndTime?: string | null;
};

type DayData = {
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  exception?: Exception | null;
};

const blockSchema = z.object({
  date: z.string(),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Required"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Required"),
  notes: z.string().optional(),
});

const exceptionSchema = z.object({
  date: z.string(),
  type: z.enum(["UNAVAILABLE", "CUSTOM_HOURS"]),
  customStartTime: z.string().optional(),
  customEndTime: z.string().optional(),
  reason: z.string().optional(),
});

type BlockValues = z.infer<typeof blockSchema>;
type ExceptionValues = z.infer<typeof exceptionSchema>;

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

function BlockTimeDialog({
  date,
  onSuccess,
}: {
  date: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<BlockValues>({
    resolver: zodResolver(blockSchema),
    defaultValues: { date, startTime: "", endTime: "", notes: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: BlockValues) {
    try {
      const res = await fetch("/api/availability/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to block time");
        return;
      }
      toast.success("Time blocked");
      setOpen(false);
      form.reset({ date, startTime: "", endTime: "", notes: "" });
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setOpen(true)}>
        <Plus className="size-3" />
        Block Time
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Block Time</DialogTitle>
          <DialogDescription>
            Block a time range on {format(new Date(date + "T12:00:00"), "MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="e.g. Lunch, Meeting..." rows={2} {...field} />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Block Time
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function AddExceptionDialog({
  date,
  onSuccess,
}: {
  date: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<ExceptionValues>({
    resolver: zodResolver(exceptionSchema),
    defaultValues: {
      date,
      type: "UNAVAILABLE",
      customStartTime: "",
      customEndTime: "",
      reason: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;
  const watchType = form.watch("type");

  async function onSubmit(values: ExceptionValues) {
    try {
      const res = await fetch("/api/availability/exception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to add exception");
        return;
      }
      toast.success("Exception added");
      setOpen(false);
      form.reset({ date, type: "UNAVAILABLE", customStartTime: "", customEndTime: "", reason: "" });
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" className="gap-1" onClick={() => setOpen(true)}>
        <Plus className="size-3" />
        Add Exception
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Exception</DialogTitle>
          <DialogDescription>
            Override availability for {format(new Date(date + "T12:00:00"), "MMMM d, yyyy")}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="UNAVAILABLE">Unavailable (whole day off)</SelectItem>
                      <SelectItem value="CUSTOM_HOURS">Custom Hours</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            {watchType === "CUSTOM_HOURS" && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customStartTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="customEndTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Vacation, Holiday..." {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Add Exception
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function DayDetailModal({
  date,
  data,
  open,
  onOpenChange,
  onRefresh,
}: {
  date: string;
  data: DayData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
}) {
  const router = useRouter();

  async function deleteBlock(id: string) {
    try {
      const res = await fetch(`/api/availability/block/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Block removed");
        onRefresh();
      } else {
        toast.error("Failed to remove block");
      }
    } catch {
      toast.error("Something went wrong");
    }
  }

  async function deleteException(id: string) {
    try {
      const res = await fetch(`/api/availability/exception/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Exception removed");
        onRefresh();
      } else {
        toast.error("Failed to remove exception");
      }
    } catch {
      toast.error("Something went wrong");
    }
  }

  const blockedEntries = data.timeBlocks.filter((b) => b.type === "BLOCKED_OFF");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {format(new Date(date + "T12:00:00"), "EEEE, MMMM d, yyyy")}
          </DialogTitle>
        </DialogHeader>

        {/* Exception info */}
        {data.exception && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <div className="flex items-center justify-between">
              <div>
                <Badge variant="destructive" className="mb-1">
                  {data.exception.type === "UNAVAILABLE" ? "Unavailable" : "Custom Hours"}
                </Badge>
                {data.exception.reason && (
                  <p className="text-muted-foreground">{data.exception.reason}</p>
                )}
                {data.exception.customStartTime && data.exception.customEndTime && (
                  <p className="text-muted-foreground">
                    {formatTime(data.exception.customStartTime)} - {formatTime(data.exception.customEndTime)}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={() => deleteException(data.exception!.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        )}

        {/* Appointments */}
        {data.appointments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">
              Appointments ({data.appointments.length})
            </h3>
            {data.appointments.map((apt) => (
              <Link
                key={apt.id}
                href={`/bookings/${apt.id}`}
                className="block rounded-lg border p-3 transition-colors hover:bg-secondary/50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {apt.client?.name || "Client"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {apt.scheduledStartTime && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="size-3" />
                          {format(new Date(apt.scheduledStartTime), "h:mm a")}
                          {apt.scheduledEndTime &&
                            ` - ${format(new Date(apt.scheduledEndTime), "h:mm a")}`}
                        </span>
                      )}
                      {apt.placement && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3" />
                          {apt.placement}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <StatusBadge status={apt.status} />
                    {apt.bookingType && (
                      <Badge variant="outline" className="text-xs">
                        {apt.bookingType}
                      </Badge>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Blocked time */}
        {blockedEntries.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                Blocked Time ({blockedEntries.length})
              </h3>
              {blockedEntries.map((block) => (
                <div
                  key={block.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm">
                      {formatTime(block.startTime)} - {formatTime(block.endTime)}
                    </p>
                    {block.notes && (
                      <p className="text-xs text-muted-foreground">{block.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    onClick={() => deleteBlock(block.id)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}

        {data.appointments.length === 0 && blockedEntries.length === 0 && !data.exception && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            No appointments or blocks for this day
          </p>
        )}

        <Separator />

        {/* Quick actions */}
        <div className="flex gap-2">
          <BlockTimeDialog date={date} onSuccess={onRefresh} />
          {!data.exception && (
            <AddExceptionDialog date={date} onSuccess={onRefresh} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
