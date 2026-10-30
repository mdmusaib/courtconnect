import type { SessionUser, UserRole } from "@/lib/auth-types";

/**
 * CourtConnect demo phone authentication.
 *
 * This module is intentionally a mock: no SMS is sent and every number uses the
 * shared test OTP below. It exists so the full booking, owner, and admin flows
 * can be exercised without Firebase credentials. Replace this module with a
 * real phone-verification provider before accepting production traffic.
 */

export const MOCK_OTP = "1234";
export const MOCK_OTP_LENGTH = MOCK_OTP.length;
export const MOCK_OTP_TTL_SECONDS = 5 * 60;

const MOCK_TOKEN_PREFIX = "ccmock";
const MOCK_TOKEN_VERSION = 1;
const MOCK_TOKEN_TTL_MS = 10 * 60 * 1000;

export type MockAccountKey = "owner" | "player" | "admin";

export interface MockAccount {
  key: MockAccountKey;
  label: string;
  name: string;
  phone: string;
  e164: string;
  role: UserRole;
}

export const DEMO_ACCOUNTS: Record<MockAccountKey, MockAccount> = {
  owner: {
    key: "owner",
    label: "Turf owner",
    name: "Test Owner",
    phone: "9876543210",
    e164: "+919876543210",
    role: "OWNER",
  },
  player: {
    key: "player",
    label: "Player",
    name: "Arjun Kumar",
    phone: "9876543211",
    e164: "+919876543211",
    role: "PLAYER",
  },
  admin: {
    key: "admin",
    label: "Admin",
    name: "Platform Admin",
    phone: "9876543212",
    e164: "+919876543212",
    role: "ADMIN",
  },
};

export const DEMO_ACCOUNT_LIST = Object.values(DEMO_ACCOUNTS);

export const OWNER_TEST_PHONE = DEMO_ACCOUNTS.owner.phone;
export const PLAYER_TEST_PHONE = DEMO_ACCOUNTS.player.phone;
export const ADMIN_TEST_PHONE = DEMO_ACCOUNTS.admin.phone;

export type MockAuthErrorCode =
  | "INVALID_PHONE"
  | "INVALID_OTP"
  | "NETWORK_ERROR"
  | "SESSION_SYNC_FAILED";

export class MockAuthError extends Error {
  code: MockAuthErrorCode;

  constructor(message: string, code: MockAuthErrorCode) {
    super(message);
    this.name = "MockAuthError";
    this.code = code;
  }
}

/**
 * The demo accepts any 10-digit mobile number. Numbers may be supplied with a
 * +91 country code or a leading zero and are canonicalised to 10 digits, which
 * is how the database stores phone numbers.
 */
