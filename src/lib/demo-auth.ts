import type { SessionUser, UserRole } from "@/lib/auth-types";

/**
 * CourtConnect development auth.
 *
 * There is no OTP, SMS, or third-party identity provider in this build. A role
 * selection writes an HTTP-only `courtconnect_session` JWT cookie through
 * POST /api/auth/sync so every player, owner, and admin workflow can be
 * exercised without a login wall.
 *
 * The IDs match prisma/seed.ts so the seeded bookings, venues, and disputes
 * belong to the selected demo identity.
 */

export type DemoRole = UserRole;

export interface DemoAccount {
  role: DemoRole;
  label: string;
  name: string;
  phone: string;
  id: string;
  description: string;
  destination: string;
}

export const DEMO_ACCOUNTS: Record<DemoRole, DemoAccount> = {
  PLAYER: {
    role: "PLAYER",
    label: "Player",
    name: "Arjun Kumar",
    phone: "9876543211",
    id: "6f1c2a10-0000-4000-8000-000000000002",
    description: "Discover venues, book slots, pay by UPI, and open passes.",
    destination: "/",
  },
  OWNER: {
    role: "OWNER",
    label: "Owner",
    name: "Test Owner",
    phone: "9876543210",
    id: "6f1c2a10-0000-4000-8000-000000000001",
    description: "Open the owner console, calendar, and quick-entry desk.",
    destination: "/owner",
  },
  ADMIN: {
    role: "ADMIN",
    label: "Admin",
    name: "Platform Admin",
    phone: "9876543212",
    id: "6f1c2a10-0000-4000-8000-000000000003",
    description: "Verify venues, audit revenue, and resolve disputes.",
    destination: "/admin",
  },
};

export const DEMO_ACCOUNT_LIST = Object.values(DEMO_ACCOUNTS);

export function isDemoRole(value: unknown): value is DemoRole {
  return value === "PLAYER" || value === "OWNER" || value === "ADMIN";
}

export function demoUserForRole(role: DemoRole): SessionUser {
  const account = DEMO_ACCOUNTS[role];

  return {
    id: account.id,
    firebaseUid: null,
    name: account.name,
    phone: account.phone,
    role: account.role,
  };
}

export function demoRoleForKey(value: unknown): DemoRole | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  return isDemoRole(normalized) ? normalized : null;
}

export function normalizeDemoPhone(input: unknown): string | null {
  if (typeof input !== "string") {
    return null;
  }

  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  let digits = trimmed.replace(/\D/g, "");

  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  return /^\d{10}$/.test(digits) ? digits : null;
}

export function roleForDemoPhone(phone: unknown): DemoRole | null {
  const normalized = normalizeDemoPhone(phone);

  if (!normalized) {
    return null;
  }

  return (
    DEMO_ACCOUNT_LIST.find((account) => account.phone === normalized)?.role ??
    null
  );
}

export class DemoAuthError extends Error {
  code: string;

  constructor(message: string, code = "DEMO_SESSION_FAILED") {
    super(message);
    this.name = "DemoAuthError";
    this.code = code;
  }
}

interface SyncResponse {
  user?: SessionUser;
  error?: string;
  code?: string;
}

/**
 * Switches this browser to the selected demo role. The server returns the
 * DB-backed user id (or the deterministic seed id when the database is
 * unavailable) and sets the signed session cookie.
 */
export async function switchDemoRole(role: DemoRole): Promise<SessionUser> {
  let response: Response;

  try {
    response = await fetch("/api/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new DemoAuthError(
      "Could not reach CourtConnect. Check your connection and retry.",
      "NETWORK_ERROR",
    );
  }

  const payload = (await response.json().catch(() => ({}))) as SyncResponse;

  if (!response.ok || !payload.user) {
    throw new DemoAuthError(
      payload.error ?? "Could not create the demo session.",
      payload.code ?? "DEMO_SESSION_FAILED",
    );
  }

  return payload.user;
}

export async function signOutDemoClient(): Promise<void> {
  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => undefined);
}
