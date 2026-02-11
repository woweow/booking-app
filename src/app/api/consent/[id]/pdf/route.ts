import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { decryptMedicalData } from "@/lib/encryption";
import { createAuditLog, AuditAction, AuditResult, ResourceType } from "@/lib/audit";
import ReactPDF from "@react-pdf/renderer";
import { ConsentFormPDF } from "@/lib/consent-pdf";

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
          select: { id: true, clientId: true, appointmentDate: true, placement: true, size: true },
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
      action: AuditAction.CONSENT_DOWNLOADED,
      userId: session.user.id,
      userEmail: session.user.email!,
      resourceType: ResourceType.CONSENT_FORM,
      resourceId: id,
      result: AuditResult.SUCCESS,
      details: { bookingId: consentForm.bookingId },
      request,
    });

    const pdfStream = await ReactPDF.renderToStream(
      ConsentFormPDF({
        consentForm: {
          ...consentForm,
          ...decryptedMedical,
        },
      })
    );

    // Convert Node.js Readable to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        pdfStream.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });
        pdfStream.on("end", () => {
          controller.close();
        });
        pdfStream.on("error", (err: Error) => {
          controller.error(err);
        });
      },
    });

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="consent-form-${consentForm.bookingId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Generate consent PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
