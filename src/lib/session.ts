import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import type { SessionUser, UserRole } from "@/lib/auth-types";
import { roleForDemoPhone } from "@/lib/demo-auth";
import { ensureDemoUser } from "@/lib/demo-session";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  readSessionToken,
  toSessionUser,
} from "@/lib/session-token";

/**
 * Resolves the current cookie session.
 *
 * Authentication is intentionally open in this testing build: a missing cookie
 * is not an error, and protected callers below fall back to the demo identity
 * for the requested area. The JWT itself is still a standard HS256 token signed
 * with AUTH_SECRET, so real session handling can be restored later.
 */
export const getSessionUser = cache(
  async (): Promise<SessionUser | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const claims = await readSessionToken(token);

    if (!claims) {
      return null;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: claims.id },
        select: {
          id: true,
          firebaseUid: true,
          name: true,
          phone: true,
          role: true,
        },
      });

      if (user) {
        return {
          id: user.id,
          firebaseUid: user.firebaseUid,
          name: user.name,
          phone: user.phone,
          // The cookie is the selected role in this dev build.
          role: claims.role,
        };
      }

      // The token references a deterministic demo id that has not been seeded
      // yet. Recreate that user instead of dropping the session.
      if (roleForDemoPhone(claims.phone)) {
        return ensureDemoUser(claims.role);
      }
    } catch (error) {
      console.warn(
        "[session] Database lookup failed; falling back to JWT claims.",
        error instanceof Error ? error.message : error,
      );
    }

    return toSessionUser(claims);
  },
);

/**
 * Every player route renders without a login wall. When no cookie is present
 * the seeded player identity is used so bookings and passes still resolve.
 */
export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (user) {
    return user;
  }

  return ensureDemoUser("PLAYER");
}

/**
 * Role checks are temporarily permissive. Visiting /owner or /admin directly
 * signs the browser into the matching demo identity instead of redirecting to
 * /login or throwing a 403.
 */
export async function requireRole(
  roles: readonly UserRole[],
  area: "owner" | "admin" = roles.length === 1 && roles[0] === "ADMIN"
    ? "admin"
    : "owner",
): Promise<SessionUser> {
  const user = await getSessionUser();

  if (user) {
    if (user.role !== "ADMIN" && roles.includes(user.role)) {
      return user;
    }

    if (user.role === "ADMIN") {
      // An admin session is allowed into every area. For owner pages, use the
      // seeded owner identity so the venue dashboard has data to render.
      return area === "owner" ? ensureDemoUser("OWNER") : user;
    }
  }

  return ensureDemoUser(area === "admin" ? "ADMIN" : "OWNER");
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
