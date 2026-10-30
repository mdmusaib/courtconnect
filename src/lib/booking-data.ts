import "server-only";

import { cache } from "react";
import { unstable_cache } from "next/cache";
import { BookingStatus, BlockType, VerificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  getIstDayOfWeek,
  timeToMinutes,
} from "@/lib/slot-blocks";
import {
  addDaysToDateKey,
  formatDateKey,
  formatDateKeyLong,
  formatRelativeDateKey,
  formatSlotRange,
  formatTime,
  getDateParts,
  slotStartForKey,
} from "@/lib/format";
import type {
  DaySchedule,
  SlotBooking,
  VenueBookingData,
} from "@/lib/types";

export const SLOT_START_HOUR = 6;
export const SLOT_END_HOUR = 23;
export const PENDING_HOLD_MINUTES = 1;
export const PENDING_HOLD_MS = PENDING_HOLD_MINUTES * 60 * 1000;

// Kept local to avoid widening the shared UI types with server-only fields.
interface CrossDay {
  key: string;
  weekday: string;
  day: string;
  month: string;
  label: string;
  dateLabel: string;
  isToday: boolean;
}

export function getWeekDays(count = 7): CrossDay[] {
  const todayKey = formatDateKey(new Date());

  return Array.from({ length: count }, (_, index) => {
    const key = addDaysToDateKey(todayKey, index);
    const date = new Date(`${key}T12:00:00+05:30`);
    const parts = getDateParts(date);

    return {
      key,
      ...parts,
      label: formatRelativeDateKey(key),
      dateLabel: formatDateKeyLong(key),
      isToday: key === todayKey,
    };
  });
}

export function buildDaySchedules(days: CrossDay[]): DaySchedule[] {
  return days.map((day) => ({
    ...day,
    slots: Array.from(
      { length: SLOT_END_HOUR - SLOT_START_HOUR },
      (_, index) => {
        const hour = SLOT_START_HOUR + index;
        const start = slotStartForKey(day.key, hour);
        const end = new Date(start.getTime() + 60 * 60 * 1000);

        return {
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          label: formatTime(start),
          range: formatSlotRange(start, end),
        };
      },
    ),
  }));
}

