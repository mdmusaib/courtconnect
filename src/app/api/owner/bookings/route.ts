import { BookingStatus, PaymentMode } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  PENDING_HOLD_MS,
  SLOT_END_HOUR,
  SLOT_START_HOUR,
} from "@/lib/booking-data";
import { requireApiUser } from "@/lib/api-auth";
import { addDaysToDateKey, formatDateKey } from "@/lib/format";
import {
  OWNER_ENTRY_FUTURE_DAYS,
  OWNER_ENTRY_MAX_HOURS,
  OWNER_ENTRY_PAST_DAYS,
} from "@/lib/owner-constants";
import { prisma } from "@/lib/prisma";
import { calculateBookingPrice } from "@/lib/pricing";
import { acquireSlotLock, releaseSlotLock } from "@/lib/slot-lock";
import type { OwnerEntryType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;

const ENTRY_TYPES: Record<
  OwnerEntryType,
  { paymentMode: PaymentMode; collectNow: boolean }
> = {
  WALK_IN: { paymentMode: PaymentMode.OFFLINE_CASH, collectNow: true },
  PHONE: { paymentMode: PaymentMode.PHONE_BOOKING, collectNow: false },
  GROUND_QR: { paymentMode: PaymentMode.MANUAL_EXTERNAL, collectNow: true },
};

const OWNER_ENTRY_TYPE_VALUES = new Set<OwnerEntryType>([
  "WALK_IN",
  "PHONE",
  "GROUND_QR",
]);

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, code }, { status });
}

function getIstHourAndMinute(date: Date): { hour: number; minute: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const valueFor = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return {
    hour: valueFor("hour"),
    minute: valueFor("minute"),
  };
}

async function releaseQuietly(
  courtId: string,
  slotStart: Date,
  userId: string,
) {
  try {
    await releaseSlotLock(courtId, slotStart, userId);
  } catch (error) {
    console.error("Failed to release owner slot lock:", error);
  }
}

async function releaseSlotLocks(
  courtId: string,
  slotStarts: Date[],
  userId: string,
) {
  await Promise.all(
    slotStarts.map((slotStart) => releaseQuietly(courtId, slotStart, userId)),
  );
}

