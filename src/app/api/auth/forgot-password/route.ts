import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/db";
import { ForgotPasswordSchema } from "@/lib/validations/auth";
import { logPasswordResetRequested } from "@/lib/audit";
import { checkRateLimit, passwordResetRateLimiter, getClientIp } from "@/lib/rate-limit";
import { sendEmail, passwordResetEmail } from "@/lib/email";

const TOKEN_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour
const TOKEN_BYTE_LENGTH = 32;

function generateToken(): string {
  return randomBytes(TOKEN_BYTE_LENGTH).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit
    const clientIp = getClientIp(request);
    const rateLimitResponse = await checkRateLimit(passwordResetRateLimiter, clientIp);
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    const result = ForgotPasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const { email } = result.data;
    const successMessage =
      "If an account exists with that email, you'll receive a password reset link.";

    // Look up user (don't reveal whether email exists)
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Always return success to prevent user enumeration
      return NextResponse.json({ message: successMessage });
    }

    // Generate and hash token
    const plainToken = generateToken();
    const tokenHash = hashToken(plainToken);

    // Store hashed token
    await prisma.passwordResetToken.create({
      data: {
        email,
        tokenHash,
        expiresAt: new Date(Date.now() + TOKEN_EXPIRATION_MS),
      },
    });

    // Audit log
    await logPasswordResetRequested(email, request);

    // Send password reset email
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/reset-password?token=${plainToken}`;
    const TOKEN_EXPIRATION_MINUTES = 60;

    const emailData = passwordResetEmail(user.name, resetLink, TOKEN_EXPIRATION_MINUTES);
    await sendEmail(email, emailData.subject, emailData.html);

    return NextResponse.json({ message: successMessage });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
