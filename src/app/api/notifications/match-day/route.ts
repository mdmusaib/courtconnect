import { NextResponse } from "next/server";
import { sendMatchDayReminders } from "@/lib/fcm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // Local development can call the endpoint without a scheduler secret.
    // Production must configure CRON_SECRET before reminders are enabled.
    return process.env.NODE_ENV !== "production";
  }

  const authorization = request.headers.get("authorization") ?? "";
  const bearer = authorization.replace(/^Bearer\s+/i, "").trim();
  const headerSecret = request.headers.get("x-cron-secret")?.trim();

  return bearer === secret || headerSecret === secret;
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      {
        error: "A valid cron secret is required.",
        code: "CRON_UNAUTHORIZED",
      },
      { status: 401 },
    );
  }

  try {
    const result = await sendMatchDayReminders();

    return NextResponse.json({
      ok: true,
      ...result,
      message: result.configured
        ? "Match-day reminder run completed."
        : "FCM is not configured; no reminders were sent.",
    });
  } catch (error) {
    console.error("Match-day reminder run failed:", error);
    return NextResponse.json(
      {
        error: "Match-day reminders could not be processed.",
        code: "REMINDER_RUN_FAILED",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
