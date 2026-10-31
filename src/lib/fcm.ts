import "server-only";

/**
 * Push delivery is disabled in the no-auth testing build. These helpers keep
 * the same return shape as the previous Firebase Cloud Messaging integration so
 * booking, cancellation, and cron routes continue to work without credentials.
 */

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

export interface ReminderRunResult {
  configured: boolean;
  considered: number;
  sent: number;
  failed: number;
  skipped: number;
}

function disabledResult(skipped = 0): PushResult {
  return {
    configured: false,
    sent: 0,
    failed: 0,
    skipped,
    invalidTokens: 0,
  };
}

export function isPushConfigured(): boolean {
  return false;
}

export async function sendPushToTokens(
  tokens: string[],
  _payload: PushPayload,
): Promise<PushResult> {
  const count = new Set(
    tokens.map((token) => token.trim()).filter(Boolean),
  ).size;

  return disabledResult(count);
}

export async function sendPushToUser(
  _userId: string,
  _payload: PushPayload,
): Promise<PushResult> {
  return disabledResult(1);
}

export async function sendBookingConfirmationPush(
  _bookingId: string,
): Promise<PushResult> {
  return disabledResult(1);
}

export async function sendBookingCancellationPush(
  _bookingId: string,
): Promise<PushResult> {
  return disabledResult(1);
}

export async function sendMatchDayReminders(
  _now = new Date(),
): Promise<ReminderRunResult> {
  return {
    configured: false,
    considered: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };
}
