import { NextResponse } from "next/server";

/**
 * Authentication middleware is bypassed for feature testing.
 *
 * All player, owner, and admin areas render without a session cookie. The
 * matcher is kept so restoring authenticated routing later only requires
 * reintroducing the role checks here.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/owner/:path*",
    "/admin/:path*",
    "/checkout/:path*",
    "/my-bookings/:path*",
    "/booking/cancel/:path*",
    "/profile",
    "/login",
  ],
};
