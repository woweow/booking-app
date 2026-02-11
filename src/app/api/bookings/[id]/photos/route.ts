import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { uploadFile, validateImageFile } from "@/lib/blob";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // CLIENT: own bookings only
    if (session.user.role === UserRole.CLIENT && booking.clientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll("file") as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    // Validate all files first
    for (const file of files) {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        return NextResponse.json(
          { error: `${file.name}: ${validation.error}` },
          { status: 400 }
        );
      }
    }

    // Upload and create records
    const photos = await Promise.all(
      files.map(async (file) => {
        const blobUrl = await uploadFile(file);
        return prisma.bookingPhoto.create({
          data: {
            bookingId: id,
            blobUrl,
            filename: file.name,
          },
        });
      })
    );

    return NextResponse.json({ photos }, { status: 201 });
  } catch (error) {
    console.error("Add photos error:", error);
    return NextResponse.json(
      { error: "Failed to upload photos" },
      { status: 500 }
    );
  }
}
