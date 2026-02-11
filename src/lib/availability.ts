import { prisma } from "@/lib/db";
import { TimeBlockType, ExceptionType, Prisma } from "@prisma/client";
import type { TimeBlock, AvailabilityException } from "@prisma/client";

export interface Slot {
  start: string; // HH:MM
  end: string; // HH:MM
}

interface ReserveSlotResult {
  success: boolean;
  timeBlock?: TimeBlock;
  error?: "SLOT_TAKEN" | "TRANSACTION_FAILED";
  alternativeSlot?: Slot | null;
}

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

function getDayName(date: Date): (typeof DAY_NAMES)[number] {
  return DAY_NAMES[date.getDay()];
}

// Get operating hours for a book on a given date
export async function getBookAvailability(
  bookId: string,
  date: Date
): Promise<Slot | null> {
  const book = await prisma.book.findUnique({
    where: { id: bookId },
  });

  if (!book || !book.isActive) return null;

  // Check date range
  if (book.startDate && date < book.startDate) return null;
  if (book.endDate && date > book.endDate) return null;

  const day = getDayName(date);
  const startField = `${day}Start` as keyof typeof book;
  const endField = `${day}End` as keyof typeof book;

  const start = book[startField] as string | null;
  const end = book[endField] as string | null;

  if (!start || !end) return null;

  return { start, end };
}

// Find available time slots for a given date, accounting for blocks and exceptions
export async function getAvailableSlots(
  bookId: string,
  date: Date,
  durationMinutes: number
): Promise<Slot[]> {
  // Check for UNAVAILABLE exception
  const exception = await getAvailabilityException(date);
  if (exception?.type === ExceptionType.UNAVAILABLE) return [];

  // Get base hours: custom exception hours or book hours
  let baseSlot: Slot | null;
  if (exception?.type === ExceptionType.CUSTOM_HOURS && exception.customStartTime && exception.customEndTime) {
    baseSlot = { start: exception.customStartTime, end: exception.customEndTime };
  } else {
    baseSlot = await getBookAvailability(bookId, date);
  }

  if (!baseSlot) return [];

  // Get all time blocks for the date
  const dateStr = date.toISOString().split("T")[0];
  const timeBlocks = await prisma.timeBlock.findMany({
    where: {
      date: new Date(dateStr),
    },
    orderBy: { startTime: "asc" },
  });

  // Find gaps between blocks within base hours
  const baseStart = timeToMinutes(baseSlot.start);
  const baseEnd = timeToMinutes(baseSlot.end);

  const blockedRanges = timeBlocks.map((b) => ({
    start: timeToMinutes(b.startTime),
    end: timeToMinutes(b.endTime),
  }));

  const slots: Slot[] = [];
  let cursor = baseStart;

  for (const block of blockedRanges) {
    // Skip blocks entirely before cursor or after base end
    if (block.end <= cursor) continue;
    if (block.start >= baseEnd) break;

    // Gap before this block
    const gapEnd = Math.min(block.start, baseEnd);
    if (gapEnd - cursor >= durationMinutes) {
      slots.push({
        start: minutesToTime(cursor),
        end: minutesToTime(gapEnd),
      });
    }

    cursor = Math.max(cursor, block.end);
  }

  // Gap after last block
  if (baseEnd - cursor >= durationMinutes) {
    slots.push({
      start: minutesToTime(cursor),
      end: minutesToTime(baseEnd),
    });
  }

  return slots;
}

// Get the first available slot
export async function getEarliestSlot(
  bookId: string,
  date: Date,
  durationMinutes: number
): Promise<Slot | null> {
  const slots = await getAvailableSlots(bookId, date, durationMinutes);
  if (slots.length === 0) return null;

  const first = slots[0];
  const start = timeToMinutes(first.start);
  return {
    start: first.start,
    end: minutesToTime(start + durationMinutes),
  };
}

// Check if a date has any availability
export async function hasAvailabilityOnDate(
  bookId: string,
  date: Date,
  minimumMinutes: number = 30
): Promise<boolean> {
  const slots = await getAvailableSlots(bookId, date, minimumMinutes);
  return slots.length > 0;
}

