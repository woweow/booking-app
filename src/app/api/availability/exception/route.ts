import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, ExceptionType } from "@prisma/client";
import { createExceptionSchema } from "@/lib/validations/availability";
import { createAvailabilityException } from "@/lib/availability";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = createExceptionSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", errors: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { date, type, customStartTime, customEndTime, reason } = result.data;

    const exception = await createAvailabilityException(
      new Date(date),
      type as ExceptionType,
      customStartTime,
      customEndTime,
      reason
    );

    return NextResponse.json({ exception }, { status: 201 });
  } catch (error) {
    console.error("Create exception error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Exception ID required" }, { status: 400 });
    }

    const exception = await prisma.availabilityException.findUnique({ where: { id } });
    if (!exception) {
      return NextResponse.json({ error: "Exception not found" }, { status: 404 });
    }

    await prisma.availabilityException.delete({ where: { id } });

    return NextResponse.json({ message: "Exception deleted" });
  } catch (error) {
    console.error("Delete exception error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