export function normalizeMockPhone(input: unknown): string | null {
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

export function mockPhoneE164(phone: string): string | null {
  const normalized = normalizeMockPhone(phone);
  return normalized ? `+91${normalized}` : null;
}

export function roleForMockPhone(phone: unknown): UserRole {
  const normalized = normalizeMockPhone(phone);

  if (normalized === DEMO_ACCOUNTS.owner.phone) {
    return "OWNER";
  }

  if (normalized === DEMO_ACCOUNTS.admin.phone) {
    return "ADMIN";
  }

  return "PLAYER";
}

export function mockFallbackName(phone: unknown): string {
  const normalized = normalizeMockPhone(phone);

  if (!normalized) {
    return "CourtConnect Player";
  }

  const account = DEMO_ACCOUNT_LIST.find(
    (candidate) => candidate.phone === normalized,
  );

  return account?.name ?? `Player ${normalized.slice(-4)}`;
}

export function isMockOtp(code: string): boolean {
  return code.replace(/\D/g, "") === MOCK_OTP;
}

export function assertMockOtp(phone: unknown, code: string): string {
  const normalized = normalizeMockPhone(phone);

  if (!normalized) {
    throw new MockAuthError(
      "Enter any 10-digit mobile number to continue.",
      "INVALID_PHONE",
    );
  }

  if (!isMockOtp(code)) {
    throw new MockAuthError(
      `That code is incorrect. Use the demo OTP ${MOCK_OTP}.`,
      "INVALID_OTP",
    );
  }

  return normalized;
}

export interface MockSessionTokenPayload {
  version: typeof MOCK_TOKEN_VERSION;
  phone: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

export function createMockSessionToken(phone: string): string {
  const normalized = normalizeMockPhone(phone);

  if (!normalized) {
    throw new MockAuthError(
      "Enter any 10-digit mobile number to continue.",
      "INVALID_PHONE",
    );
  }

  const issuedAt = Date.now();
  const payload: MockSessionTokenPayload = {
    version: MOCK_TOKEN_VERSION,
    phone: normalized,
    issuedAt,
    expiresAt: issuedAt + MOCK_TOKEN_TTL_MS,
    nonce: randomId(),
  };

  return `${MOCK_TOKEN_PREFIX}.${encodeBase64Url(JSON.stringify(payload))}`;
}

export function readMockSessionToken(
  token: unknown,
): MockSessionTokenPayload | null {
  if (typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");

  if (parts.length !== 2 || parts[0] !== MOCK_TOKEN_PREFIX) {
    return null;
  }

  const decoded = decodeBase64Url(parts[1]);

  if (!decoded) {
    return null;
  }

  let value: unknown;

  try {
    value = JSON.parse(decoded);
  } catch {
    return null;
  }

  if (typeof value !== "object" || value === null) {
    return null;
  }

  const payload = value as Partial<MockSessionTokenPayload>;
  const now = Date.now();

  if (
    payload.version !== MOCK_TOKEN_VERSION ||
    typeof payload.phone !== "string" ||
    normalizeMockPhone(payload.phone) !== payload.phone ||
    typeof payload.issuedAt !== "number" ||
    typeof payload.expiresAt !== "number" ||
    typeof payload.nonce !== "string" ||
    payload.nonce.length < 8 ||
    !Number.isFinite(payload.issuedAt) ||
    !Number.isFinite(payload.expiresAt) ||
    payload.issuedAt > now + 60_000 ||
    payload.expiresAt <= now ||
    payload.expiresAt - payload.issuedAt > MOCK_TOKEN_TTL_MS
  ) {
    return null;
  }

  return payload as MockSessionTokenPayload;
}

export interface MockOtpReceipt {
  phone: string;
  otp: string;
  expiresInSeconds: number;
}

/**
 * Simulates sending an OTP. In this demo the code is returned to the UI so it
 * can be shown on screen; a real provider would only ever return a challenge.
 */
export async function requestMockOtp(phone: string): Promise<MockOtpReceipt> {
  const normalized = normalizeMockPhone(phone);

  if (!normalized) {
    throw new MockAuthError(
      "Enter any 10-digit mobile number to continue.",
      "INVALID_PHONE",
    );
  }

  await delay(350);

  return {
    phone: normalized,
    otp: MOCK_OTP,
    expiresInSeconds: MOCK_OTP_TTL_SECONDS,
  };
}

/**
 * Verifies the test OTP, creates a short-lived mock token, and exchanges both
 * for the signed HTTP-only session cookie set by POST /api/auth/sync.
 */
export async function signInWithMockOtp(
  phone: string,
  code: string,
): Promise<SessionUser> {
  const normalized = assertMockOtp(phone, code);
  const mockToken = createMockSessionToken(normalized);

  let response: Response;

  try {
    response = await fetch("/api/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalized, mockToken }),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new MockAuthError(
      "Could not reach CourtConnect. Check your connection and retry.",
      "NETWORK_ERROR",
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    user?: SessionUser;
    error?: string;
    code?: MockAuthErrorCode;
  };

  if (!response.ok || !payload.user) {
    throw new MockAuthError(
      payload.error ?? "Could not create your CourtConnect session.",
      payload.code ?? "SESSION_SYNC_FAILED",
    );
  }

  return payload.user;
}

export async function signOutMockClient(): Promise<void> {
  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => undefined);
}

function randomId(): string {
  const cryptoApi = globalThis.crypto;

  if (cryptoApi && typeof cryptoApi.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }

  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function encodeBase64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeBase64Url(value: string): string | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) =>
      character.charCodeAt(0),
    );

    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