export async function POST(request: Request) {
  const auth = await requireApiUser(["OWNER", "ADMIN"]);

  if (!auth.user) {
    return auth.response;
  }

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
    entryType?: unknown;
    customerName?: unknown;
  };
  const courtId =
    typeof payload.courtId === "string" ? payload.courtId.trim() : "";
  const slotStartValue =
    typeof payload.slotStart === "string" ? payload.slotStart : "";
  const slotEndValue =
    typeof payload.slotEnd === "string" ? payload.slotEnd : "";
  const entryTypeValue =
    typeof payload.entryType === "string" ? payload.entryType : "";
  const customerName =
    typeof payload.customerName === "string"
      ? payload.customerName.trim().slice(0, 120)
      : "";

  if (!courtId) {
    return jsonError("courtId is required.", 400, "MISSING_COURT_ID");
  }

  if (!OWNER_ENTRY_TYPE_VALUES.has(entryTypeValue as OwnerEntryType)) {
    return jsonError(
      "entryType must be WALK_IN, PHONE, or GROUND_QR.",
      400,
      "INVALID_ENTRY_TYPE",
    );
  }

  const entryType = entryTypeValue as OwnerEntryType;
  const entryConfig = ENTRY_TYPES[entryType];
  const slotStart = new Date(slotStartValue);

  if (Number.isNaN(slotStart.getTime())) {
    return jsonError("slotStart must be a valid ISO date.", 400, "INVALID_SLOT");
  }

  const slotEnd = slotEndValue
    ? new Date(slotEndValue)
    : new Date(slotStart.getTime() + HOUR_MS);

  if (Number.isNaN(slotEnd.getTime())) {
    return jsonError("slotEnd must be a valid ISO date.", 400, "INVALID_SLOT");
  }

  if (slotEnd.getTime() <= slotStart.getTime()) {
    return jsonError(
      "slotEnd must be later than slotStart.",
      400,
      "INVALID_SLOT_RANGE",
    );
  }

  const durationMs = slotEnd.getTime() - slotStart.getTime();
  const durationHours = durationMs / HOUR_MS;
  const startTime = getIstHourAndMinute(slotStart);
  const endTime = getIstHourAndMinute(slotEnd);
  const slotDateKey = formatDateKey(slotStart);

  if (
    durationMs % HOUR_MS !== 0 ||
    startTime.minute !== 0 ||
    endTime.minute !== 0
  ) {
    return jsonError(
      "Entries must align to full one-hour blocks.",
      400,
      "INVALID_SLOT_INCREMENT",
    );
  }

  if (
    startTime.hour < SLOT_START_HOUR ||
    startTime.hour >= SLOT_END_HOUR ||
    endTime.hour < SLOT_START_HOUR ||
    endTime.hour > SLOT_END_HOUR ||
    durationHours < 1 ||
    durationHours > OWNER_ENTRY_MAX_HOURS
  ) {
    return jsonError(
      `Entries must fit between ${SLOT_START_HOUR}:00 AM and ${SLOT_END_HOUR}:00 (max ${OWNER_ENTRY_MAX_HOURS} hours).`,
      400,
      "INVALID_SLOT_TIME",
    );
  }

  if (formatDateKey(slotEnd) !== slotDateKey) {
    return jsonError(
      "An entry cannot cross midnight.",
      400,
      "INVALID_SLOT_RANGE",
    );
  }

  const todayKey = formatDateKey(new Date());
  const minDateKey = addDaysToDateKey(todayKey, -OWNER_ENTRY_PAST_DAYS);
  const maxDateKey = addDaysToDateKey(todayKey, OWNER_ENTRY_FUTURE_DAYS);

  if (slotDateKey < minDateKey || slotDateKey > maxDateKey) {
    return jsonError(
      `Quick entry is limited to ${OWNER_ENTRY_PAST_DAYS} days back and ${OWNER_ENTRY_FUTURE_DAYS} days ahead.`,
      400,
      "SLOT_OUT_OF_RANGE",
    );
  }

  const owner = auth.user;

  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: {
      venue: {
        select: { id: true, name: true, ownerId: true },
      },
    },
  });

  if (!court) {
    return jsonError("Court not found.", 404, "COURT_NOT_FOUND");
  }

  if (court.venue.ownerId !== owner.id && owner.role !== "ADMIN") {
    return jsonError(
      "This court does not belong to your venue.",
      403,
      "COURT_NOT_OWNED",
    );
  }

  const slotStarts = Array.from(
    { length: durationHours },
    (_, index) => new Date(slotStart.getTime() + index * HOUR_MS),
  );
  const lockedSlotStarts: Date[] = [];

  try {
    for (const hourlySlot of slotStarts) {
      const acquired = await acquireSlotLock(court.id, hourlySlot, owner.id);

      if (!acquired) {
        await releaseSlotLocks(court.id, lockedSlotStarts, owner.id);
        return jsonError(
          "One of those hours is currently held by a player completing checkout. Try another slot or retry in a few minutes.",
          409,
          "SLOT_LOCKED",
        );
      }

      lockedSlotStarts.push(hourlySlot);
    }
  } catch (error) {
    await releaseSlotLocks(court.id, lockedSlotStarts, owner.id);

    if (process.env.NODE_ENV === "production") {
      console.error("Redis unavailable while acquiring owner slot lock:", error);
      return jsonError(
        "Slot locking is temporarily unavailable. Please retry.",
        503,
        "LOCK_SERVICE_UNAVAILABLE",
      );
    }

    lockedSlotStarts.length = 0;
    console.warn(
      "Redis unavailable in development; creating owner entry with database-only conflict checks.",
    );
  }

  try {
    const pendingCutoff = new Date(Date.now() - PENDING_HOLD_MS);

    await prisma.booking.updateMany({
      where: {
        courtId: court.id,
        status: BookingStatus.PENDING,
        createdAt: { lt: pendingCutoff },
        slotStart: { lt: slotEnd },
        slotEnd: { gt: slotStart },
      },
      data: { status: BookingStatus.EXPIRED },
    });

    const conflict = await prisma.booking.findFirst({
      where: {
        courtId: court.id,
        status: {
          in: [
            BookingStatus.PENDING,
            BookingStatus.CONFIRMED,
            BookingStatus.MAINTENANCE,
          ],
        },
        slotStart: { lt: slotEnd },
        slotEnd: { gt: slotStart },
      },
      select: { id: true },
    });

    if (conflict) {
      return jsonError(
        "That court is already booked or blocked for part of this range.",
        409,
        "SLOT_ALREADY_BOOKED",
      );
    }

    const price = calculateBookingPrice(
      court.price * durationHours,
      entryConfig.paymentMode,
    );
    const paidAmount = entryConfig.collectNow ? price.totalPayable : 0;
    const dueAmount = entryConfig.collectNow ? 0 : price.totalPayable;

    const booking = await prisma.booking.create({
      data: {
        userId: null,
        courtId: court.id,
        slotStart,
        slotEnd,
        status: BookingStatus.CONFIRMED,
        paymentMode: entryConfig.paymentMode,
        paidAmount,
        dueAmount,
        convenienceFee: 0,
        ownerPayout: price.ownerPayout,
        manualName: customerName || null,
      },
    });

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          courtId: booking.courtId,
          courtName: court.name,
          venueId: court.venue.id,
          venueName: court.venue.name,
          slotStart: booking.slotStart.toISOString(),
          slotEnd: booking.slotEnd.toISOString(),
          status: booking.status,
          paymentMode: booking.paymentMode,
          paidAmount: booking.paidAmount,
          dueAmount: booking.dueAmount,
          ownerPayout: booking.ownerPayout,
          convenienceFee: booking.convenienceFee,
          customerName: booking.manualName,
          createdAt: booking.createdAt.toISOString(),
        },
        entryType,
        amount: price.totalPayable,
        collectedNow: paidAmount,
        dueAtVenue: dueAmount,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Owner quick entry failed:", error);
    return jsonError(
      "Could not log the entry. Please retry.",
      500,
      "OWNER_ENTRY_FAILED",
    );
  } finally {
    await releaseSlotLocks(court.id, lockedSlotStarts, owner.id);
  }
}
