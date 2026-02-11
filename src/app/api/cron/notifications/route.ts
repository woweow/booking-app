import { NextRequest, NextResponse } from "next/server";
import { processScheduledNotifications } from "@/lib/notifications";

export async function GET(request: NextRequest) {
  try {
    const cronSecret = request.headers.get("authorization")?.replace("Bearer ", "");

    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await processScheduledNotifications();

    return NextResponse.json(result);
  } catch (error) {
    console.error("Cron notifications error:", error);
    return NextResponse.json(
      { error: "Failed to process notifications" },
      { status: 500 }
    );
  }
}
