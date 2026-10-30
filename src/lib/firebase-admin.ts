import "server-only";

import {
  applicationDefault,
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";

type ServiceAccount = Parameters<typeof cert>[0];

let cachedApp: App | null | undefined;
let cachedAuth: Auth | null | undefined;

function parseJsonServiceAccount(raw: string): ServiceAccount | null {
  const trimmed = raw.trim();

  if (!trimmed) {
    return null;
  }

  const candidates = [trimmed];

  try {
    candidates.push(Buffer.from(trimmed, "base64").toString("utf8"));
  } catch {
    // Not base64; the raw JSON candidate is still tried below.
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as ServiceAccount;

      if (
        parsed &&
        typeof parsed === "object" &&
        "project_id" in parsed &&
        "client_email" in parsed &&
        "private_key" in parsed
      ) {
        return parsed;
      }
    } catch {
      // Try the next representation.
    }
  }

  return null;
}

function splitCredentials(): ServiceAccount | null {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKey.replace(/\\n/g, "\n"),
  } as ServiceAccount;
}

/**
 * Single Firebase Admin app for Auth, FCM, and any future server-side
 * Firebase service. Supports a JSON service account, base64 JSON, or the
 * discrete FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY
 * environment variables used by Cloud Run.
 */
export function getFirebaseAdminApp(): App | null {
  if (cachedApp !== undefined) {
    return cachedApp;
  }

  const existing = getApps()[0];

  if (existing) {
    cachedApp = existing;
    return cachedApp;
  }

  const rawServiceAccount =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.FIREBASE_SERVICE_ACCOUNT_BASE64?.trim();
  const serviceAccount = rawServiceAccount
    ? parseJsonServiceAccount(rawServiceAccount)
    : splitCredentials();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();

  try {
    if (serviceAccount) {
      const serviceAccountProjectId = (
        serviceAccount as ServiceAccount & { project_id?: string }
      ).project_id;

      cachedApp = initializeApp({
        credential: cert(serviceAccount),
        projectId: projectId ?? serviceAccountProjectId,
      });
      return cachedApp;
    }

    const canUseApplicationDefault =
      Boolean(process.env.GOOGLE_APPLICATION_CREDENTIALS) ||
      Boolean(process.env.K_SERVICE);

    if (canUseApplicationDefault) {
      cachedApp = initializeApp({
        credential: applicationDefault(),
        projectId,
      });
      return cachedApp;
    }
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
    cachedApp = null;
    return null;
  }

  cachedApp = null;
  return cachedApp;
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(getFirebaseAdminApp());
}

export function getFirebaseAuth(): Auth | null {
  if (cachedAuth !== undefined) {
    return cachedAuth;
  }

  const app = getFirebaseAdminApp();

  if (!app) {
    cachedAuth = null;
    return null;
  }

  try {
    cachedAuth = getAuth(app);
    return cachedAuth;
  } catch (error) {
    console.error("Firebase Auth initialization failed:", error);
    cachedAuth = null;
    return null;
  }
}
