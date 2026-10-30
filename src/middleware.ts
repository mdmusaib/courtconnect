import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/lib/auth-types";
import {
  SESSION_COOKIE_NAME,
  readSessionToken,
} from "@/lib/session-token";

type ProtectedArea = "owner" | "admin" | "checkout" | "player" | null;

function protectedArea(pathname: string): ProtectedArea {
  if (pathname === "/owner" || pathname.startsWith("/owner/")) {
    return "owner";
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return "admin";
  }

  if (pathname === "/checkout" || pathname.startsWith("/checkout/")) {
    return "checkout";
  }

  if (
    pathname === "/my-bookings" ||
    pathname.startsWith("/booking/cancel/") ||
    pathname === "/profile" ||
    pathname.startsWith("/profile/")
  ) {
    return "player";
  }

  return null;
}

function safeNext(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function allowsRole(area: ProtectedArea, role: UserRole): boolean {
  if (area === "admin") {
    return role === "ADMIN";
  }

  if (area === "owner") {
    return role === "OWNER" || role === "ADMIN";
  }

  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const area = protectedArea(pathname);
  const isLoginRoute = pathname === "/login";
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const claims = await readSessionToken(token);

  if (isLoginRoute) {
    if (!claims) {
      return NextResponse.next();
    }

    const next = safeNext(request.nextUrl.searchParams.get("next"));
    const destination =
      next && allowsRole(protectedArea(next), claims.role) ? next : "/";

    return NextResponse.redirect(new URL(destination, request.url));
  }

  if (!area) {
    return NextResponse.next();
  }

  if (!claims) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);

    if (area !== "player") {
      loginUrl.searchParams.set("reason", area);
    }

    const response = NextResponse.redirect(loginUrl);

    if (token) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }

    return response;
  }

  if (!allowsRole(area, claims.role)) {
    const forbiddenUrl = new URL("/", request.url);
    forbiddenUrl.searchParams.set("auth", "forbidden");
    forbiddenUrl.searchParams.set("area", area);
    return NextResponse.redirect(forbiddenUrl);
  }

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
