import "server-only";

import { NextResponse } from "next/server";
import type { SessionUser, UserRole } from "@/lib/auth-types";
import { getSessionUser } from "@/lib/session";

type ApiAuthResult =
  | { user: SessionUser; response: null }
  | { user: null; response: NextResponse };

export async function requireApiUser(
  roles?: readonly UserRole[],
): Promise<ApiAuthResult> {
  const user = await getSessionUser();

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error: "Sign in to continue.",
          code: "AUTH_REQUIRED",
        },
        { status: 401 },
      ),
    };
  }

  if (roles && !roles.includes(user.role)) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error: "Your account does not have access to this action.",
          code: "ROLE_FORBIDDEN",
        },
        { status: 403 },
      ),
    };
  }

  return { user, response: null };
}
