"use client";

import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signOut as firebaseSignOut,
  type Auth,
  type ConfirmationResult,
} from "firebase/auth";
import type { SessionUser } from "@/lib/auth-types";
import { normalizePhoneNumber, toE164India } from "@/lib/auth-phone";
import { getFirebaseApp, isFirebaseClientConfigured } from "@/lib/firebase-app";

let cachedAuth: Auth | null = null;

export class FirebaseAuthError extends Error {
  code: string;

  constructor(message: string, code = "PHONE_AUTH_FAILED") {
    super(message);
    this.name = "FirebaseAuthError";
    this.code = code;
  }
}

export function isPhoneAuthConfigured(): boolean {
  return isFirebaseClientConfigured();
}

function getFirebaseAuth(): Auth {
  if (!isPhoneAuthConfigured()) {
    throw new FirebaseAuthError(
      "Phone sign-in is not configured for this build. Add the Firebase web environment variables.",
      "AUTH_NOT_CONFIGURED",
    );
  }

  if (!cachedAuth) {
    cachedAuth = getAuth(getFirebaseApp());
    cachedAuth.useDeviceLanguage();
  }

  return cachedAuth;
}

export function createRecaptchaVerifier(
  container: string | HTMLElement,
): RecaptchaVerifier {
  return new RecaptchaVerifier(getFirebaseAuth(), container, {
    size: "invisible",
    "expired-callback": () => {
      // The modal creates a fresh verifier before every send, so an expired
      // token can never silently block the next attempt.
    },
  });
}

export async function sendPhoneOtp(
  phone: string,
  verifier: RecaptchaVerifier,
): Promise<ConfirmationResult> {
  const normalized = normalizePhoneNumber(phone);

  if (!normalized) {
    throw new FirebaseAuthError(
      "Enter a valid 10-digit Indian mobile number.",
      "INVALID_PHONE",
    );
  }

  const e164 = toE164India(normalized);

  if (!e164) {
    throw new FirebaseAuthError(
      "Enter a valid 10-digit Indian mobile number.",
      "INVALID_PHONE",
    );
  }

  try {
    return await signInWithPhoneNumber(getFirebaseAuth(), e164, verifier);
  } catch (error) {
    throw new FirebaseAuthError(
      firebaseAuthMessage(error),
      firebaseAuthCode(error),
    );
  }
}

export async function confirmPhoneOtp(
  confirmation: ConfirmationResult,
  code: string,
  name?: string,
): Promise<SessionUser> {
  const normalizedCode = code.replace(/\D/g, "");

  if (normalizedCode.length !== 6) {
    throw new FirebaseAuthError(
      "Enter the 6-digit verification code sent to your phone.",
      "INVALID_CODE",
    );
  }

  let credential;

  try {
    credential = await confirmation.confirm(normalizedCode);
  } catch (error) {
    throw new FirebaseAuthError(
      firebaseAuthMessage(error),
      firebaseAuthCode(error),
    );
  }

  const idToken = await credential.user.getIdToken(true);
  return syncFirebaseSession(idToken, name);
}

export async function syncFirebaseSession(
  idToken: string,
  name?: string,
): Promise<SessionUser> {
  let response: Response;

  try {
    response = await fetch("/api/auth/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, name }),
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new FirebaseAuthError(
      "Could not reach CourtConnect. Check your connection and retry.",
      "NETWORK_ERROR",
    );
  }

  const payload = (await response.json().catch(() => ({}))) as {
    user?: SessionUser;
    error?: string;
    code?: string;
  };

  if (!response.ok || !payload.user) {
    throw new FirebaseAuthError(
      payload.error ?? "Could not create your CourtConnect session.",
      payload.code ?? "SESSION_SYNC_FAILED",
    );
  }

  return payload.user;
}

export async function signOutFirebaseClient(): Promise<void> {
  try {
    if (isPhoneAuthConfigured()) {
      await firebaseSignOut(getFirebaseAuth());
    }
  } catch {
    // The server cookie is the source of truth; always clear it even when the
    // Firebase SDK cannot reach the network.
  }

  await fetch("/api/auth/session", {
    method: "DELETE",
    credentials: "same-origin",
    cache: "no-store",
  }).catch(() => undefined);
}

function firebaseAuthCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code?: unknown }).code === "string"
  ) {
    return (error as { code: string }).code;
  }

  return "PHONE_AUTH_FAILED";
}

export function firebaseAuthMessage(error: unknown): string {
  const code = firebaseAuthCode(error);

  switch (code) {
    case "auth/invalid-phone-number":
      return "That phone number looks invalid. Check the 10-digit number and try again.";
    case "auth/too-many-requests":
      return "Too many attempts from this device. Wait a few minutes before trying again.";
    case "auth/quota-exceeded":
      return "The SMS quota for this project has been reached. Try again later.";
    case "auth/invalid-verification-code":
      return "That code is incorrect. Check the SMS and try again.";
    case "auth/code-expired":
      return "That verification code has expired. Request a new code.";
    case "auth/captcha-check-failed":
    case "auth/invalid-app-credential":
      return "The security check failed. Refresh the page and try again.";
    case "auth/operation-not-allowed":
    case "auth/billing-not-enabled":
      return "Phone authentication is not enabled for this Firebase project.";
    case "auth/network-request-failed":
      return "Network error while contacting Firebase. Check your connection and retry.";
    case "auth/unauthorized-domain":
      return "This domain is not authorised in Firebase Authentication settings.";
    default:
      return error instanceof Error && error.message
        ? error.message
        : "Phone verification failed. Please try again.";
  }
}
