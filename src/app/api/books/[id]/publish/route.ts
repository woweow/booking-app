import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import {
  createAuditLog,
  AuditAction,
  AuditResult,
  ResourceType,
} from "@/lib/audit";
import {
  syncBookOpenDaysToGoogleCalendar,
  deleteBookOpenDaysFromGoogleCalendar,
} from "@/lib/google-calendar";

type RouteParams = { params: Promise<{ id: string }> };

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

/** POST — Publish a book (set isActive: true) with validation */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        flashPieces: { include: { sizes: true } },
      },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    // Validate readiness
    const missing: string[] = [];

    // Must have at least 1 day with operating hours
    const hasOperatingHours = DAYS.some((day) => {
      const start = book[`${day}Start` as keyof typeof book];
      const end = book[`${day}End` as keyof typeof book];
      return start && end;
    });
    if (!hasOperatingHours) {
      missing.push("At least 1 day with operating hours is required");
    }

    // Must have a start date
    if (!book.startDate) {
      missing.push("Start date is required");
    }

    // Must have a deposit amount
    if (!book.depositAmountCents) {
      missing.push("Deposit amount is required");
    }

    // FLASH type: must have at least 1 flash piece with at least 1 size
    if (book.type === "FLASH") {
      const piecesWithSizes = book.flashPieces.filter(
        (p) => p.sizes.length > 0
      );
      if (piecesWithSizes.length === 0) {
        missing.push(
          "At least 1 flash piece with at least 1 size/price is required"
        );
      }
    }

    if (missing.length > 0) {
      return NextResponse.json(
        { error: "Book is not ready to publish", missing },
        { status: 400 }
      );
    }

    const updated = await prisma.book.update({
      where: { id },
      data: { isActive: true },
    });

    await createAuditLog({
      action: AuditAction.BOOK_PUBLISHED,
      userId: session.user.id,
      userEmail: session.user.email,
      resourceType: ResourceType.BOOK,
      resourceId: book.id,
      result: AuditResult.SUCCESS,
      request,
    });

    // Sync open availability days to Google Calendar (non-blocking)
    syncBookOpenDaysToGoogleCalendar(book).catch((err) =>
      console.error("Failed to sync book open days to Google Calendar:", err)
    );

    return NextResponse.json({ book: updated });
  } catch (error) {
    console.error("Publish book error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}

/** DELETE — Unpublish a book (set isActive: false) */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const updated = await prisma.book.update({
      where: { id },
      data: { isActive: false },
    });

    await createAuditLog({
      action: AuditAction.BOOK_UNPUBLISHED,
      userId: session.user.id,
      userEmail: session.user.email,
      resourceType: ResourceType.BOOK,
      resourceId: book.id,
      result: AuditResult.SUCCESS,
      request,
    });

    // Remove open availability events from Google Calendar (non-blocking)
    deleteBookOpenDaysFromGoogleCalendar(id).catch((err) =>
      console.error("Failed to delete book open days from Google Calendar:", err)
    );

    return NextResponse.json({ book: updated });
  } catch (error) {
    console.error("Unpublish book error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
