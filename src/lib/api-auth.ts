import "server-only";

import { NextResponse } from "next/server";
import type { SessionUser, UserRole } from "@/lib/auth-types";
import type { DemoRole } from "@/lib/demo-auth";
import { ensureDemoUser } from "@/lib/demo-session";
import { getSessionUser } from "@/lib/session";

type ApiAuthResult =
  | { user: SessionUser; response: null }
  | { user: null; response: NextResponse };

function fallbackRole(roles?: readonly UserRole[]): DemoRole {
  if (!roles || roles.length === 0) {
    return "PLAYER";
  }

  if (roles.includes("OWNER")) {
    return "OWNER";
  }

  if (roles.includes("ADMIN")) {
    return "ADMIN";
  }

  return "PLAYER";
}

/**
 * Development API auth shim.
 *
 * It never returns 401/403: if the cookie is missing or does not carry one of
 * the requested roles, the matching seeded demo user is returned instead. The
 * route handlers continue to work unchanged because this keeps the same
 * `{ user, response }` result shape.
 */
export async function requireApiUser(
  roles?: readonly UserRole[],
): Promise<ApiAuthResult> {
  const user = await getSessionUser();

  if (user && (!roles || roles.includes(user.role))) {
    return { user, response: null };
  }

  const demo = await ensureDemoUser(fallbackRole(roles));

  return { user: demo, response: null };
}
