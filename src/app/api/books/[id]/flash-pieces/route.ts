import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { createFlashPieceSchema } from "@/lib/validations/flash-piece";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    const flashPieces = await prisma.flashPiece.findMany({
      where: { bookId: id },
      include: {
        sizes: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ flashPieces });
  } catch (error) {
    console.error("List flash pieces error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const book = await prisma.book.findUnique({ where: { id } });
    if (!book) {
      return NextResponse.json({ error: "Book not found" }, { status: 404 });
    }

    if (book.type !== "FLASH") {
      return NextResponse.json(
        { error: "Flash pieces can only be added to FLASH books" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const result = createFlashPieceSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const piece = await prisma.flashPiece.create({
      data: {
        bookId: id,
        name: result.data.name,
        description: result.data.description || null,
        imageUrl: result.data.imageUrl,
        isRepeatable: result.data.isRepeatable,
        sizes: {
          create: result.data.sizes.map((s) => ({
            size: s.size,
            priceAmountCents: s.priceAmountCents,
            durationMinutes: s.durationMinutes,
          })),
        },
      },
      include: { sizes: true },
    });

    await createAuditLog({
      action: AuditAction.FLASH_PIECE_CREATED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.FLASH_PIECE,
      resourceId: piece.id,
      result: AuditResult.SUCCESS,
      details: { bookId: id, name: piece.name },
      request,
    });

    return NextResponse.json({ flashPiece: piece }, { status: 201 });
  } catch (error) {
    console.error("Create flash piece error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
