import "server-only";

import { BookingStatus, PaymentMode, type Prisma } from "@prisma/client";
import { PENDING_HOLD_MS } from "@/lib/booking-data";
import {
  addDaysToDateKey,
  formatDateKey,
  formatRelativeDateKey,
  formatSlotRange,
  formatTime,
  slotStartForKey,
} from "@/lib/format";
import { OWNER_DAY_HOURS } from "@/lib/owner-constants";
import { prisma } from "@/lib/prisma";
import type { OwnerBookingRow, OwnerCourtOption } from "@/lib/types";

const HOUR_MS = 60 * 60 * 1000;

export const ONLINE_PAYMENT_MODES: PaymentMode[] = [
  PaymentMode.FULL_ONLINE,
  PaymentMode.ADVANCE_ONLINE,
];

export const DIRECT_PAYMENT_MODES: PaymentMode[] = [
  PaymentMode.OFFLINE_CASH,
  PaymentMode.PHONE_BOOKING,
  PaymentMode.MANUAL_EXTERNAL,
];

type OwnerBookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    court: {
      include: {
        venue: {
          select: { id: true; name: true };
        };
      };
    };
    user: {
      select: { name: true };
    };
  };
}>;

function durationHours(slotStart: Date, slotEnd: Date): number {
  return Math.max(0, (slotEnd.getTime() - slotStart.getTime()) / HOUR_MS);
}

export function bookingRangeLabel(slotStart: string, slotEnd: string): string {
  return formatSlotRange(new Date(slotStart), new Date(slotEnd));
}

export function bookingStartLabel(slotStart: string): string {
  return formatTime(new Date(slotStart));
}

function toOwnerBookingRow(booking: OwnerBookingWithRelations): OwnerBookingRow {
  return {
    id: booking.id,
    courtId: booking.courtId,
    courtName: booking.court.name,
    venueId: booking.court.venue.id,
    venueName: booking.court.venue.name,
    slotStart: booking.slotStart.toISOString(),
    slotEnd: booking.slotEnd.toISOString(),
    status: booking.status,
    paymentMode: booking.paymentMode,
    paidAmount: booking.paidAmount,
    dueAmount: booking.dueAmount,
    ownerPayout: booking.ownerPayout,
    convenienceFee: booking.convenienceFee,
    customerName: booking.manualName?.trim() || booking.user?.name || null,
    createdAt: booking.createdAt.toISOString(),
  };
}

function ownerBookingWhere(
  ownerId: string,
  rangeStart: Date,
  rangeEnd: Date,
): Prisma.BookingWhereInput {
  const pendingCutoff = new Date(Date.now() - PENDING_HOLD_MS);

  return {
    court: { venue: { ownerId } },
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
  };
}

