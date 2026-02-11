import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole, PaymentRequestStatus } from "@prisma/client";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";

type RouteParams = { params: Promise<{ id: string }> };

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

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
    });

    if (!paymentRequest) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    if (paymentRequest.status !== PaymentRequestStatus.PENDING) {
      return NextResponse.json(
        { error: "Only pending payment requests can be cancelled" },
        { status: 400 }
      );
    }

    const updated = await prisma.paymentRequest.update({
      where: { id },
      data: { status: PaymentRequestStatus.CANCELLED },
    });

    await createAuditLog({
      action: AuditAction.PAYMENT_REQUEST_CANCELLED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.PAYMENT_REQUEST,
      resourceId: id,
      result: AuditResult.SUCCESS,
      details: { bookingId: paymentRequest.bookingId },
      request,
    });

    return NextResponse.json({ paymentRequest: updated });
  } catch (error) {
    console.error("Cancel payment request error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
