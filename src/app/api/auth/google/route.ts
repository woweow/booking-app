import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { generateOAuthUrl, isGoogleConfigured } from "@/lib/google-calendar";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isGoogleConfigured()) {
      return NextResponse.json(
        { error: "Google Calendar is not configured" },
        { status: 503 }
      );
    }

    // Generate CSRF state token
    const state = randomBytes(32).toString("hex");

    const cookieStore = await cookies();
    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    const url = generateOAuthUrl(state);

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Google OAuth init error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
