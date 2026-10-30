"use client";

import {
  deleteToken,
  getMessaging,
  getToken,
  isSupported,
  onMessage,
  type MessagePayload,
  type Messaging,
} from "firebase/messaging";
import {
  FIREBASE_CONFIG,
  getFirebaseApp,
  isFirebaseClientConfigured,
} from "@/lib/firebase-app";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const MESSAGING_SW_PATH = "/firebase-messaging-sw.js";
const MESSAGING_SW_SCOPE = "/firebase-cloud-messaging-push-scope";

export function isClientPushConfigured(): boolean {
  return Boolean(
    isFirebaseClientConfigured() &&
      FIREBASE_CONFIG.messagingSenderId &&
      VAPID_KEY,
  );
}

async function getMessagingIfSupported(): Promise<Messaging | null> {
  if (!isClientPushConfigured() || !("serviceWorker" in navigator)) {
    return null;
  }

  const supported = await isSupported().catch(() => false);

  if (!supported) {
    return null;
  }

  return getMessaging(getFirebaseApp());
}

function messagingServiceWorkerUrl(): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(FIREBASE_CONFIG)) {
    if (typeof value === "string" && value) {
      params.set(key, value);
    }
  }

  return `${MESSAGING_SW_PATH}?${params.toString()}`;
}

async function waitForActivation(
  registration: ServiceWorkerRegistration,
): Promise<void> {
  if (registration.active) {
    return;
  }

  const worker = registration.installing ?? registration.waiting;

  if (!worker) {
    return;
  }

  await new Promise<void>((resolve) => {
    if (worker.state === "activated") {
      resolve();
      return;
    }

    const onChange = () => {
      if (worker.state === "activated" || worker.state === "redundant") {
        worker.removeEventListener("statechange", onChange);
        resolve();
      }
    };

    worker.addEventListener("statechange", onChange);
  });
}

export async function registerWebPush(): Promise<{
  token: string;
  permission: NotificationPermission;
}> {
  if (!isClientPushConfigured()) {
    throw new Error(
      "Push notifications are not configured. Add the Firebase web environment variables first.",
    );
  }

  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    throw new Error("This browser does not support web push notifications.");
  }

  const messaging = await getMessagingIfSupported();

  if (!messaging) {
    throw new Error("Push notifications are not supported on this device.");
  }

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;

  if (permission !== "granted") {
    throw new Error(
      "Notification permission was not granted. Enable notifications in your browser settings.",
    );
  }

  const existingRegistration = await navigator.serviceWorker.getRegistration(
    MESSAGING_SW_SCOPE,
  );
  const registration =
    existingRegistration ??
    (await navigator.serviceWorker.register(messagingServiceWorkerUrl(), {
      scope: MESSAGING_SW_SCOPE,
    }));

  await waitForActivation(registration);

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("Firebase did not return a push token for this device.");
  }

  const response = await fetch("/api/notifications/tokens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      platform: "web",
      userAgent: navigator.userAgent.slice(0, 255),
    }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || "Could not save this device for alerts.");
  }

  return { token, permission };
}

export async function unregisterWebPush(): Promise<void> {
  const messaging = await getMessagingIfSupported();

  if (!messaging) {
    return;
  }

  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration:
      (await navigator.serviceWorker.getRegistration(MESSAGING_SW_SCOPE)) ??
      undefined,
  }).catch(() => null);

  await deleteToken(messaging).catch(() => false);

  if (token) {
    await fetch("/api/notifications/tokens", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    }).catch(() => undefined);
  }
}

export async function subscribeToForegroundPush(
  handler: (payload: MessagePayload) => void,
): Promise<(() => void) | null> {
  const messaging = await getMessagingIfSupported();

  if (!messaging) {
    return null;
  }

  return onMessage(messaging, handler);
}
