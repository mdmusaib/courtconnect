import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_PLATFORMS = new Set(["web", "android", "ios"]);
const MAX_TOKEN_LENGTH = 4096;

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, code }, { status });
}

function readToken(body: unknown): string {
  const payload = (body ?? {}) as { token?: unknown };
  return typeof payload.token === "string" ? payload.token.trim() : "";
}

export async function POST(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) {
    return auth.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400, "INVALID_JSON");
  }

  const token = readToken(body);

  if (!token || token.length > MAX_TOKEN_LENGTH) {
    return jsonError(
      "A valid FCM registration token is required.",
      400,
      "INVALID_PUSH_TOKEN",
    );
  }

  const payload = (body ?? {}) as {
    platform?: unknown;
    userAgent?: unknown;
  };
  const platform =
    typeof payload.platform === "string" &&
    ALLOWED_PLATFORMS.has(payload.platform)
      ? payload.platform
      : "web";
  const userAgent =
    typeof payload.userAgent === "string"
      ? payload.userAgent.slice(0, 255)
      : null;

  try {
    const player = auth.user;
    const saved = await prisma.pushToken.upsert({
      where: { token },
      update: {
        userId: player.id,
        platform,
        userAgent,
        lastUsedAt: new Date(),
      },
      create: {
        userId: player.id,
        token,
        platform,
        userAgent,
      },
      select: { id: true, createdAt: true },
    });

    return NextResponse.json({
      success: true,
      id: saved.id,
      createdAt: saved.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Failed to save push token:", error);
    return jsonError(
      "Could not save this device for notifications.",
      500,
      "PUSH_TOKEN_SAVE_FAILED",
    );
  }
}

export async function DELETE(request: Request) {
  const auth = await requireApiUser();

  if (!auth.user) {
    return auth.response;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400, "INVALID_JSON");
  }

  const token = readToken(body);

  if (!token) {
    return jsonError(
      "A valid FCM registration token is required.",
      400,
      "INVALID_PUSH_TOKEN",
    );
  }

  try {
    const player = auth.user;
    const result = await prisma.pushToken.deleteMany({
      where: { token, userId: player.id },
    });

    return NextResponse.json({ success: true, removed: result.count });
  } catch (error) {
    console.error("Failed to remove push token:", error);
    return jsonError(
      "Could not remove this device from notifications.",
      500,
      "PUSH_TOKEN_DELETE_FAILED",
    );
  }
}
