import "server-only";

import {
  BookingStatus,
  DisputeStatus,
  PaymentMode,
  RefundStatus,
  VerificationStatus,
  type Prisma,
} from "@prisma/client";
import {
  addDaysToDateKey,
  formatDateKey,
  formatDateKeyLong,
  formatRelativeDateKey,
  formatSlotRange,
} from "@/lib/format";
import { prisma } from "@/lib/prisma";
import type {
  BookingStatusValue,
  DisputeResolutionValue,
  DisputeStatusValue,
  PaymentModeValue,
  RefundStatusValue,
  VerificationStatusValue,
} from "@/lib/types";

const DAY_MS = 86_400_000;

const ONLINE_PAYMENT_MODES: PaymentMode[] = [
  PaymentMode.FULL_ONLINE,
  PaymentMode.ADVANCE_ONLINE,
];

const DIRECT_PAYMENT_MODES: PaymentMode[] = [
  PaymentMode.OFFLINE_CASH,
  PaymentMode.PHONE_BOOKING,
  PaymentMode.MANUAL_EXTERNAL,
];

export interface AdminActionRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  adminName: string;
  createdAt: string;
  createdAtLabel: string;
  metadata: Prisma.JsonValue | null;
}

export interface AdminVenueRow {
  id: string;
  name: string;
  city: string;
  address: string;
  amenities: string[];
  verificationStatus: VerificationStatusValue;
  verificationNotes: string | null;
  verifiedAt: string | null;
  createdAt: string;
  owner: {
    id: string;
    name: string;
    phone: string;
  };
  courts: Array<{
    id: string;
    name: string;
    sportType: string;
    price: number;
  }>;
  bookingCount: number;
  confirmedRevenue: number;
  platformFees: number;
}

export interface AdminRevenueRow {
  id: string;
  status: BookingStatusValue;
  paymentMode: PaymentModeValue;
  slotStart: string;
  slotEnd: string;
  createdAt: string;
  dateLabel: string;
  timeLabel: string;
  createdLabel: string;
  venueId: string;
  venueName: string;
  courtName: string;
  playerName: string;
  playerPhone: string | null;
  utrNumber: string | null;
  paidAmount: number;
  dueAmount: number;
  convenienceFee: number;
  ownerPayout: number;
  refundAmount: number;
  refundStatus: RefundStatusValue;
  isOnline: boolean;
}

export interface AdminRevenueTotals {
  bookings: number;
  gmv: number;
  platformRevenue: number;
  ownerPayout: number;
  directRevenue: number;
  onlinePayments: number;
  directBookings: number;
  pendingRefunds: number;
  processedRefunds: number;
  cancellations: number;
}

export type RevenueRange = "7" | "30" | "all";
export type RevenueStatusFilter =
  | "ALL"
  | "CONFIRMED"
  | "PENDING"
  | "CANCELLED"
  | "EXPIRED";

export interface AdminRevenueFilters {
  status: RevenueStatusFilter;
  range: RevenueRange;
  query: string;
}

export interface AdminRevenueData {
  filters: AdminRevenueFilters;
  rows: AdminRevenueRow[];
  totals: AdminRevenueTotals;
  byStatus: Record<string, number>;
}

export interface AdminDisputeRow {
  id: string;
  status: DisputeStatusValue;
  reason: string;
  details: string | null;
  resolution: DisputeResolutionValue;
  resolutionNote: string | null;
  refundAmount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  booking: {
    id: string;
    status: BookingStatusValue;
    paymentMode: PaymentModeValue;
    slotStart: string;
    slotEnd: string;
    dateLabel: string;
    timeLabel: string;
    paidAmount: number;
    ownerPayout: number;
    convenienceFee: number;
    refundAmount: number;
    refundStatus: RefundStatusValue;
    venueName: string;
    courtName: string;
  };
  player: {
    id: string;
    name: string;
    phone: string;
  } | null;
  resolvedBy: {
    id: string;
    name: string;
  } | null;
}

function safeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function buildSearchWhere(query: string): Prisma.BookingWhereInput | null {
  const trimmed = query.trim();

  if (!trimmed) {
    return null;
  }

  const contains = { contains: trimmed, mode: "insensitive" as const };

  return {
    OR: [
      { id: contains },
      { utrNumber: contains },
      { manualName: contains },
      { user: { is: { name: contains } } },
      { user: { is: { phone: contains } } },
      { court: { is: { name: contains } } },
      { court: { is: { venue: { is: { name: contains } } } } },
      { court: { is: { venue: { is: { city: contains } } } } },
    ],
  };
}

function buildRevenueWhere(
  filters: AdminRevenueFilters,
  now = new Date(),
): Prisma.BookingWhereInput {
  const clauses: Prisma.BookingWhereInput[] = [];

  if (filters.status !== "ALL") {
    clauses.push({ status: filters.status as BookingStatus });
  }

  if (filters.range !== "all") {
    const days = Number(filters.range);
    clauses.push({
      createdAt: { gte: new Date(now.getTime() - days * DAY_MS) },
    });
  }

  const search = buildSearchWhere(filters.query);

  if (search) {
    clauses.push(search);
  }

  return clauses.length > 0 ? { AND: clauses } : {};
}

function toAdminRevenueRow(
  booking: Prisma.BookingGetPayload<{
    include: {
      court: { include: { venue: true } };
      user: { select: { name: true; phone: true } };
    };
  }>,
): AdminRevenueRow {
  return {
    id: booking.id,
    status: booking.status,
    paymentMode: booking.paymentMode,
    slotStart: booking.slotStart.toISOString(),
    slotEnd: booking.slotEnd.toISOString(),
    createdAt: booking.createdAt.toISOString(),
    dateLabel: formatDateKeyLong(formatDateKey(booking.slotStart)),
    timeLabel: formatSlotRange(booking.slotStart, booking.slotEnd),
    createdLabel: `${formatRelativeDateKey(formatDateKey(booking.createdAt))} · ${formatDateKeyLong(formatDateKey(booking.createdAt))}`,
    venueId: booking.court.venue.id,
    venueName: booking.court.venue.name,
    courtName: booking.court.name,
    playerName:
      booking.manualName?.trim() || booking.user?.name || "Venue direct entry",
    playerPhone: booking.user?.phone ?? null,
    utrNumber: booking.utrNumber,
    paidAmount: booking.paidAmount,
    dueAmount: booking.dueAmount,
    convenienceFee: booking.convenienceFee,
    ownerPayout: booking.ownerPayout,
    refundAmount: booking.refundAmount,
    refundStatus: booking.refundStatus,
    isOnline: ONLINE_PAYMENT_MODES.includes(booking.paymentMode),
  };
}

export function parseRevenueFilters(input: {
  status?: string;
  range?: string;
  q?: string;
}): AdminRevenueFilters {
  const status: RevenueStatusFilter =
    input.status === "CONFIRMED" ||
    input.status === "PENDING" ||
    input.status === "CANCELLED" ||
    input.status === "EXPIRED"
      ? input.status
      : "ALL";
  const range: RevenueRange =
    input.range === "7" || input.range === "30" ? input.range : "all";

  return {
    status,
    range,
    query: (input.q ?? "").trim().slice(0, 100),
  };
}

