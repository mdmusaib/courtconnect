import { BookingStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { releaseSlotLock } from "@/lib/slot-lock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;
const LOCK_RELEASE_TIMEOUT_MS = 1_500;

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, code }, { status });
}

function releaseLockSafely(
  courtId: string,
  slotStart: Date,
  userId: string,
): Promise<boolean> {
  return Promise.race([
    releaseSlotLock(courtId, slotStart, userId).catch(() => false),
    new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), LOCK_RELEASE_TIMEOUT_MS);
    }),
  ]);
}

/**
 * Release every hourly slot lock for the given booking timeframe.
 * A multi-hour booking acquires one lock per hour, so we mirror
 * that granularity when releasing on early navigation.
 */
async function releaseBookingLocks(
  courtId: string,
  slotStart: Date,
  slotEnd: Date | null,
  userId: string,
): Promise<number> {
  const slotStarts: Date[] = [];

  if (slotEnd) {
    for (
      let cursor = new Date(slotStart);
      cursor < slotEnd;
      cursor = new Date(cursor.getTime() + HOUR_MS)
    ) {
      slotStarts.push(cursor);
    }
  } else {
    slotStarts.push(slotStart);
  }

  const results = await Promise.allSettled(
    slotStarts.map((slot) => releaseLockSafely(courtId, slot, userId)),
  );

  return results.filter(
    (result) => result.status === "fulfilled" && result.value,
  ).length;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400, "INVALID_JSON");
  }

  const payload = (body ?? {}) as {
    courtId?: unknown;
    slotStart?: unknown;
    slotEnd?: unknown;
    userId?: unknown;
  };

  const courtId =
    typeof payload.courtId === "string" ? payload.courtId.trim() : "";
  const slotStartValue =
    typeof payload.slotStart === "string" ? payload.slotStart : "";
  const slotEndValue =
    typeof payload.slotEnd === "string" ? payload.slotEnd : "";
  const userId =
    typeof payload.userId === "string" ? payload.userId.trim() : "";

  if (!courtId) {
    return jsonError("courtId is required.", 400, "MISSING_COURT_ID");
  }

  if (!slotStartValue) {
    return jsonError("slotStart is required.", 400, "MISSING_SLOT_START");
  }

  if (!userId) {
    return jsonError("userId is required.", 400, "MISSING_USER_ID");
  }

  const slotStart = new Date(slotStartValue);

  if (Number.isNaN(slotStart.getTime())) {
    return jsonError("slotStart must be a valid ISO date.", 400, "INVALID_SLOT");
  }

  const slotEnd = slotEndValue ? new Date(slotEndValue) : null;

  if (slotEnd && Number.isNaN(slotEnd.getTime())) {
    return jsonError("slotEnd must be a valid ISO date.", 400, "INVALID_SLOT");
  }

  if (slotEnd && slotEnd.getTime() <= slotStart.getTime()) {
    return jsonError(
      "slotEnd must be later than slotStart.",
      400,
      "INVALID_SLOT_RANGE",
    );
  }

  // Release the Redis slot lock(s) immediately via the atomic Lua script
  const locksReleased = await releaseBookingLocks(
    courtId,
    slotStart,
    slotEnd,
    userId,
  );

  // Update the booking status from PENDING to EXPIRED.
  // When the player explicitly abandons checkout, the held slot is no
  // longer valid, so we mark the pending booking as expired instantly
  // rather than waiting for the Redis TTL + background cleanup.
  try {
    const result = await prisma.booking.updateMany({
      where: {
        courtId,
        slotStart,
        status: BookingStatus.PENDING,
      },
      data: {
        status: BookingStatus.EXPIRED,
      },
    });

    return NextResponse.json({
      success: true,
      locksReleased,
      bookingUpdated: result.count > 0,
    });
  } catch (error) {
    console.error("Failed to update booking status:", error);
    // Even if the DB update fails, the lock was released.
    return NextResponse.json({
      success: locksReleased > 0,
      locksReleased,
      bookingUpdated: false,
      error: "Slot lock released but failed to update booking status.",
    });
  }
}