export async function getOwnerVenues(ownerId: string) {
  return prisma.venue.findMany({
    where: { ownerId },
    include: {
      courts: {
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function getOwnerCourtOptions(
  ownerId: string,
): Promise<OwnerCourtOption[]> {
  const venues = await getOwnerVenues(ownerId);

  return venues.flatMap((venue) =>
    venue.courts.map((court) => ({
      id: court.id,
      name: court.name,
      venueId: venue.id,
      venueName: venue.name,
      sportType: court.sportType,
      price: court.price,
    })),
  );
}

export async function getOwnerCalendarBookings(
  ownerId: string,
  startDateKey: string,
  endDateKey: string,
): Promise<OwnerBookingRow[]> {
  const rangeStart = slotStartForKey(startDateKey, 0);
  const rangeEnd = slotStartForKey(addDaysToDateKey(endDateKey, 1), 0);

  const bookings = await prisma.booking.findMany({
    where: ownerBookingWhere(ownerId, rangeStart, rangeEnd),
    include: {
      court: {
        include: {
          venue: {
            select: { id: true, name: true },
          },
        },
      },
      user: {
        select: { name: true },
      },
    },
    orderBy: [{ slotStart: "asc" }, { courtId: "asc" }],
  });

  return bookings.map(toOwnerBookingRow);
}

export interface OwnerCourtUtilization {
  court: OwnerCourtOption;
  bookedHours: number;
  maintenanceHours: number;
  revenue: number;
  utilization: number;
}

export interface OwnerDashboardData {
  todayKey: string;
  todayLabel: string;
  courtCount: number;
  confirmedCount: number;
  pendingCount: number;
  maintenanceCount: number;
  cashCollected: number;
  onlinePayout: number;
  directRevenue: number;
  onlineRevenue: number;
  totalRevenue: number;
  bookedHours: number;
  maintenanceHours: number;
  occupancyRate: number;
  todayBookings: OwnerBookingRow[];
  nextBooking: OwnerBookingRow | null;
  recentDirectEntries: OwnerBookingRow[];
  courtUtilization: OwnerCourtUtilization[];
  venues: Awaited<ReturnType<typeof getOwnerVenues>>;
}

export async function getOwnerDashboardData(
  ownerId: string,
  now = new Date(),
): Promise<OwnerDashboardData> {
  const todayKey = formatDateKey(now);
  const rangeStart = slotStartForKey(todayKey, 0);
  const rangeEnd = slotStartForKey(addDaysToDateKey(todayKey, 1), 0);

  const [venues, todayBookings, nextBooking, recentDirectEntries] =
    await Promise.all([
      getOwnerVenues(ownerId),
      prisma.booking.findMany({
        where: ownerBookingWhere(ownerId, rangeStart, rangeEnd),
        include: {
          court: {
            include: {
              venue: {
                select: { id: true, name: true },
              },
            },
          },
          user: {
            select: { name: true },
          },
        },
        orderBy: [{ slotStart: "asc" }, { courtId: "asc" }],
      }),
      prisma.booking.findFirst({
        where: {
          court: { venue: { ownerId } },
          status: BookingStatus.CONFIRMED,
          slotStart: { gte: now },
        },
        include: {
          court: {
            include: {
              venue: {
                select: { id: true, name: true },
              },
            },
          },
          user: {
            select: { name: true },
          },
        },
        orderBy: { slotStart: "asc" },
      }),
      prisma.booking.findMany({
        where: {
          court: { venue: { ownerId } },
          status: BookingStatus.CONFIRMED,
          paymentMode: { in: DIRECT_PAYMENT_MODES },
        },
        include: {
          court: {
            include: {
              venue: {
                select: { id: true, name: true },
              },
            },
          },
          user: {
            select: { name: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
    ]);

  const rows = todayBookings.map(toOwnerBookingRow);
  const confirmed = rows.filter((row) => row.status === "CONFIRMED");
  const maintenance = rows.filter((row) => row.status === "MAINTENANCE");
  const pending = rows.filter((row) => row.status === "PENDING");

  const bookedHours = confirmed.reduce(
    (total, row) =>
      total + durationHours(new Date(row.slotStart), new Date(row.slotEnd)),
    0,
  );
  const maintenanceHours = maintenance.reduce(
    (total, row) =>
      total + durationHours(new Date(row.slotStart), new Date(row.slotEnd)),
    0,
  );

  const courtOptions = venues.flatMap((venue) =>
    venue.courts.map((court) => ({
      id: court.id,
      name: court.name,
      venueId: venue.id,
      venueName: venue.name,
      sportType: court.sportType,
      price: court.price,
    })),
  );

  const cashCollected = confirmed
    .filter((row) => row.paymentMode === "OFFLINE_CASH")
    .reduce((total, row) => total + row.paidAmount, 0);
  const onlineRevenue = confirmed
    .filter(
      (row) =>
        row.paymentMode === "FULL_ONLINE" ||
        row.paymentMode === "ADVANCE_ONLINE",
    )
    .reduce((total, row) => total + row.ownerPayout, 0);
  const directRevenue = confirmed
    .filter((row) => DIRECT_PAYMENT_MODES.includes(row.paymentMode))
    .reduce((total, row) => total + row.ownerPayout, 0);

  const availableHours = Math.max(
    courtOptions.length * OWNER_DAY_HOURS - maintenanceHours,
    1,
  );

  const courtUtilization = courtOptions.map((court) => {
    const courtRows = confirmed.filter((row) => row.courtId === court.id);
    const courtMaintenance = maintenance.filter(
      (row) => row.courtId === court.id,
    );
    const courtHours = courtRows.reduce(
      (total, row) =>
        total + durationHours(new Date(row.slotStart), new Date(row.slotEnd)),
      0,
    );
    const blockedHours = courtMaintenance.reduce(
      (total, row) =>
        total + durationHours(new Date(row.slotStart), new Date(row.slotEnd)),
      0,
    );

    return {
      court,
      bookedHours: courtHours,
      maintenanceHours: blockedHours,
      revenue: courtRows.reduce((total, row) => total + row.ownerPayout, 0),
      utilization: Math.min(
        100,
        Math.round(
          (courtHours / Math.max(OWNER_DAY_HOURS - blockedHours, 1)) * 100,
        ),
      ),
    };
  });

  return {
    todayKey,
    todayLabel: formatRelativeDateKey(todayKey),
    courtCount: courtOptions.length,
    confirmedCount: confirmed.length,
    pendingCount: pending.length,
    maintenanceCount: maintenance.length,
    cashCollected,
    onlinePayout: onlineRevenue,
    directRevenue,
    onlineRevenue,
    totalRevenue: onlineRevenue + directRevenue,
    bookedHours,
    maintenanceHours,
    occupancyRate: Math.min(
      100,
      Math.round((bookedHours / availableHours) * 100),
    ),
    todayBookings: rows,
    nextBooking: nextBooking ? toOwnerBookingRow(nextBooking) : null,
    recentDirectEntries: recentDirectEntries.map(toOwnerBookingRow),
    courtUtilization,
    venues,
  };
}
