import "server-only";

import {
  getMessaging,
  type Messaging,
  type MulticastMessage,
} from "firebase-admin/messaging";
import { BookingStatus } from "@prisma/client";
import { getFirebaseAdminApp } from "@/lib/firebase-admin";
import {
  formatDateKey,
  formatDateKeyLong,
  formatINR,
  formatSlotRange,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";

const MAX_MULTICAST_TOKENS = 500;

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  data?: Record<string, string | number | boolean | null | undefined>;
}

export interface PushResult {
  configured: boolean;
  sent: number;
  failed: number;
  skipped: number;
  invalidTokens: number;
}

let cachedMessaging: Messaging | null | undefined;

export function isPushConfigured(): boolean {
  return Boolean(getFirebaseAdminApp());
}

function getMessagingClient(): Messaging | null {
  if (cachedMessaging !== undefined) {
    return cachedMessaging;
  }

  const app = getFirebaseAdminApp();

  if (!app) {
    cachedMessaging = null;
    return null;
  }

  try {
    cachedMessaging = getMessaging(app);
    return cachedMessaging;
  } catch (error) {
    console.error("Firebase Messaging initialization failed:", error);
    cachedMessaging = null;
    return null;
  }
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.APP_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

function absoluteUrl(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `${appBaseUrl()}${url.startsWith("/") ? "" : "/"}${url}`;
}

function serializeData(
  data: PushPayload["data"],
): Record<string, string> | undefined {
  if (!data) {
    return undefined;
  }

  const serialized: Record<string, string> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      continue;
    }

    serialized[key] = String(value);
  }

  return Object.keys(serialized).length > 0 ? serialized : undefined;
}

function isInvalidTokenError(error: unknown): boolean {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code?: unknown }).code)
      : "";

  return (
    code.includes("registration-token-not-registered") ||
    code.includes("invalid-registration-token") ||
    code.includes("invalid-argument")
  );
}

export async function sendPushToTokens(
  tokens: string[],
  payload: PushPayload,
): Promise<PushResult> {
  const uniqueTokens = Array.from(
    new Set(tokens.map((token) => token.trim()).filter(Boolean)),
  );

  if (uniqueTokens.length === 0) {
    return {
      configured: isPushConfigured(),
      sent: 0,
      failed: 0,
      skipped: 0,
      invalidTokens: 0,
    };
  }

  const messaging = getMessagingClient();

  if (!messaging) {
    return {
      configured: false,
      sent: 0,
      failed: 0,
      skipped: uniqueTokens.length,
      invalidTokens: 0,
    };
  }

  const link = absoluteUrl(payload.url);
  const data = serializeData(payload.data);
  const invalidTokens: string[] = [];
  let sent = 0;
  let failed = 0;

  for (let start = 0; start < uniqueTokens.length; start += MAX_MULTICAST_TOKENS) {
    const chunk = uniqueTokens.slice(start, start + MAX_MULTICAST_TOKENS);
    const message: MulticastMessage = {
      tokens: chunk,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data,
      webpush: {
        notification: {
          title: payload.title,
          body: payload.body,
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          tag: payload.tag ?? "courtconnect",
        },
        fcmOptions: link ? { link } : undefined,
      },
    };

    try {
      const response = await messaging.sendEachForMulticast(message);
      sent += response.successCount;
      failed += response.failureCount;

      response.responses.forEach((result, index) => {
        if (!result.success && isInvalidTokenError(result.error)) {
          invalidTokens.push(chunk[index]);
        }
      });
    } catch (error) {
      console.error("FCM multicast send failed:", error);
      failed += chunk.length;
    }
  }

  if (invalidTokens.length > 0) {
    try {
      await prisma.pushToken.deleteMany({
        where: { token: { in: invalidTokens } },
      });
    } catch (error) {
      console.error("Failed to prune stale FCM tokens:", error);
    }
  }

  return {
    configured: true,
    sent,
    failed,
    skipped: 0,
    invalidTokens: invalidTokens.length,
  };
}

export async function sendPushToUser(
  userId: string,
  payload: PushPayload,
): Promise<PushResult> {
  const tokens = await prisma.pushToken.findMany({
    where: { userId },
    select: { token: true },
  });

  return sendPushToTokens(
    tokens.map((row) => row.token),
    payload,
  );
}

