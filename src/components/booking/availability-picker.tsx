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
  isBefore,
  startOfDay,
} from "date-fns";
import { ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Slot = {
  start: string;
  end: string;
};

type AvailabilityPickerProps = {
  bookId: string;
  duration: number;
  onSlotSelect: (date: string, slot: Slot) => void;
  selectedDate?: string;
  selectedSlot?: Slot;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(time: string) {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export function AvailabilityPicker({
  bookId,
  duration,
  onSlotSelect,
  selectedDate,
  selectedSlot,
}: AvailabilityPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingMonth, setLoadingMonth] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [pickedDate, setPickedDate] = useState<string | null>(selectedDate || null);

  const fetchMonth = useCallback(async () => {
    setLoadingMonth(true);
    try {
      const monthStr = format(currentMonth, "yyyy-MM");
      const res = await fetch(
        `/api/availability?month=${monthStr}&bookId=${bookId}&duration=${duration}`
      );
      if (res.ok) {
        const data = await res.json();
        setAvailability(data.availability || {});
      }
    } catch {
      // silently fail
    } finally {
      setLoadingMonth(false);
    }
  }, [currentMonth, bookId, duration]);

  useEffect(() => {
    fetchMonth();
  }, [fetchMonth]);

  async function fetchSlots(date: string) {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const res = await fetch(
        `/api/availability?date=${date}&bookId=${bookId}&duration=${duration}`
      );
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingSlots(false);
    }
  }

  function handleDayClick(date: Date) {
    const dateStr = format(date, "yyyy-MM-dd");
    if (!availability[dateStr]) return;
    setPickedDate(dateStr);
    fetchSlots(dateStr);
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const today = startOfDay(new Date());

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {loadingMonth ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Day names */}
          <div className="grid grid-cols-7">
            {DAY_NAMES.map((name) => (
              <div
                key={name}
                className="py-1 text-center text-xs text-muted-foreground"
              >
                {name}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((d) => {
              const dateStr = format(d, "yyyy-MM-dd");
              const inMonth = isSameMonth(d, currentMonth);
              const isPast = isBefore(d, today);
              const isAvailable = availability[dateStr] === true && !isPast;
              const isSelected = pickedDate === dateStr;
              const isTodayDate = isToday(d);

              return (
                <button
                  key={d.toISOString()}
                  onClick={() => isAvailable && handleDayClick(d)}
                  disabled={!isAvailable}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg text-sm transition-colors",
                    !inMonth && "text-muted-foreground/30",
                    inMonth && !isAvailable && "text-muted-foreground/50",
                    isAvailable && "cursor-pointer hover:bg-[hsl(82_8%_48%)]/20 active:bg-[hsl(82_8%_48%)]/20 font-medium",
                    isAvailable && !isSelected && "text-[hsl(82_8%_48%)]",
                    isSelected && "bg-[hsl(82_8%_48%)] text-white",
                    isTodayDate && !isSelected && "ring-1 ring-ring"
                  )}
                >
                  {format(d, "d")}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Slot selection */}
      {pickedDate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Available Times
            </CardTitle>
            <CardDescription>
              {format(new Date(pickedDate + "T12:00:00"), "EEEE, MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : slots.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No available time slots for this date
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {slots.map((slot) => {
                  const isSlotSelected =
                    selectedSlot?.start === slot.start &&
                    selectedSlot?.end === slot.end &&
                    selectedDate === pickedDate;

                  return (
                    <button
                      key={`${slot.start}-${slot.end}`}
                      onClick={() => onSlotSelect(pickedDate, slot)}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border p-3 text-sm transition-colors",
                        isSlotSelected
                          ? "border-[hsl(82_8%_48%)] bg-[hsl(82_8%_48%)]/10"
                          : "hover:border-ring hover:bg-secondary/50 active:border-ring active:bg-secondary/50"
                      )}
                    >
                      <Clock className="size-4 text-muted-foreground" />
                      {formatTime(slot.start)} - {formatTime(slot.end)}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
