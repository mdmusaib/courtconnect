import { BookingStatus, PaymentMode } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  PENDING_HOLD_MS,
  SLOT_END_HOUR,
  SLOT_START_HOUR,
} from "@/lib/booking-data";
import { requireApiUser } from "@/lib/api-auth";
import { addDaysToDateKey, formatDateKey } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { calculateBookingPrice } from "@/lib/pricing";
import { acquireSlotLock, releaseSlotLock } from "@/lib/slot-lock";
import { checkSlotBlockConflict } from "@/lib/slot-blocks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR_MS = 60 * 60 * 1000;
const MAX_BOOKING_HOURS = SLOT_END_HOUR - SLOT_START_HOUR;

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
    console.error("Failed to release slot lock:", error);
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
  const auth = await requireApiUser();

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
  };
  const courtId =
    typeof payload.courtId === "string" ? payload.courtId.trim() : "";
  const slotStartValue =
    typeof payload.slotStart === "string" ? payload.slotStart : "";
  const slotEndValue =
    typeof payload.slotEnd === "string" ? payload.slotEnd : "";

  if (!courtId) {
    return jsonError("courtId is required.", 400, "MISSING_COURT_ID");
  }

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

  if (slotStart.getTime() <= Date.now()) {
    return jsonError(
      "This slot has already started. Choose a later slot.",
      400,
      "SLOT_IN_PAST",
    );
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

  if (
    durationMs % HOUR_MS !== 0 ||
    startTime.minute !== 0 ||
    endTime.minute !== 0
  ) {
    return jsonError(
      "Bookings must align to full one-hour blocks.",
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
    durationHours > MAX_BOOKING_HOURS
  ) {
    return jsonError(
      "Bookings must fit between 6:00 AM and 11:00 PM IST.",
      400,
      "INVALID_SLOT_TIME",
    );
  }

  const slotDateKey = formatDateKey(slotStart);

  if (formatDateKey(slotEnd) !== slotDateKey) {
    return jsonError(
      "A booking cannot cross midnight.",
      400,
      "INVALID_SLOT_RANGE",
    );
  }

  const todayKey = formatDateKey(new Date());
  const lastBookableKey = addDaysToDateKey(todayKey, 6);

  if (slotDateKey < todayKey || slotDateKey > lastBookableKey) {
    return jsonError(
      "Slots can only be booked up to 7 days in advance.",
      400,
      "SLOT_OUT_OF_RANGE",
    );
  }

  const court = await prisma.court.findUnique({
    where: { id: courtId },
    include: {
      venue: {
        select: { name: true },
      },
    },
  });

  if (!court) {
    return jsonError("Court not found.", 404, "COURT_NOT_FOUND");
  }

  const player = auth.user;
  const slotStarts = Array.from(
    { length: durationHours },
    (_, index) => new Date(slotStart.getTime() + index * HOUR_MS),
  );
  const lockedSlotStarts: Date[] = [];

  try {
    // Hold every hour in the range so a concurrent player cannot take a middle
    // block while this player is choosing/paying.
    for (const hourlySlot of slotStarts) {
      const acquired = await acquireSlotLock(court.id, hourlySlot, player.id);

      if (!acquired) {
        await releaseSlotLocks(court.id, lockedSlotStarts, player.id);
        return jsonError(
          "One of those slots is temporarily held by another player. Try another range.",
          409,
          "SLOT_LOCKED",
        );
      }

      lockedSlotStarts.push(hourlySlot);
    }
  } catch (error) {
    await releaseSlotLocks(court.id, lockedSlotStarts, player.id);

    // Local development often runs without the private GCP Redis instance.
    // Production must never create a booking without a real distributed lock.
    if (process.env.NODE_ENV === "production") {
      console.error("Redis unavailable while acquiring slot lock:", error);
      return jsonError(
        "Slot locking is temporarily unavailable. Please retry.",
        503,
        "LOCK_SERVICE_UNAVAILABLE",
      );
    }

    lockedSlotStarts.length = 0;
    console.warn(
      "Redis unavailable in development; creating booking with database-only conflict checks.",
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
      await releaseSlotLocks(court.id, lockedSlotStarts, player.id);

      return jsonError(
        "One of those hours was just booked. Please choose another range.",
        409,
        "SLOT_ALREADY_BOOKED",
      );
    }

    const blockConflict = await checkSlotBlockConflict(
      court.id,
      slotStart,
      slotEnd,
    );

    if (blockConflict.blocked) {
      await releaseSlotLocks(court.id, lockedSlotStarts, player.id);

      return jsonError(
        blockConflict.reason
          ? `Slot unavailable: ${blockConflict.reason}`
          : "This time slot is blocked for maintenance or recurring membership.",
        409,
        "SLOT_BLOCKED",
      );
    }

    const price = calculateBookingPrice(
      court.price * durationHours,
      "FULL_ONLINE",
    );

    const booking = await prisma.booking.create({
      data: {
        userId: player.id,
        courtId: court.id,
        slotStart,
        slotEnd,
        status: BookingStatus.PENDING,
        paymentMode: PaymentMode.FULL_ONLINE,
        paidAmount: 0,
        dueAmount: price.totalPayable,
        convenienceFee: price.convenienceFee,
        ownerPayout: price.ownerPayout,
      },
      select: {
        id: true,
        slotStart: true,
        slotEnd: true,
        dueAmount: true,
      },
    });

    return NextResponse.json(
      {
        booking,
        court: {
          id: court.id,
          name: court.name,
          venueName: court.venue.name,
        },
        durationHours,
        checkoutUrl: `/checkout/${booking.id}`,
      },
      { status: 201 },
    );
  } catch (error) {
    await releaseSlotLocks(court.id, lockedSlotStarts, player.id);

    console.error("Booking creation failed:", error);
    return jsonError(
      "Could not create the booking. Please retry.",
      500,
      "BOOKING_CREATE_FAILED",
    );
  }
}