export async function getAdminRevenueData(
  filters: AdminRevenueFilters,
  now = new Date(),
): Promise<AdminRevenueData> {
  const where = buildRevenueWhere(filters, now);
  const paidWhere: Prisma.BookingWhereInput = {
    AND: [
      where,
      {
        paidAmount: { gt: 0 },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED] },
      },
    ],
  };
  const confirmedWhere: Prisma.BookingWhereInput = {
    AND: [where, { status: BookingStatus.CONFIRMED }],
  };
  const directWhere: Prisma.BookingWhereInput = {
    AND: [
      where,
      {
        status: BookingStatus.CONFIRMED,
        paymentMode: { in: DIRECT_PAYMENT_MODES },
      },
    ],
  };
  const pendingRefundWhere: Prisma.BookingWhereInput = {
    AND: [where, { refundStatus: RefundStatus.PENDING }],
  };
  const processedRefundWhere: Prisma.BookingWhereInput = {
    AND: [where, { refundStatus: RefundStatus.PROCESSED }],
  };

  const [
    rows,
    statusGroups,
    paidTotals,
    confirmedTotals,
    directTotals,
    pendingRefunds,
    processedRefunds,
    onlinePaymentCount,
  ] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        court: {
          include: { venue: true },
        },
        user: {
          select: { name: true, phone: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.booking.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.booking.aggregate({
      where: paidWhere,
      _sum: { paidAmount: true, convenienceFee: true },
    }),
    prisma.booking.aggregate({
      where: confirmedWhere,
      _sum: { ownerPayout: true },
      _count: { _all: true },
    }),
    prisma.booking.aggregate({
      where: directWhere,
      _sum: { ownerPayout: true },
      _count: { _all: true },
    }),
    prisma.booking.aggregate({
      where: pendingRefundWhere,
      _sum: { refundAmount: true },
    }),
    prisma.booking.aggregate({
      where: processedRefundWhere,
      _sum: { refundAmount: true },
    }),
    prisma.booking.count({
      where: {
        AND: [
          where,
          {
            paidAmount: { gt: 0 },
            paymentMode: { in: ONLINE_PAYMENT_MODES },
          },
        ],
      },
    }),
  ]);

  const byStatus = Object.fromEntries(
    statusGroups.map((group) => [group.status, group._count._all]),
  );

  return {
    filters,
    rows: rows.map(toAdminRevenueRow),
    totals: {
      bookings: statusGroups.reduce(
        (total, group) => total + group._count._all,
        0,
      ),
      gmv: safeNumber(paidTotals._sum.paidAmount),
      platformRevenue: safeNumber(paidTotals._sum.convenienceFee),
      ownerPayout: safeNumber(confirmedTotals._sum.ownerPayout),
      directRevenue: safeNumber(directTotals._sum.ownerPayout),
      onlinePayments: onlinePaymentCount,
      directBookings: directTotals._count._all,
      pendingRefunds: safeNumber(pendingRefunds._sum.refundAmount),
      processedRefunds: safeNumber(processedRefunds._sum.refundAmount),
      cancellations: byStatus.CANCELLED ?? 0,
    },
    byStatus,
  };
}

export async function getAdminVenueRows(
  status: VerificationStatusValue | "ALL" = "ALL",
): Promise<AdminVenueRow[]> {
  const [venues, bookingGroups, confirmedGroups, feeGroups] = await Promise.all([
    prisma.venue.findMany({
      where: status === "ALL" ? {} : { verificationStatus: status },
      include: {
        owner: {
          select: { id: true, name: true, phone: true },
        },
        courts: {
          orderBy: { name: "asc" },
        },
      },
      orderBy: [{ verificationStatus: "asc" }, { createdAt: "desc" }],
    }),
    prisma.booking.groupBy({
      by: ["courtId"],
      _count: { _all: true },
    }),
    prisma.booking.groupBy({
      by: ["courtId"],
      where: { status: BookingStatus.CONFIRMED },
      _sum: { ownerPayout: true },
    }),
    prisma.booking.groupBy({
      by: ["courtId"],
      where: {
        paidAmount: { gt: 0 },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED] },
      },
      _sum: { convenienceFee: true },
    }),
  ]);

  const courtCounts = new Map(
    bookingGroups.map((group) => [group.courtId, group._count._all]),
  );
  const courtRevenue = new Map(
    confirmedGroups.map((group) => [
      group.courtId,
      safeNumber(group._sum.ownerPayout),
    ]),
  );
  const courtFees = new Map(
    feeGroups.map((group) => [
      group.courtId,
      safeNumber(group._sum.convenienceFee),
    ]),
  );

  return venues.map((venue) => {
    const bookingCount = venue.courts.reduce(
      (total, court) => total + (courtCounts.get(court.id) ?? 0),
      0,
    );
    const confirmedRevenue = venue.courts.reduce(
      (total, court) => total + (courtRevenue.get(court.id) ?? 0),
      0,
    );
    const platformFees = venue.courts.reduce(
      (total, court) => total + (courtFees.get(court.id) ?? 0),
      0,
    );

    return {
      id: venue.id,
      name: venue.name,
      city: venue.city,
      address: venue.address,
      amenities: venue.amenities,
      verificationStatus: venue.verificationStatus,
      verificationNotes: venue.verificationNotes,
      verifiedAt: venue.verifiedAt?.toISOString() ?? null,
      createdAt: venue.createdAt.toISOString(),
      owner: venue.owner,
      courts: venue.courts.map((court) => ({
        id: court.id,
        name: court.name,
        sportType: court.sportType,
        price: court.price,
      })),
      bookingCount,
      confirmedRevenue,
      platformFees,
    };
  });
}

