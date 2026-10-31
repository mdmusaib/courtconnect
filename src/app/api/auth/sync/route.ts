import { NextResponse } from "next/server";
import type { SessionUser, UserRole } from "@/lib/auth-types";
import {
  demoRoleForKey,
  normalizeDemoPhone,
  roleForDemoPhone,
} from "@/lib/demo-auth";
import { ensureDemoUser } from "@/lib/demo-session";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";
import { createSessionToken } from "@/lib/session-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SyncBody {
  account?: unknown;
  name?: unknown;
  phone?: unknown;
  role?: unknown;
  userRole?: unknown;
}

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json(
    { error: message, code },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function sanitizeName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);

  return cleaned.length >= 2 ? cleaned : null;
}

/**
 * Creates a phone-based session without OTP verification. This keeps the
 * endpoint useful for API tests and older clients while the role buttons use
 * the deterministic demo identities.
 */
async function resolvePhoneUser(
  phone: string,
  requestedName: string | null,
  fallbackRole: UserRole,
): Promise<SessionUser> {
  try {
    const existing = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        firebaseUid: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    if (existing) {
      return {
        id: existing.id,
        firebaseUid: existing.firebaseUid,
        name: requestedName ?? existing.name,
        phone: existing.phone,
        role: existing.role as UserRole,
      };
    }

    const user = await prisma.user.create({
      data: {
        phone,
        name: requestedName ?? `Player ${phone.slice(-4)}`,
        role: fallbackRole,
      },
      select: {
        id: true,
        firebaseUid: true,
        name: true,
        phone: true,
        role: true,
      },
    });

    return {
      id: user.id,
      firebaseUid: user.firebaseUid,
      name: user.name,
      phone: user.phone,
      role: user.role as UserRole,
    };
  } catch (error) {
    console.warn(
      "[auth/sync] Phone session could not be persisted; using a demo identity.",
      error instanceof Error ? error.message : error,
    );

    return ensureDemoUser(fallbackRole);
  }
}

/**
 * Development sign-in endpoint.
 *
 * Request body:
 *   { "role": "PLAYER" | "OWNER" | "ADMIN" }
 *
 * or, for compatibility:
 *   { "phone": "9876543210", "name": "Optional name" }
 *
 * No OTP, Firebase ID token, or phone verification is required. Every request
 * that reaches this handler receives a standard HS256 `courtconnect_session`
 * JWT cookie signed with AUTH_SECRET.
 */
export async function POST(request: Request) {
  let body: SyncBody = {};

  try {
    body = (await request.json()) as SyncBody;
  } catch {
    // An empty body is valid: it selects the player role by default.
  }

  const requestedRole =
    demoRoleForKey(body.role) ??
    demoRoleForKey(body.userRole) ??
    demoRoleForKey(body.account);
  const requestedName = sanitizeName(body.name);
  const requestedPhone = normalizeDemoPhone(body.phone);

  let user: SessionUser;
  let created = false;

  if (requestedRole) {
    user = await ensureDemoUser(requestedRole);
  } else if (requestedPhone) {
    const role = roleForDemoPhone(requestedPhone) ?? "PLAYER";
    user = await resolvePhoneUser(requestedPhone, requestedName, role);
  } else {
    user = await ensureDemoUser("PLAYER");
    created = true;
  }

  const token = await createSessionToken({
    id: user.id,
    uid: user.firebaseUid,
    name: user.name,
    phone: user.phone,
    role: user.role,
  });

  const response = NextResponse.json(
    {
      user,
      created,
      demo: true,
      auth: "bypass",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  setSessionCookie(response, token);
  return response;
}

export async function GET() {
  return jsonError(
    "Use POST with a role to create a demo session.",
    405,
    "METHOD_NOT_ALLOWED",
  );
}
