import { BookingStatus, BlockType } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  OWNER_DAY_END_HOUR as SLOT_END_HOUR,
  OWNER_DAY_START_HOUR as SLOT_START_HOUR,
} from "@/lib/owner-constants";
import {
  formatDateKey,
  formatSlotRange,
  formatTime,
  slotStartForKey,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getIstDayOfWeek, timeToMinutes } from "@/lib/slot-blocks";

const PENDING_HOLD_MS = 60 * 1000;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courtId = searchParams.get("courtId");
  const venueId = searchParams.get("venueId");
  const dateParam = searchParams.get("date");

  const todayKey = formatDateKey(new Date());
  const dateKey = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : todayKey;

  if (!courtId && !venueId) {
    return jsonError("Either 'courtId' or 'venueId' is required.", 400, "MISSING_PARAM");
  }

  // Find court(s)
  const courts = await prisma.court.findMany({
    where: {
      ...(courtId ? { id: courtId } : {}),
      ...(venueId ? { venueId } : {}),
    },
    include: {
      venue: {
        select: { id: true, name: true, city: true },
      },
    },
    orderBy: { name: "asc" },
  });

  if (courts.length === 0) {
    return jsonError("No courts found matching criteria.", 404, "NOT_FOUND");
  }

  const courtIds = courts.map((c) => c.id);
  const rangeStart = slotStartForKey(dateKey, SLOT_START_HOUR);
  const rangeEnd = slotStartForKey(dateKey, SLOT_END_HOUR);
  const pendingCutoff = new Date(Date.now() - PENDING_HOLD_MS);
  const nowMs = Date.now();

  const [bookings, slotBlocks] = await Promise.all([
    prisma.booking.findMany({
      where: {
        courtId: { in: courtIds },
        slotStart: { lt: rangeEnd },
        slotEnd: { gt: rangeStart },
        OR: [
          { status: { in: [BookingStatus.CONFIRMED, BookingStatus.MAINTENANCE] } },
          { status: BookingStatus.PENDING, createdAt: { gte: pendingCutoff } },
        ],
      },
      select: {
        courtId: true,
        slotStart: true,
        slotEnd: true,
        status: true,
      },
    }),
    prisma.slotBlock.findMany({
      where: { courtId: { in: courtIds } },
    }),
  ]);

  const targetDate = new Date(`${dateKey}T12:00:00+05:30`);
  const dayOfWeek = getIstDayOfWeek(targetDate);
  const hourMs = 60 * 60 * 1000;

  const resultCourts = courts.map((court) => {
    const courtBookings = bookings.filter((b) => b.courtId === court.id);
    const courtBlocks = slotBlocks.filter((b) => b.courtId === court.id);

    const slots = [];

    for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR; hour++) {
      const start = slotStartForKey(dateKey, hour);
      const end = new Date(start.getTime() + hourMs);
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const slotStartMinutes = hour * 60;
      const slotEndMinutes = (hour + 1) * 60;

      let status: "AVAILABLE" | "BOOKED" | "LOCKED" | "MAINTENANCE" | "BLOCKED" | "PAST" = "AVAILABLE";
      let blockReason: string | undefined;
      let blockType: string | undefined;

      // 1. Check past
      if (start.getTime() <= nowMs) {
        status = "PAST";
      }

      // 2. Check bookings
      const booking = courtBookings.find(
        (b) => b.slotStart < end && b.slotEnd > start,
      );

      if (booking) {
        if (booking.status === BookingStatus.CONFIRMED) {
          status = "BOOKED";
        } else if (booking.status === BookingStatus.PENDING) {
          status = "LOCKED";
        } else if (booking.status === BookingStatus.MAINTENANCE) {
          status = "MAINTENANCE";
        }
      }

      // 3. Check SlotBlocks (permanent recurring or temporary)
      const matchingBlock = courtBlocks.find((block) => {
        if (block.blockType === BlockType.TEMPORARY) {
          if (!block.startDate || !block.endDate) return false;
          return block.startDate < end && block.endDate > start;
        }

        if (block.blockType === BlockType.PERMANENT_RECURRING) {
          if (!block.daysOfWeek.includes(dayOfWeek) || !block.startTime || !block.endTime) {
            return false;
          }
          const bStartMin = timeToMinutes(block.startTime);
          const bEndMin = timeToMinutes(block.endTime);
          return slotStartMinutes < bEndMin && slotEndMinutes > bStartMin;
        }

        return false;
      });

      if (matchingBlock) {
        status = "BLOCKED";
        blockReason = matchingBlock.reason;
        blockType = matchingBlock.blockType;
      }

      slots.push({
        hour,
        startIso,
        endIso,
        label: formatTime(start),
        range: formatSlotRange(start, end),
        status,
        available: status === "AVAILABLE",
        ...(blockReason ? { reason: blockReason } : {}),
        ...(blockType ? { blockType } : {}),
      });
    }

    return {
      courtId: court.id,
      courtName: court.name,
      sportType: court.sportType,
      price: court.price,
      venue: court.venue,
      date: dateKey,
      slots,
      activeBlocks: courtBlocks.map((b) => ({
        id: b.id,
        blockType: b.blockType,
        reason: b.reason,
        startTime: b.startTime,
        endTime: b.endTime,
        startDate: b.startDate?.toISOString() ?? null,
        endDate: b.endDate?.toISOString() ?? null,
        daysOfWeek: b.daysOfWeek,
      })),
    };
  });

  if (courtId && resultCourts.length === 1) {
    return NextResponse.json(resultCourts[0]);
  }

  return NextResponse.json({ date: dateKey, courts: resultCourts });
}
