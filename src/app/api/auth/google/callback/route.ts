import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { exchangeCodeForTokens, storeGoogleConnection } from "@/lib/google-calendar";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== UserRole.ARTIST) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL("/admin/settings?google=error&message=" + encodeURIComponent(error), request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/admin/settings?google=error&message=missing_params", request.url)
      );
    }

    // Verify CSRF state
    const cookieStore = await cookies();
    const savedState = cookieStore.get("google_oauth_state")?.value;
    cookieStore.delete("google_oauth_state");

    if (!savedState || savedState !== state) {
      return NextResponse.redirect(
        new URL("/admin/settings?google=error&message=invalid_state", request.url)
      );
    }

    // Exchange code for tokens
    const { accessToken, refreshToken, expiresIn, email } =
      await exchangeCodeForTokens(code);

    // Store encrypted tokens
    await storeGoogleConnection(
      session.user.id,
      email,
      accessToken,
      refreshToken,
      expiresIn
    );

    return NextResponse.redirect(
      new URL("/admin/settings?google=connected", request.url)
    );
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/admin/settings?google=error&message=exchange_failed", request.url)
    );
  }
}
