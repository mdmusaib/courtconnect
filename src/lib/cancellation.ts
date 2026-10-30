import type { BookingStatusValue } from "@/lib/types";

const HOUR_MS = 60 * 60 * 1000;

export interface RefundTier {
  minHours: number;
  percent: number;
  label: string;
  description: string;
}

/**
 * Player cancellation policy.
 *
 * The platform fee is never refunded because it covers payment verification and
 * processing. Only the court fee paid to the venue is eligible for a refund.
 */
export const REFUND_TIERS: RefundTier[] = [
  {
    minHours: 24,
    percent: 100,
    label: "24+ hours before start",
    description: "Full court fee refund",
  },
  {
    minHours: 6,
    percent: 75,
    label: "6–24 hours before start",
    description: "75% of the court fee refunded",
  },
  {
    minHours: 2,
    percent: 50,
    label: "2–6 hours before start",
    description: "50% of the court fee refunded",
  },
  {
    minHours: 0,
    percent: 0,
    label: "Under 2 hours before start",
    description: "No refund; the venue keeps the court fee",
  },
];

export const NON_REFUNDABLE_FEE_NOTE =
  "The ₹25 convenience fee is non-refundable once a payment is verified.";

export interface RefundQuoteInput {
  status: BookingStatusValue;
  userId: string | null;
  slotStart: Date;
  paidAmount: number;
  convenienceFee: number;
  ownerPayout: number;
}

export interface RefundQuote {
  canCancel: boolean;
  refundAmount: number;
  refundPercent: number;
  courtFeePaid: number;
  nonRefundableFee: number;
  hoursBeforeStart: number;
  tierLabel: string;
  policyLabel: string;
  reason: string;
  note: string;
}

export function getRefundTier(hoursBeforeStart: number): RefundTier {
  return (
    REFUND_TIERS.find((tier) => hoursBeforeStart >= tier.minHours) ??
    REFUND_TIERS[REFUND_TIERS.length - 1]
  );
}

export function calculateRefundQuote(
  booking: RefundQuoteInput,
  now = new Date(),
): RefundQuote {
  const msBeforeStart = booking.slotStart.getTime() - now.getTime();
  const hoursBeforeStart = msBeforeStart / HOUR_MS;
  const tier = getRefundTier(hoursBeforeStart);
  const courtFeePaid = Math.max(
    0,
    Math.min(
      Math.max(booking.paidAmount - booking.convenienceFee, 0),
      Math.max(booking.ownerPayout, 0),
    ),
  );
  const nonRefundableFee = Math.max(
    0,
    Math.min(booking.convenienceFee, booking.paidAmount),
  );
  const base: Pick<
    RefundQuote,
    | "courtFeePaid"
    | "nonRefundableFee"
    | "hoursBeforeStart"
    | "tierLabel"
    | "policyLabel"
    | "refundPercent"
  > = {
    courtFeePaid,
    nonRefundableFee,
    hoursBeforeStart: Math.max(0, hoursBeforeStart),
    tierLabel: tier.label,
    policyLabel: `${tier.percent}% court fee · ${tier.label}`,
    refundPercent: courtFeePaid > 0 ? tier.percent : 0,
  };

  if (booking.userId === null) {
    return {
      ...base,
      canCancel: false,
      refundAmount: 0,
      reason: "Direct venue entries are managed by the turf owner.",
      note: "Contact the venue directly to change a walk-in, phone, or ground QR booking.",
    };
  }

  if (booking.status === "CANCELLED") {
    return {
      ...base,
      canCancel: false,
      refundAmount: 0,
      reason: "This booking is already cancelled.",
      note: "The refund status is shown on your cancelled booking.",
    };
  }

  if (booking.status !== "PENDING" && booking.status !== "CONFIRMED") {
    return {
      ...base,
      canCancel: false,
      refundAmount: 0,
      reason: `A ${booking.status.toLowerCase()} booking cannot be cancelled online.`,
      note: "Contact the venue or platform support if you need help.",
    };
  }

  if (msBeforeStart <= 0) {
    return {
      ...base,
      canCancel: false,
      refundAmount: 0,
      reason: "This slot has already started.",
      note: "Cancellations must be requested before the court time begins.",
    };
  }

  if (booking.status === "PENDING" || booking.paidAmount <= 0) {
    return {
      ...base,
      canCancel: true,
      refundAmount: 0,
      refundPercent: 0,
      reason: "No payment has been collected yet.",
      note: "Cancelling releases the held slot immediately. There is no refund because nothing was paid.",
    };
  }

  const refundAmount = Math.round((courtFeePaid * tier.percent) / 100);

  return {
    ...base,
    canCancel: true,
    refundAmount,
    reason:
      refundAmount > 0
        ? `${tier.percent}% of the court fee is eligible for a refund.`
        : "No refund is due under the current cancellation window.",
    note:
      refundAmount > 0
        ? `Refund is calculated on the court fee only. ${NON_REFUNDABLE_FEE_NOTE}`
        : `The venue keeps the full court fee inside the 2-hour window. ${NON_REFUNDABLE_FEE_NOTE}`,
  };
}
