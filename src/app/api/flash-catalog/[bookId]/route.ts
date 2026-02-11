import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

type RouteParams = { params: Promise<{ bookId: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { bookId } = await params;

    const book = await prisma.book.findUnique({
      where: { id: bookId },
    });

    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.type !== "FLASH") {
      return NextResponse.json({ error: "Not a flash book" }, { status: 404 });
    }

    if (!book.isActive) {
      return NextResponse.json({ error: "Book is not active" }, { status: 404 });
    }

    // Check date range
    const today = new Date().toISOString().split("T")[0];
    if (book.startDate && today < book.startDate.toISOString().split("T")[0]) {
      return NextResponse.json({ error: "Book is not yet open" }, { status: 404 });
    }
    if (book.endDate && today > book.endDate.toISOString().split("T")[0]) {
      return NextResponse.json({ error: "Book has closed" }, { status: 404 });
    }

    const flashPieces = await prisma.flashPiece.findMany({
      where: { bookId },
      select: {
        id: true,
        name: true,
        description: true,
        imageUrl: true,
        isRepeatable: true,
        isClaimed: true,
        sizes: {
          select: {
            id: true,
            size: true,
            priceAmountCents: true,
            durationMinutes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      book: {
        id: book.id,
        name: book.name,
        description: book.description,
        startDate: book.startDate,
        endDate: book.endDate,
        depositAmountCents: book.depositAmountCents,
      },
      flashPieces,
    });
  } catch (error) {
    console.error("Flash catalog error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