export async function getVenueBookingData(
  venueId: string,
  days: CrossDay[],
): Promise<{
  venue: VenueBookingData;
  bookings: SlotBooking[];
} | null> {
  const venue = await prisma.venue.findFirst({
    where: { id: venueId, verificationStatus: VerificationStatus.VERIFIED },
    select: {
      id: true,
      name: true,
      city: true,
      address: true,
      amenities: true,
      courts: {
        select: {
          id: true,
          name: true,
          sportType: true,
          price: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!venue) {
    return null;
  }

  const firstDay = days[0];
  const lastDay = days[days.length - 1];
  const rangeStart = slotStartForKey(firstDay.key, SLOT_START_HOUR);
  const rangeEnd = slotStartForKey(
    addDaysToDateKey(lastDay.key, 1),
    0,
  );
  const pendingCutoff = new Date(Date.now() - PENDING_HOLD_MS);

  const rows = await prisma.booking.findMany({
    where: {
      courtId: { in: venue.courts.map((court) => court.id) },
      slotStart: { lt: rangeEnd },
      slotEnd: { gt: rangeStart },
      OR: [
        {
          status: {
            in: [BookingStatus.CONFIRMED, BookingStatus.MAINTENANCE],
          },
        },
        {
          status: BookingStatus.PENDING,
          createdAt: { gte: pendingCutoff },
        },
      ],
    },
    select: {
      courtId: true,
      slotStart: true,
      slotEnd: true,
      status: true,
    },
    orderBy: { slotStart: "asc" },
  });

  const bookings: SlotBooking[] = [];
  const hourMs = 60 * 60 * 1000;

  // A booking can now span several hours, but the slot grid is still hourly.
  // Expand each booking into one entry per hour so every covered block renders
  // as unavailable instead of only the first hour.
  for (const row of rows) {
    for (
      let cursor = new Date(row.slotStart);
      cursor < row.slotEnd;
      cursor = new Date(cursor.getTime() + hourMs)
    ) {
      if (cursor < rangeStart || cursor >= rangeEnd) {
        continue;
      }

      bookings.push({
        courtId: row.courtId,
        slotStart: cursor.toISOString(),
        status: row.status,
      });
    }
  }

  // Expand SlotBlock items (recurring and temporary maintenance) into unavailable slots
  const courtIds = venue.courts.map((court) => court.id);
  const slotBlocks = await prisma.slotBlock.findMany({
    where: { courtId: { in: courtIds } },
  });

  const existingBookingKeys = new Set(
    bookings.map((b) => `${b.courtId}|${b.slotStart}`),
  );

  for (const day of days) {
    const dayDate = new Date(`${day.key}T12:00:00+05:30`);
    const dayOfWeek = getIstDayOfWeek(dayDate);

    for (let hour = SLOT_START_HOUR; hour < SLOT_END_HOUR; hour++) {
      const slotStart = slotStartForKey(day.key, hour);
      const slotEnd = new Date(slotStart.getTime() + hourMs);
      const slotStartMinutes = hour * 60;
      const slotEndMinutes = (hour + 1) * 60;

      for (const courtId of courtIds) {
        const key = `${courtId}|${slotStart.toISOString()}`;
        if (existingBookingKeys.has(key)) {
          continue;
        }

        const matchingBlock = slotBlocks.find((block) => {
          if (block.courtId !== courtId) return false;

          if (block.blockType === BlockType.TEMPORARY) {
            if (!block.startDate || !block.endDate) return false;
            return block.startDate < slotEnd && block.endDate > slotStart;
          }

          if (block.blockType === BlockType.PERMANENT_RECURRING) {
            if (
              !block.daysOfWeek.includes(dayOfWeek) ||
              !block.startTime ||
              !block.endTime
            ) {
              return false;
            }
            const bStartMin = timeToMinutes(block.startTime);
            const bEndMin = timeToMinutes(block.endTime);
            return slotStartMinutes < bEndMin && slotEndMinutes > bStartMin;
          }

          return false;
        });

        if (matchingBlock) {
          existingBookingKeys.add(key);
          bookings.push({
            courtId,
            slotStart: slotStart.toISOString(),
            status: BookingStatus.MAINTENANCE,
          });
        }
      }
    }
  }

  return {
    venue: {
      id: venue.id,
      name: venue.name,
      address: venue.address,
      city: venue.city,
      amenities: venue.amenities,
      courts: venue.courts,
    },
    bookings,
  };
}

export const getCachedPublicVenues = unstable_cache(
  async () => {
    return prisma.venue.findMany({
      where: { verificationStatus: VerificationStatus.VERIFIED },
      include: {
        courts: {
          orderBy: { price: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
  },
  ["public-venues-list"],
  { revalidate: 15, tags: ["venues"] },
);

export const getCachedVenueDetails = unstable_cache(
  async (venueId: string) => {
    return prisma.venue.findFirst({
      where: { id: venueId, verificationStatus: VerificationStatus.VERIFIED },
      include: {
        courts: {
          orderBy: { name: "asc" },
        },
        owner: {
          select: { name: true },
        },
      },
    });
  },
  ["venue-details-by-id"],
  { revalidate: 15, tags: ["venues"] },
);

export const getVenueDetails = cache(async (venueId: string) => {
  return getCachedVenueDetails(venueId);
});

export async function getBookingDetails(bookingId: string) {
  return prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      court: {
        include: {
          venue: true,
        },
      },
      user: {
        select: { name: true, phone: true },
      },
    },
  });
}

export async function getPlayerBookings(phone: string, now = new Date()) {
  const bookings = await prisma.booking.findMany({
    where: {
      user: { phone },
    },
    include: {
      court: {
        include: {
          venue: true,
        },
      },
    },
    orderBy: { slotStart: "desc" },
  });

  return bookings.map((booking) => {
    const isActive =
      (booking.status === BookingStatus.CONFIRMED ||
        booking.status === BookingStatus.PENDING) &&
      booking.slotEnd >= now;
    const holdExpired =
      booking.status === BookingStatus.PENDING &&
      booking.createdAt.getTime() + PENDING_HOLD_MS <= now.getTime();

    return {
      id: booking.id,
      status: booking.status,
      paymentMode: booking.paymentMode,
      slotStart: booking.slotStart.toISOString(),
      slotEnd: booking.slotEnd.toISOString(),
      createdAt: booking.createdAt.toISOString(),
      paidAmount: booking.paidAmount,
      dueAmount: booking.dueAmount,
      convenienceFee: booking.convenienceFee,
      ownerPayout: booking.ownerPayout,
      utrNumber: booking.utrNumber,
      refundAmount: booking.refundAmount,
      refundStatus: booking.refundStatus,
      refundPolicy: booking.refundPolicy,
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      canCancel:
        booking.userId !== null &&
        booking.slotStart > now &&
        (booking.status === BookingStatus.PENDING ||
          booking.status === BookingStatus.CONFIRMED),
      dateLabel: formatDateKeyLong(formatDateKey(booking.slotStart)),
      timeLabel: formatSlotRange(booking.slotStart, booking.slotEnd),
      fullDateLabel: `${formatDateKeyLong(formatDateKey(booking.slotStart))} · ${formatTime(booking.slotStart)}`,
      court: {
        id: booking.court.id,
        name: booking.court.name,
        sportType: booking.court.sportType,
        price: booking.court.price,
      },
      venue: {
        id: booking.court.venue.id,
        name: booking.court.venue.name,
        address: booking.court.venue.address,
        city: booking.court.venue.city,
      },
      isActive,
      holdExpired,
    };
  });
}

export async function getNextPlayerBooking(phone: string) {
  const now = new Date();
  const pendingCutoff = new Date(now.getTime() - PENDING_HOLD_MS);

  return prisma.booking.findFirst({
    where: {
      user: { phone },
      slotStart: { gte: now },
      OR: [
        { status: BookingStatus.CONFIRMED },
        {
          status: BookingStatus.PENDING,
          createdAt: { gte: pendingCutoff },
        },
      ],
    },
    include: {
      court: {
        include: {
          venue: true,
        },
      },
    },
    orderBy: { slotStart: "asc" },
  });
}
