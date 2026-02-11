"use client";

import { useCallback, useEffect, useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  isSameDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DayDetailModal } from "./day-detail-modal";

type TimeBlock = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  type: string;
  bookingId?: string | null;
  notes?: string | null;
  booking?: {
    id: string;
    status: string;
    bookingType?: string;
    placement?: string;
    scheduledStartTime?: string;
    scheduledEndTime?: string;
    appointmentDate?: string;
    duration?: number;
    client?: { name: string; email: string };
  } | null;
};

type Exception = {
  id: string;
  date: string;
  type: string;
  reason?: string | null;
  customStartTime?: string | null;
  customEndTime?: string | null;
};

type CalendarData = {
  timeBlocks: TimeBlock[];
  exceptions: Exception[];
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDotColors(blocks: TimeBlock[], exception?: Exception) {
  const dots: { color: string; key: string }[] = [];

  if (exception?.type === "UNAVAILABLE") {
    return [{ color: "bg-destructive", key: "unavailable" }];
  }

  const types = new Set<string>();
  for (const block of blocks) {
    if (block.type === "BLOCKED_OFF") {
      types.add("blocked");
    } else if (block.booking) {
      const bt = block.booking.bookingType;
      if (bt === "FLASH") types.add("flash");
      else if (bt === "CUSTOM") types.add("custom");
      else if (bt === "AD_HOC") types.add("adhoc");
      else types.add("custom");
    }
  }

  if (types.has("flash")) dots.push({ color: "bg-purple-500", key: "flash" });
  if (types.has("custom")) dots.push({ color: "bg-blue-500", key: "custom" });
  if (types.has("adhoc")) dots.push({ color: "bg-amber-500", key: "adhoc" });
  if (types.has("blocked")) dots.push({ color: "bg-gray-400", key: "blocked" });

  return dots;
}

export function ArtistCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [data, setData] = useState<CalendarData>({ timeBlocks: [], exceptions: [] });
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const monthStr = format(currentMonth, "yyyy-MM");
      const res = await fetch(`/api/calendar?month=${monthStr}`);
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function getBlocksForDate(date: Date): TimeBlock[] {
    const dateStr = format(date, "yyyy-MM-dd");
    return data.timeBlocks.filter((b) => {
      const blockDate = typeof b.date === "string" ? b.date.split("T")[0] : format(new Date(b.date), "yyyy-MM-dd");
      return blockDate === dateStr;
    });
  }

  function getExceptionForDate(date: Date): Exception | undefined {
    const dateStr = format(date, "yyyy-MM-dd");
    return data.exceptions.find((e) => {
      const excDate = typeof e.date === "string" ? e.date.split("T")[0] : format(new Date(e.date), "yyyy-MM-dd");
      return excDate === dateStr;
    });
  }

  function handleDayClick(date: Date) {
    setSelectedDate(format(date, "yyyy-MM-dd"));
    setModalOpen(true);
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart); // Sunday start
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const selectedDayData = selectedDate
    ? {
        appointments: getBlocksForDate(new Date(selectedDate + "T12:00:00"))
          .filter((b) => b.type === "APPOINTMENT" && b.booking)
          .map((b) => ({
            id: b.booking!.id,
            status: b.booking!.status,
            bookingType: b.booking!.bookingType,
            placement: b.booking!.placement,
            client: b.booking!.client,
            scheduledStartTime: b.booking!.scheduledStartTime,
            scheduledEndTime: b.booking!.scheduledEndTime,
            appointmentDate: b.booking!.appointmentDate,
            duration: b.booking!.duration,
          })),
        timeBlocks: getBlocksForDate(new Date(selectedDate + "T12:00:00")),
        exception: getExceptionForDate(new Date(selectedDate + "T12:00:00")) || null,
      }
    : { appointments: [], timeBlocks: [], exception: null };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-light tracking-wide">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-10 sm:size-8"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-10 sm:size-8"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Day names header */}
          <div className="grid grid-cols-7 border-b">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="py-2 text-center text-xs font-medium text-muted-foreground"
              >
                <span className="sm:hidden">{name[0]}</span>
                <span className="hidden sm:inline">{name}</span>
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {days.map((d) => {
              const blocks = getBlocksForDate(d);
              const exception = getExceptionForDate(d);
              const dots = getDotColors(blocks, exception);
              const inMonth = isSameMonth(d, currentMonth);
              const today = isToday(d);
              const isUnavailable = exception?.type === "UNAVAILABLE";

              return (
                <button
                  key={d.toISOString()}
                  onClick={() => handleDayClick(d)}
                  className={cn(
                    "relative flex h-16 flex-col items-center border-b border-r p-1 text-sm transition-colors hover:bg-secondary/50 active:bg-secondary/50 sm:h-20",
                    !inMonth && "text-muted-foreground/40",
                    isUnavailable && "bg-destructive/5"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full text-xs",
                      today &&
                        "bg-primary text-primary-foreground font-medium"
                    )}
                  >
                    {format(d, "d")}
                  </span>

                  {dots.length > 0 && (
                    <div className="mt-auto flex gap-0.5">
                      {dots.slice(0, 4).map((dot) => (
                        <span
                          key={dot.key}
                          className={cn("size-1.5 rounded-full", dot.color)}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-purple-500" /> Flash
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-blue-500" /> Custom
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-500" /> Ad-hoc
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-gray-400" /> Blocked
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="size-2 rounded-full bg-destructive" /> Unavailable
            </span>
          </div>
        </>
      )}

      {/* Day detail modal */}
      {selectedDate && (
        <DayDetailModal
          date={selectedDate}
          data={selectedDayData}
          open={modalOpen}
          onOpenChange={setModalOpen}
          onRefresh={fetchData}
        />
      )}
    </div>
  );
}