function toAdminDisputeRow(
  dispute: Prisma.DisputeGetPayload<{
    include: {
      booking: { include: { court: { include: { venue: true } } } };
      player: { select: { id: true; name: true; phone: true } };
      resolvedBy: { select: { id: true; name: true } };
    };
  }>,
): AdminDisputeRow {
  return {
    id: dispute.id,
    status: dispute.status,
    reason: dispute.reason,
    details: dispute.details,
    resolution: dispute.resolution,
    resolutionNote: dispute.resolutionNote,
    refundAmount: dispute.refundAmount,
    createdAt: dispute.createdAt.toISOString(),
    updatedAt: dispute.updatedAt.toISOString(),
    resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
    booking: {
      id: dispute.booking.id,
      status: dispute.booking.status,
      paymentMode: dispute.booking.paymentMode,
      slotStart: dispute.booking.slotStart.toISOString(),
      slotEnd: dispute.booking.slotEnd.toISOString(),
      dateLabel: formatDateKeyLong(formatDateKey(dispute.booking.slotStart)),
      timeLabel: formatSlotRange(
        dispute.booking.slotStart,
        dispute.booking.slotEnd,
      ),
      paidAmount: dispute.booking.paidAmount,
      ownerPayout: dispute.booking.ownerPayout,
      convenienceFee: dispute.booking.convenienceFee,
      refundAmount: dispute.booking.refundAmount,
      refundStatus: dispute.booking.refundStatus,
      venueName: dispute.booking.court.venue.name,
      courtName: dispute.booking.court.name,
    },
    player: dispute.player,
    resolvedBy: dispute.resolvedBy,
  };
}

