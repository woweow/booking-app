import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (error) {
    console.error("Cron cleanup tokens error:", error);
    return NextResponse.json(
      { error: "Failed to cleanup tokens" },
      { status: 500 }
    );
  }
}
