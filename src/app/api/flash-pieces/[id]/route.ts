import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, BookingStatus } from "@prisma/client";
import { updateFlashPieceSchema } from "@/lib/validations/flash-piece";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";
import { del } from "@vercel/blob";

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

    const piece = await prisma.flashPiece.findUnique({
      where: { id },
      include: { sizes: true },
    });

    if (!piece) {
      return NextResponse.json({ error: "Flash piece not found" }, { status: 404 });
    }

    return NextResponse.json({ flashPiece: piece });
  } catch (error) {
    console.error("Get flash piece error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.flashPiece.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Flash piece not found" }, { status: 404 });
    }

    const body = await request.json();
    const result = updateFlashPieceSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const { sizes, ...fields } = result.data;

    if (sizes) {
      // Delete existing sizes and recreate in a transaction
      const piece = await prisma.$transaction(async (tx) => {
        await tx.flashPieceSize.deleteMany({ where: { flashPieceId: id } });

        return tx.flashPiece.update({
          where: { id },
          data: {
            ...fields,
            sizes: {
              create: sizes.map((s) => ({
                size: s.size,
                priceAmountCents: s.priceAmountCents,
                durationMinutes: s.durationMinutes,
              })),
            },
          },
          include: { sizes: true },
        });
      });

      await createAuditLog({
        action: AuditAction.FLASH_PIECE_UPDATED,
        userId: session.user.id,
        userEmail: session.user.email!,
        resourceType: ResourceType.FLASH_PIECE,
        resourceId: id,
        result: AuditResult.SUCCESS,
        details: { updatedFields: Object.keys(result.data) },
        request,
      });

      return NextResponse.json({ flashPiece: piece });
    }

    // No sizes update — simple field update
    const piece = await prisma.flashPiece.update({
      where: { id },
      data: fields,
      include: { sizes: true },
    });

    await createAuditLog({
      action: AuditAction.FLASH_PIECE_UPDATED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.FLASH_PIECE,
      resourceId: id,
      result: AuditResult.SUCCESS,
      details: { updatedFields: Object.keys(result.data) },
      request,
    });

    return NextResponse.json({ flashPiece: piece });
  } catch (error) {
    console.error("Update flash piece error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const piece = await prisma.flashPiece.findUnique({
      where: { id },
      include: { bookings: { select: { id: true, status: true } } },
    });

    if (!piece) {
      return NextResponse.json({ error: "Flash piece not found" }, { status: 404 });
    }

    // Check for active bookings
    const terminalStatuses: BookingStatus[] = [
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED,
      BookingStatus.DECLINED,
    ];
    const activeBookings = piece.bookings.filter(
      (b) => !terminalStatuses.includes(b.status)
    );

    if (activeBookings.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete flash piece with active bookings" },
        { status: 409 }
      );
    }

    // Delete the piece (sizes cascade via onDelete: Cascade)
    await prisma.flashPiece.delete({ where: { id } });

    // Delete image from Vercel Blob
    try {
      await del(piece.imageUrl);
    } catch (blobError) {
      console.error("Failed to delete blob image:", blobError);
    }

    await createAuditLog({
      action: AuditAction.FLASH_PIECE_DELETED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.FLASH_PIECE,
      resourceId: id,
      result: AuditResult.SUCCESS,
      details: { name: piece.name, bookId: piece.bookId },
      request,
    });

    return NextResponse.json({ message: "Flash piece deleted" });
  } catch (error) {
    console.error("Delete flash piece error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