export async function sendBookingConfirmationPush(
  bookingId: string,
): Promise<PushResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      status: true,
      slotStart: true,
      slotEnd: true,
      confirmationSentAt: true,
      court: {
        select: {
          name: true,
          venue: {
            select: { name: true },
          },
        },
      },
    },
  });

  const skippedResult: PushResult = {
    configured: isPushConfigured(),
    sent: 0,
    failed: 0,
    skipped: 1,
    invalidTokens: 0,
  };

  if (
    !booking ||
    booking.userId === null ||
    booking.status !== BookingStatus.CONFIRMED ||
    booking.confirmationSentAt
  ) {
    return skippedResult;
  }

  const result = await sendPushToUser(booking.userId, {
    title: "Booking confirmed ⚡",
    body: `${booking.court.venue.name} · ${formatDateKeyLong(formatDateKey(booking.slotStart))} · ${formatSlotRange(booking.slotStart, booking.slotEnd)}. Your pass is ready.`,
    url: `/booking/success/${booking.id}`,
    tag: `booking-${booking.id}`,
    data: {
      type: "BOOKING_CONFIRMED",
      bookingId: booking.id,
    },
  });

  if (result.sent > 0) {
    await prisma.booking
      .update({
        where: { id: booking.id },
        data: { confirmationSentAt: new Date() },
      })
      .catch((error) => {
        console.error("Failed to mark confirmation push as sent:", error);
      });
  }

  return result;
}

export async function sendBookingCancellationPush(
  bookingId: string,
): Promise<PushResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      refundAmount: true,
      court: {
        select: {
          name: true,
          venue: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!booking || booking.userId === null) {
    return {
      configured: isPushConfigured(),
      sent: 0,
      failed: 0,
      skipped: 1,
      invalidTokens: 0,
    };
  }

  return sendPushToUser(booking.userId, {
    title: "Booking cancelled",
    body:
      booking.refundAmount > 0
        ? `${booking.court.venue.name} · ${formatINR(booking.refundAmount)} refund queued to your original payment method.`
        : `${booking.court.venue.name} · Your slot has been released. No refund is due.`,
    url: "/my-bookings",
    tag: `booking-${booking.id}`,
    data: {
      type: "BOOKING_CANCELLED",
      bookingId: booking.id,
    },
  });
}

export interface ReminderRunResult {
  configured: boolean;
  considered: number;
  sent: number;
  failed: number;
  skipped: number;
}

export async function sendMatchDayReminders(
  now = new Date(),
): Promise<ReminderRunResult> {
  if (!isPushConfigured()) {
    return {
      configured: false,
      considered: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };
  }

  const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const bookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.CONFIRMED,
      userId: { not: null },
      reminderSentAt: null,
      slotStart: { gte: now, lte: windowEnd },
    },
    select: {
      id: true,
      userId: true,
      slotStart: true,
      slotEnd: true,
      court: {
        select: {
          name: true,
          venue: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { slotStart: "asc" },
    take: 200,
  });

  let sent = 0;
  let failed = 0;
  let skipped = 0;
  const remindedBookingIds: string[] = [];

  for (const booking of bookings) {
    if (!booking.userId) {
      skipped += 1;
      continue;
    }

    const result = await sendPushToUser(booking.userId, {
      title: "Match day reminder ⚽",
      body: `${booking.court.name} at ${booking.court.venue.name} · ${formatDateKeyLong(formatDateKey(booking.slotStart))} · ${formatSlotRange(booking.slotStart, booking.slotEnd)}. Carry your digital pass.`,
      url: `/booking/success/${booking.id}`,
      tag: `reminder-${booking.id}`,
      data: {
        type: "MATCH_DAY_REMINDER",
        bookingId: booking.id,
      },
    });

    sent += result.sent;
    failed += result.failed;
    skipped += result.skipped;

    if (result.sent > 0) {
      remindedBookingIds.push(booking.id);
    }
  }

  if (remindedBookingIds.length > 0) {
    await prisma.booking
      .updateMany({
        where: { id: { in: remindedBookingIds } },
        data: { reminderSentAt: new Date() },
      })
      .catch((error) => {
        console.error("Failed to mark match-day reminders as sent:", error);
      });
  }

  return {
    configured: true,
    considered: bookings.length,
    sent,
    failed,
    skipped,
  };
}