export async function getAdminDisputeRows(
  status: DisputeStatusValue | "ALL" = "ALL",
): Promise<AdminDisputeRow[]> {
  const disputes = await prisma.dispute.findMany({
    where: status === "ALL" ? {} : { status: status as DisputeStatus },
    include: {
      booking: {
        include: {
          court: {
            include: { venue: true },
          },
        },
      },
      player: {
        select: { id: true, name: true, phone: true },
      },
      resolvedBy: {
        select: { id: true, name: true },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });

  return disputes.map(toAdminDisputeRow);
}

export async function getAdminActionRows(limit = 10): Promise<AdminActionRow[]> {
  const actions = await prisma.adminAction.findMany({
    include: {
      admin: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return actions.map((action) => ({
    id: action.id,
    action: action.action,
    entityType: action.entityType,
    entityId: action.entityId,
    summary: action.summary,
    adminName: action.admin.name,
    createdAt: action.createdAt.toISOString(),
    createdAtLabel: `${formatRelativeDateKey(formatDateKey(action.createdAt))} · ${formatDateKeyLong(formatDateKey(action.createdAt))}`,
    metadata: action.metadata,
  }));
}

export interface AdminDailyRevenue {
  dateKey: string;
  label: string;
  bookings: number;
  gmv: number;
  platformRevenue: number;
}

export interface AdminOverviewData {
  venues: AdminVenueRow[];
  revenue: AdminRevenueData;
  disputes: AdminDisputeRow[];
  actions: AdminActionRow[];
  counts: {
    venues: number;
    verifiedVenues: number;
    pendingVenues: number;
    rejectedVenues: number;
    openDisputes: number;
    underReviewDisputes: number;
    resolvedDisputes: number;
  };
  today: {
    confirmedBookings: number;
    platformRevenue: number;
    directEntries: number;
  };
  dailyRevenue: AdminDailyRevenue[];
}

export async function getAdminOverviewData(
  now = new Date(),
): Promise<AdminOverviewData> {
  const todayKey = formatDateKey(now);
  const todayStart = new Date(`${todayKey}T00:00:00+05:30`);
  const tomorrowStart = new Date(todayStart.getTime() + DAY_MS);
  const sevenDaysAgo = new Date(now.getTime() - 6 * DAY_MS);

  const [
    venues,
    revenue,
    disputes,
    actions,
    disputeGroups,
    todayBookings,
    todayFees,
    recentWeek,
  ] = await Promise.all([
    getAdminVenueRows("ALL"),
    getAdminRevenueData(
      { status: "ALL", range: "all", query: "" },
      now,
    ),
    getAdminDisputeRows("ALL"),
    getAdminActionRows(8),
    prisma.dispute.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.booking.count({
      where: {
        status: BookingStatus.CONFIRMED,
        slotStart: { gte: todayStart, lt: tomorrowStart },
      },
    }),
    prisma.booking.aggregate({
      where: {
        paidAmount: { gt: 0 },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED] },
        createdAt: { gte: todayStart, lt: tomorrowStart },
      },
      _sum: { convenienceFee: true },
    }),
    prisma.booking.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        paidAmount: { gt: 0 },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED] },
      },
      select: {
        createdAt: true,
        paidAmount: true,
        convenienceFee: true,
      },
    }),
  ]);

  const disputeCounts = Object.fromEntries(
    disputeGroups.map((group) => [group.status, group._count._all]),
  );

  const dailyMap = new Map<string, AdminDailyRevenue>();

  for (let index = 6; index >= 0; index -= 1) {
    const dateKey = addDaysToDateKey(todayKey, -index);
    dailyMap.set(dateKey, {
      dateKey,
      label: formatRelativeDateKey(dateKey),
      bookings: 0,
      gmv: 0,
      platformRevenue: 0,
    });
  }

  for (const booking of recentWeek) {
    const dateKey = formatDateKey(booking.createdAt);
    const entry = dailyMap.get(dateKey);

    if (!entry) {
      continue;
    }

    entry.bookings += 1;
    entry.gmv += booking.paidAmount;
    entry.platformRevenue += booking.convenienceFee;
  }

  return {
    venues,
    revenue,
    disputes,
    actions,
    counts: {
      venues: venues.length,
      verifiedVenues: venues.filter(
        (venue) => venue.verificationStatus === "VERIFIED",
      ).length,
      pendingVenues: venues.filter(
        (venue) => venue.verificationStatus === "PENDING",
      ).length,
      rejectedVenues: venues.filter(
        (venue) => venue.verificationStatus === "REJECTED",
      ).length,
      openDisputes: disputeCounts.OPEN ?? 0,
      underReviewDisputes: disputeCounts.UNDER_REVIEW ?? 0,
      resolvedDisputes: disputeCounts.RESOLVED ?? 0,
    },
    today: {
      confirmedBookings: todayBookings,
      platformRevenue: safeNumber(todayFees._sum.convenienceFee),
      directEntries: revenue.rows.filter(
        (row) =>
          formatDateKey(new Date(row.slotStart)) === todayKey &&
          !row.isOnline &&
          row.status === "CONFIRMED",
      ).length,
    },
    dailyRevenue: Array.from(dailyMap.values()),
  };
}

export const ADMIN_REVENUE_STATUSES: RevenueStatusFilter[] = [
  "ALL",
  "CONFIRMED",
  "PENDING",
  "CANCELLED",
  "EXPIRED",
];

export const ADMIN_VERIFICATION_STATUSES: Array<
  VerificationStatusValue | "ALL"
> = ["ALL", "PENDING", "VERIFIED", "REJECTED"];

export const ADMIN_DISPUTE_STATUSES: Array<DisputeStatusValue | "ALL"> = [
  "ALL",
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "REJECTED",
];

export const ADMIN_VERIFICATION_ENUM = VerificationStatus;
