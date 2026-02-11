import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET — Public flash catalog index. Returns all published, in-range flash books. */
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const books = await prisma.book.findMany({
      where: {
        isActive: true,
        type: "FLASH",
        startDate: { lte: today },
        OR: [{ endDate: null }, { endDate: { gte: today } }],
      },
      include: {
        flashPieces: {
          include: { sizes: true },
        },
        _count: { select: { flashPieces: true } },
      },
      orderBy: { startDate: "desc" },
    });

    const result = books.map((book) => {
      const allPrices = book.flashPieces.flatMap((p) =>
        p.sizes.map((s) => s.priceAmountCents)
      );
      const minPrice = allPrices.length > 0 ? Math.min(...allPrices) : null;
      const maxPrice = allPrices.length > 0 ? Math.max(...allPrices) : null;

      return {
        id: book.id,
        name: book.name,
        description: book.description,
        startDate: book.startDate,
        endDate: book.endDate,
        pieceCount: book._count.flashPieces,
        priceRange: { min: minPrice, max: maxPrice },
      };
    });

    return NextResponse.json({ books: result });
  } catch (error) {
    console.error("Flash catalog index error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}
