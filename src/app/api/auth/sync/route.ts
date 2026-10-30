import { Role, type User } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  isMockOtp,
  mockFallbackName,
  normalizeMockPhone,
  readMockSessionToken,
  roleForMockPhone,
} from "@/lib/auth-mock";
import { normalizePhoneNumber } from "@/lib/auth-phone";
import type { SessionUser, UserRole } from "@/lib/auth-types";
import { getFirebaseAuth } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/session";
import { createSessionToken } from "@/lib/session-token";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface SyncBody {
  idToken?: unknown;
  mockToken?: unknown;
  name?: unknown;
  otp?: unknown;
  phone?: unknown;
}

interface VerifiedIdentity {
  phone: string;
  firebaseUid: string | null;
}

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, code }, { status });
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

function publicUser(user: {
  id: string;
  firebaseUid: string | null;
  name: string;
  phone: string;
  role: Role;
}): SessionUser {
  return {
    id: user.id,
    firebaseUid: user.firebaseUid,
    name: user.name,
    phone: user.phone,
    role: user.role as UserRole,
  };
}

/**
 * Accepts either a Firebase ID token (legacy flow) or a signed-in mock phone
 * identity. The mock branch requires either the short-lived token minted by
 * src/lib/auth-mock.ts or the configured test OTP.
 */
async function verifyIdentity(
  body: SyncBody,
): Promise<{ identity: VerifiedIdentity } | { response: NextResponse }> {
  const idToken =
    typeof body.idToken === "string" ? body.idToken.trim() : "";

  if (idToken) {
    const auth = getFirebaseAuth();

    if (!auth) {
      return {
        response: jsonError(
          "Authentication is not configured on this server.",
          503,
          "AUTH_NOT_CONFIGURED",
        ),
      };
    }

    try {
      const decoded = await auth.verifyIdToken(idToken, true);
      const phone = decoded.phone_number
        ? normalizePhoneNumber(decoded.phone_number)
        : null;

      if (!phone) {
        return {
          response: jsonError(
            "A verified Indian mobile number is required to use CourtConnect.",
            403,
            "PHONE_NUMBER_REQUIRED",
          ),
        };
      }

      return { identity: { phone, firebaseUid: decoded.uid } };
    } catch (error) {
      console.warn(
        "Firebase ID token verification failed:",
        error instanceof Error ? error.message : "unknown error",
      );
      return {
        response: jsonError(
          "Your sign-in token is invalid or has expired. Please request a new code.",
          401,
          "INVALID_ID_TOKEN",
        ),
      };
    }
  }

  const tokenPayload = readMockSessionToken(body.mockToken);
  const bodyPhone = normalizeMockPhone(body.phone);

  if (tokenPayload) {
    if (bodyPhone && bodyPhone !== tokenPayload.phone) {
      return {
        response: jsonError(
          "The phone number does not match the verified session token.",
          401,
          "PHONE_MISMATCH",
        ),
      };
    }

    return {
      identity: { phone: tokenPayload.phone, firebaseUid: null },
    };
  }

  if (bodyPhone && typeof body.otp === "string" && isMockOtp(body.otp)) {
    return { identity: { phone: bodyPhone, firebaseUid: null } };
  }

  if (!bodyPhone) {
    return {
      response: jsonError(
        "Enter a valid 10-digit mobile number.",
        400,
        "INVALID_PHONE",
      ),
    };
  }

  return {
    response: jsonError(
      "Complete the phone verification step before creating a session.",
      401,
      "MOCK_VERIFICATION_REQUIRED",
    ),
  };
}

async function resolveUser(
  identity: VerifiedIdentity,
  requestedName: string | null,
): Promise<{ user: User; created: boolean }> {
  if (identity.firebaseUid) {
    const byUid = await prisma.user.findUnique({
      where: { firebaseUid: identity.firebaseUid },
      select: { id: true },
    });

    if (byUid) {
      // The verified phone may legitimately change on the Firebase user. Keep
      // the same database identity and synchronise the canonical phone.
      const user = await prisma.user.update({
        where: { id: byUid.id },
        data: {
          phone: identity.phone,
          firebaseUid: identity.firebaseUid,
          ...(requestedName ? { name: requestedName } : {}),
        },
      });

      return { user, created: false };
    }
  }

  const byPhone = await prisma.user.findUnique({
    where: { phone: identity.phone },
    select: { id: true },
  });

  if (byPhone) {
    // Seeded owners/admins and returning players keep their existing role.
    const user = await prisma.user.update({
      where: { id: byPhone.id },
      data: {
        ...(identity.firebaseUid
          ? { firebaseUid: identity.firebaseUid }
          : {}),
        ...(requestedName ? { name: requestedName } : {}),
      },
    });

    return { user, created: false };
  }

  const role = roleForMockPhone(identity.phone) as Role;

  try {
    const user = await prisma.user.create({
      data: {
        firebaseUid: identity.firebaseUid,
        phone: identity.phone,
        name: requestedName ?? mockFallbackName(identity.phone),
        role,
      },
    });

    return { user, created: true };
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "P2002"
    ) {
      // A concurrent request created the same phone first.
      const user = await prisma.user.update({
        where: { phone: identity.phone },
        data: {
          ...(identity.firebaseUid
            ? { firebaseUid: identity.firebaseUid }
            : {}),
          ...(requestedName ? { name: requestedName } : {}),
        },
      });

      return { user, created: false };
    }

    throw error;
  }
}

export async function POST(request: Request) {
  let body: SyncBody;

  try {
    body = (await request.json()) as SyncBody;
  } catch {
    return jsonError("Invalid JSON body.", 400, "INVALID_JSON");
  }

  const verification = await verifyIdentity(body);

  if ("response" in verification) {
    return verification.response;
  }

  const requestedName = sanitizeName(body.name);

  try {
    const { user, created } = await resolveUser(
      verification.identity,
      requestedName,
    );
    const safeUser = publicUser(user);
    const token = await createSessionToken({
      id: safeUser.id,
      uid: safeUser.firebaseUid,
      name: safeUser.name,
      phone: safeUser.phone,
      role: safeUser.role,
    });

    const response = NextResponse.json(
      {
        user: safeUser,
        created,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    const prismaCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error
        ? (error as { code?: string }).code
        : undefined;

    console.error(
      "[auth/sync] database user sync failed:",
      prismaCode ? `prisma_code=${prismaCode} ` : "",
      err.message,
      err.stack ?? "",
    );

    // A concurrent request created the same phone first; keep the conflict
    // explicit instead of surfacing a raw Prisma error.
    if (prismaCode === "P2002") {
      return NextResponse.json(
        {
          success: false,
          error: "This phone number is already linked to another account.",
        },
        { status: 409, headers: { "Cache-Control": "no-store" } },
      );
    }

    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