// Bulk availability check for a date range (month view)
export async function getAvailabilityForDateRange(
  bookId: string,
  startDate: Date,
  endDate: Date,
  durationMinutes: number
): Promise<Map<string, boolean>> {
  const result = new Map<string, boolean>();
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split("T")[0];
    const hasAvail = await hasAvailabilityOnDate(bookId, current, durationMinutes);
    result.set(dateStr, hasAvail);
    current.setDate(current.getDate() + 1);
  }

  return result;
}

// Atomic slot reservation with serializable isolation
export async function reserveSlot(
  bookingId: string | null,
  date: Date,
  startTime: string,
  endTime: string,
  bookId?: string,
  durationMinutes?: number
): Promise<ReserveSlotResult> {
  const dateStr = date.toISOString().split("T")[0];

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Check for overlapping blocks
        const overlapping = await tx.timeBlock.findFirst({
          where: {
            date: new Date(dateStr),
            OR: [
              { startTime: { lt: endTime }, endTime: { gt: startTime } },
            ],
          },
        });

        if (overlapping) {
          return { success: false as const, error: "SLOT_TAKEN" as const };
        }

        // Create the time block
        const timeBlock = await tx.timeBlock.create({
          data: {
            date: new Date(dateStr),
            startTime,
            endTime,
            type: bookingId ? TimeBlockType.APPOINTMENT : TimeBlockType.BLOCKED_OFF,
            bookingId,
          },
        });

        return { success: true as const, timeBlock };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    if (!result.success) {
      // Suggest alternative slot
      let alternativeSlot: Slot | null = null;
      if (bookId && durationMinutes) {
        alternativeSlot = await getEarliestSlot(bookId, date, durationMinutes);
      }
      return { success: false, error: "SLOT_TAKEN", alternativeSlot };
    }

    return { success: true, timeBlock: result.timeBlock };
  } catch (error) {
    console.error("Reserve slot transaction failed:", error);
    let alternativeSlot: Slot | null = null;
    if (bookId && durationMinutes) {
      alternativeSlot = await getEarliestSlot(bookId, date, durationMinutes);
    }
    return { success: false, error: "TRANSACTION_FAILED", alternativeSlot };
  }
}

// ============================================================
// TimeBlock CRUD
// ============================================================

export async function createTimeBlock(
  bookingId: string | null,
  date: Date,
  startTime: string,
  endTime: string,
  type: TimeBlockType,
  notes?: string
): Promise<TimeBlock> {
  const dateStr = date.toISOString().split("T")[0];
  return prisma.timeBlock.create({
    data: {
      date: new Date(dateStr),
      startTime,
      endTime,
      type,
      bookingId,
      notes: notes || null,
    },
  });
}

export async function deleteTimeBlock(timeBlockId: string): Promise<void> {
  await prisma.timeBlock.delete({ where: { id: timeBlockId } });
}

export async function deleteTimeBlocksByBookingId(bookingId: string): Promise<void> {
  await prisma.timeBlock.deleteMany({ where: { bookingId } });
}

export async function getTimeBlocksByBookingId(bookingId: string): Promise<TimeBlock[]> {
  return prisma.timeBlock.findMany({ where: { bookingId } });
}

// ============================================================
// AvailabilityException CRUD
// ============================================================

export async function getAvailabilityException(
  date: Date
): Promise<AvailabilityException | null> {
  const dateStr = date.toISOString().split("T")[0];
  return prisma.availabilityException.findUnique({
    where: { date: new Date(dateStr) },
  });
}

export async function createAvailabilityException(
  date: Date,
  type: ExceptionType,
  customStartTime?: string,
  customEndTime?: string,
  reason?: string
): Promise<AvailabilityException> {
  const dateStr = date.toISOString().split("T")[0];
  return prisma.availabilityException.create({
    data: {
      date: new Date(dateStr),
      type,
      customStartTime: customStartTime || null,
      customEndTime: customEndTime || null,
      reason: reason || null,
    },
  });
}

export async function deleteAvailabilityException(exceptionId: string): Promise<void> {
  await prisma.availabilityException.delete({ where: { id: exceptionId } });
}
