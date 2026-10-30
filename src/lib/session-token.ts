import { SignJWT, jwtVerify } from "jose";
import {
  isUserRole,
  type SessionUser,
  type UserRole,
} from "@/lib/auth-types";

export const SESSION_COOKIE_NAME = "courtconnect_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const SESSION_ISSUER = "courtconnect";
const SESSION_AUDIENCE = "courtconnect-pwa";
const DEVELOPMENT_SECRET =
  "courtconnect-development-session-secret-change-before-production";

export interface SessionClaims {
  id: string;
  uid: string | null;
  name: string;
  phone: string;
  role: UserRole;
}

function sessionSecret(): Uint8Array {
  const configured =
    process.env.AUTH_SECRET?.trim() ?? process.env.NEXTAUTH_SECRET?.trim();

  if (configured && configured.length >= 32) {
    return new TextEncoder().encode(configured);
  }

  // Never throw at runtime: a missing signing secret must not take the whole
  // site offline. Fall back to an insecure default and warn loudly so
  // AUTH_SECRET is rotated before a production deploy.
  console.warn(
    "[session-token] AUTH_SECRET/NEXTAUTH_SECRET is missing or shorter than 32 characters; signing sessions with an insecure default secret. Generate one with: openssl rand -hex 32",
  );

  return new TextEncoder().encode(DEVELOPMENT_SECRET);
}

export async function createSessionToken(
  claims: SessionClaims,
): Promise<string> {
  return new SignJWT({
    uid: claims.uid,
    name: claims.name,
    phone: claims.phone,
    role: claims.role,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.id)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(sessionSecret());
}

export async function readSessionToken(
  token: string | null | undefined,
): Promise<SessionClaims | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, sessionSecret(), {
      algorithms: ["HS256"],
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.phone !== "string" ||
      typeof payload.name !== "string" ||
      !isUserRole(payload.role)
    ) {
      return null;
    }

    return {
      id: payload.sub,
      uid: typeof payload.uid === "string" ? payload.uid : null,
      name: payload.name,
      phone: payload.phone,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export function toSessionUser(claims: SessionClaims): SessionUser {
  return {
    id: claims.id,
    firebaseUid: claims.uid,
    name: claims.name,
    phone: claims.phone,
    role: claims.role,
  };
}
