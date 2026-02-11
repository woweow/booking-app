"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Check,
  MessageSquare,
  X,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  declineBookingSchema,
  requestInfoSchema,
} from "@/lib/validations/booking";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

const approveFormSchema = z.object({
  appointmentDate: z.string().min(1, "Appointment date is required"),
  appointmentTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be in HH:MM format"),
  duration: z.number().int().positive(),
  depositAmount: z.number().positive("Deposit amount must be positive"),
  totalAmount: z.number().positive().optional(),
  artistNotes: z.string().optional(),
});

type ApproveValues = z.infer<typeof approveFormSchema>;
type DeclineValues = z.infer<typeof declineBookingSchema>;
type RequestInfoValues = z.infer<typeof requestInfoSchema>;

function ApproveDialog({
  bookingId,
  onSuccess,
}: {
  bookingId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>();

  const form = useForm<ApproveValues>({
    resolver: zodResolver(approveFormSchema),
    defaultValues: {
      appointmentDate: "",
      appointmentTime: "",
      duration: 120,
      depositAmount: 100,
      totalAmount: undefined,
      artistNotes: "",
    },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: ApproveValues) {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to approve booking");
        return;
      }

      toast.success("Booking approved successfully");
      setOpen(false);
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-[hsl(82_8%_48%)] hover:bg-[hsl(82_8%_42%)]">
          <Check className="size-4" />
          Approve
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Approve Booking</DialogTitle>
          <DialogDescription>
            Set the appointment details and deposit amount
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="appointmentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? format(new Date(field.value), "PPP")
                            : "Pick a date"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={calendarDate}
                        onSelect={(date) => {
                          setCalendarDate(date);
                          if (date) field.onChange(date.toISOString().split("T")[0]);
                        }}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="appointmentTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={15}
                      step={15}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="depositAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deposit Amount ($)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      {...field}
                      onChange={(e) => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="totalAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Total Amount ($){" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="artistNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Notes{" "}
                    <span className="text-muted-foreground font-normal">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any notes for the client..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {isSubmitting ? "Approving..." : "Approve Booking"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function RequestInfoDialog({
  bookingId,
  onSuccess,
}: {
  bookingId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<RequestInfoValues>({
    resolver: zodResolver(requestInfoSchema),
    defaultValues: { artistNotes: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: RequestInfoValues) {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "INFO_REQUESTED",
          artistNotes: values.artistNotes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to send request");
        return;
      }

      toast.success("Information requested");
      setOpen(false);
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <MessageSquare className="size-4" />
          Request Info
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request More Information</DialogTitle>
          <DialogDescription>
            Send a message to the client asking for more details
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="artistNotes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="What additional information do you need?"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {isSubmitting ? "Sending..." : "Send Request"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeclineDialog({
  bookingId,
  onSuccess,
}: {
  bookingId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  const form = useForm<DeclineValues>({
    resolver: zodResolver(declineBookingSchema),
    defaultValues: { reason: "" },
  });

  const isSubmitting = form.formState.isSubmitting;

  async function onSubmit(values: DeclineValues) {
    try {
      const response = await fetch(`/api/bookings/${bookingId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to decline booking");
        return;
      }

      toast.success("Booking declined");
      setOpen(false);
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <X className="size-4" />
          Decline
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline Booking</DialogTitle>
          <DialogDescription>
            Please provide a reason for declining this booking
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Reason for declining..."
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                )}
                {isSubmitting ? "Declining..." : "Decline Booking"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function BookingActions({
  bookingId,
  status,
}: {
  bookingId: string;
  status: string;
}) {
  const router = useRouter();

  function refresh() {
    router.refresh();
  }

  async function markComplete() {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });

      if (!response.ok) {
        const data = await response.json();
        toast.error(data.error || "Failed to update");
        return;
      }

      toast.success("Booking marked as complete");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    }
  }

  if (status === "COMPLETED") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-[hsl(82_8%_48%)]/30 bg-[hsl(82_8%_48%)]/10 p-3 text-sm text-[hsl(82_8%_48%)]">
        <CheckCircle className="size-4" />
        This appointment has been completed
      </div>
    );
  }

  if (status === "DECLINED" || status === "CANCELLED") {
    return null;
  }

  if (status === "CONFIRMED") {
    return (
      <Button
        onClick={markComplete}
        className="gap-2 bg-[hsl(82_8%_48%)] hover:bg-[hsl(82_8%_42%)]"
      >
        <CheckCircle className="size-4" />
        Mark as Complete
      </Button>
    );
  }

  if (
    status === "PENDING" ||
    status === "INFO_REQUESTED"
  ) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row">
        <ApproveDialog bookingId={bookingId} onSuccess={refresh} />
        <RequestInfoDialog bookingId={bookingId} onSuccess={refresh} />
        <DeclineDialog bookingId={bookingId} onSuccess={refresh} />
      </div>
    );
  }

  return null;
}
