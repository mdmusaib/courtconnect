import { NextResponse } from "next/server";
import { getFirebaseAuth } from "@/lib/firebase-admin";
import { clearSessionCookie, getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();

  return NextResponse.json(
    { user },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function DELETE() {
  const user = await getSessionUser();

  // Revoke Firebase refresh tokens so a stolen refresh token cannot mint fresh
  // ID tokens after the user signs out. Failure is non-fatal because the
  // HTTP-only session cookie is still cleared below.
  if (user?.firebaseUid) {
    const auth = getFirebaseAuth();

    if (auth) {
      await auth.revokeRefreshTokens(user.firebaseUid).catch((error) => {
        console.error(
          "Failed to revoke Firebase refresh tokens:",
          error instanceof Error ? error.message : "unknown error",
        );
      });
    }
  }

  const response = NextResponse.json(
    { success: true },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );

  clearSessionCookie(response);
  return response;
}
