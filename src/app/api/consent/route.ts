import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { consentFormSchema } from "@/lib/validations/consent";
import { encryptMedicalData } from "@/lib/encryption";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== UserRole.CLIENT) {
      return NextResponse.json({ error: "Only clients can submit consent forms" }, { status: 403 });
    }

    const body = await request.json();
    const result = consentFormSchema.safeParse(body);

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      return NextResponse.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const data = result.data;

    // Verify booking exists and user owns it
    const booking = await prisma.booking.findUnique({
      where: { id: data.bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.clientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check consent not already submitted
    const existingConsent = await prisma.consentForm.findUnique({
      where: { bookingId: data.bookingId },
    });

    if (existingConsent) {
      return NextResponse.json(
        { error: "Consent form has already been submitted for this booking" },
        { status: 409 }
      );
    }

    // Encrypt medical fields
    const encryptedMedical = encryptMedicalData({
      skinConditions: data.skinConditions || null,
      allergies: data.allergies || null,
      medications: data.medications || null,
      bloodDisorders: data.bloodDisorders,
      isPregnant: data.isPregnant,
      recentSubstances: data.recentSubstances,
    });

    const consentForm = await prisma.consentForm.create({
      data: {
        bookingId: data.bookingId,
        userId: session.user.id,
        fullLegalName: data.fullLegalName,
        dateOfBirth: new Date(data.dateOfBirth),
        emergencyContact: data.emergencyContact,
        emergencyPhone: data.emergencyPhone,
        ...encryptedMedical,
        risksAcknowledged: data.risksAcknowledged as boolean,
        aftercareAgreed: data.aftercareAgreed as boolean,
        photoReleaseAgreed: data.photoReleaseAgreed,
        signatureDataUrl: data.signatureDataUrl,
        signedAt: new Date(),
      },
    });

    await createAuditLog({
      action: AuditAction.CONSENT_SUBMITTED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.CONSENT_FORM,
      resourceId: consentForm.id,
      result: AuditResult.SUCCESS,
      details: { bookingId: data.bookingId },
      request,
    });

    return NextResponse.json(
      { message: "Consent form submitted successfully", consentFormId: consentForm.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Submit consent form error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
