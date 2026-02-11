import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { decryptMedicalData } from "@/lib/encryption";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const consentForm = await prisma.consentForm.findUnique({
      where: { id },
      include: {
        booking: {
          select: { id: true, clientId: true, appointmentDate: true, placement: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!consentForm) {
      return NextResponse.json({ error: "Consent form not found" }, { status: 404 });
    }

    // CLIENT: own forms only
    if (session.user.role === UserRole.CLIENT && consentForm.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Decrypt medical fields
    const decryptedMedical = decryptMedicalData({
      skinConditions: consentForm.skinConditions,
      allergies: consentForm.allergies,
      medications: consentForm.medications,
      bloodDisorders: consentForm.bloodDisorders,
      isPregnant: consentForm.isPregnant,
      recentSubstances: consentForm.recentSubstances,
    });

    // Audit log
    await createAuditLog({
      action: AuditAction.CONSENT_VIEWED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.CONSENT_FORM,
      resourceId: id,
      result: AuditResult.SUCCESS,
      details: { bookingId: consentForm.bookingId },
      request,
    });

    return NextResponse.json({
      consentForm: {
        ...consentForm,
        ...decryptedMedical,
      },
    });
  } catch (error) {
    console.error("Get consent form error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
