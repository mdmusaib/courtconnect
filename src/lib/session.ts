import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextResponse } from "next/server";
import type { SessionUser, UserRole } from "@/lib/auth-types";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
  readSessionToken,
} from "@/lib/session-token";

export const getSessionUser = cache(
  async (): Promise<SessionUser | null> => {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    const claims = await readSessionToken(token);

    if (!claims) {
      return null;
    }

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

    if (!user) {
      return null;
    }

    return {
      id: user.id,
      firebaseUid: user.firebaseUid,
      name: user.name,
      phone: user.phone,
      role: user.role as UserRole,
    };
  },
);

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireRole(
  roles: readonly UserRole[],
  area: "owner" | "admin" = roles.length === 1 && roles[0] === "ADMIN"
    ? "admin"
    : "owner",
): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/${area}`)}`);
  }

  if (!roles.includes(user.role)) {
    redirect(`/?auth=forbidden&area=${area}`);
  }

  return user;
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
