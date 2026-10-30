import { BookingStatus, RefundStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { calculateRefundQuote } from "@/lib/cancellation";
import { sendBookingCancellationPush } from "@/lib/fcm";
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

async function releaseBookingLocks(
  courtId: string,
  slotStart: Date,
  slotEnd: Date,
  userId: string,
): Promise<number> {
  const slotStarts: Date[] = [];

  for (
    let cursor = new Date(slotStart);
    cursor < slotEnd;
    cursor = new Date(cursor.getTime() + HOUR_MS)
  ) {
    slotStarts.push(cursor);
  }

  const results = await Promise.allSettled(
    slotStarts.map((slot) => releaseLockSafely(courtId, slot, userId)),
  );

  return results.filter(
    (result) => result.status === "fulfilled" && result.value,
  ).length;
}

function cancellationResponse(
  booking: {
    id: string;
    status: BookingStatus;
    slotStart: Date;
    slotEnd: Date;
    refundAmount: number;
    refundStatus: RefundStatus;
    refundPolicy: string | null;
    cancelledAt: Date | null;
    cancellationReason: string | null;
  },
  options: { alreadyCancelled: boolean; lockReleased: number },
) {
  return {
    success: true,
    alreadyCancelled: options.alreadyCancelled,
    lockReleased: options.lockReleased,
    booking: {
      id: booking.id,
      status: booking.status,
      slotStart: booking.slotStart.toISOString(),
      slotEnd: booking.slotEnd.toISOString(),
      refundAmount: booking.refundAmount,
      refundStatus: booking.refundStatus,
      refundPolicy: booking.refundPolicy,
      cancelledAt: booking.cancelledAt?.toISOString() ?? null,
      cancellationReason: booking.cancellationReason,
    },
  };
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
    bookingId?: unknown;
    reason?: unknown;
  };
  const bookingId =
    typeof payload.bookingId === "string" ? payload.bookingId.trim() : "";
  const reason =
    typeof payload.reason === "string"
      ? payload.reason.trim().slice(0, 500)
      : "";

  if (!bookingId) {
    return jsonError("bookingId is required.", 400, "MISSING_BOOKING_ID");
  }

  const player = auth.user;

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      userId: true,
      courtId: true,
      slotStart: true,
      slotEnd: true,
      status: true,
      paidAmount: true,
      dueAmount: true,
      convenienceFee: true,
      ownerPayout: true,
      refundAmount: true,
      refundStatus: true,
      refundPolicy: true,
      cancelledAt: true,
      cancellationReason: true,
    },
  });

  if (!booking) {
    return jsonError("Booking not found.", 404, "BOOKING_NOT_FOUND");
  }

  if (!booking.userId) {
    return jsonError(
      "Walk-in, phone, and ground QR bookings are managed by the venue.",
      409,
      "DIRECT_BOOKING_NOT_CANCELLABLE",
    );
  }

  if (booking.userId !== player.id) {
    return jsonError(
      "This booking does not belong to your account.",
      403,
      "BOOKING_NOT_OWNED",
    );
  }

  if (booking.status === BookingStatus.CANCELLED) {
    const lockReleased = await releaseBookingLocks(
      booking.courtId,
      booking.slotStart,
      booking.slotEnd,
      player.id,
    );

    return NextResponse.json(
      cancellationResponse(booking, {
        alreadyCancelled: true,
        lockReleased,
      }),
    );
  }

  if (
    booking.status !== BookingStatus.PENDING &&
    booking.status !== BookingStatus.CONFIRMED
  ) {
    return NextResponse.json(
      {
        error: `A ${booking.status.toLowerCase()} booking cannot be cancelled.`,
        code: "BOOKING_NOT_CANCELLABLE",
      },
      { status: 409 },
    );
  }

  const quote = calculateRefundQuote(booking);

  if (!quote.canCancel) {
    return NextResponse.json(
      {
        error: quote.reason,
        code: "CANCELLATION_WINDOW_CLOSED",
        refund: quote,
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const cancellationReason =
    reason || "Player requested cancellation through the CourtConnect app.";

  try {
    const result = await prisma.booking.updateMany({
      where: {
        id: booking.id,
        userId: player.id,
        status: { in: [BookingStatus.PENDING, BookingStatus.CONFIRMED] },
      },
      data: {
        status: BookingStatus.CANCELLED,
        cancelledAt: now,
        cancellationReason,
        dueAmount: 0,
        refundAmount: quote.refundAmount,
        refundStatus:
          quote.refundAmount > 0 ? RefundStatus.PENDING : RefundStatus.NONE,
        refundPolicy: quote.policyLabel,
      },
    });

    if (result.count !== 1) {
      const latest = await prisma.booking.findUnique({
        where: { id: booking.id },
        select: {
          id: true,
          status: true,
          slotStart: true,
          slotEnd: true,
          refundAmount: true,
          refundStatus: true,
          refundPolicy: true,
          cancelledAt: true,
          cancellationReason: true,
        },
      });

      if (latest?.status === BookingStatus.CANCELLED) {
        const lockReleased = await releaseBookingLocks(
          booking.courtId,
          booking.slotStart,
          booking.slotEnd,
          player.id,
        );

        return NextResponse.json(
          cancellationResponse(latest, {
            alreadyCancelled: true,
            lockReleased,
          }),
        );
      }

      return jsonError(
        "Booking changed while the cancellation was being processed. Refresh and retry.",
        409,
        "BOOKING_CHANGED",
      );
    }
  } catch (error) {
    console.error("Booking cancellation failed:", error);
    return jsonError(
      "Could not cancel the booking. Please retry.",
      500,
      "CANCELLATION_FAILED",
    );
  }

  const lockReleased = await releaseBookingLocks(
    booking.courtId,
    booking.slotStart,
    booking.slotEnd,
    player.id,
  );

  const push = await sendBookingCancellationPush(booking.id).catch((error) => {
    console.error("Cancellation push failed:", error);
    return null;
  });

  return NextResponse.json({
    ...cancellationResponse(
      {
        ...booking,
        status: BookingStatus.CANCELLED,
        refundAmount: quote.refundAmount,
        refundStatus:
          quote.refundAmount > 0 ? RefundStatus.PENDING : RefundStatus.NONE,
        refundPolicy: quote.policyLabel,
        cancelledAt: now,
        cancellationReason,
      },
      {
        alreadyCancelled: false,
        lockReleased,
      },
    ),
    refund: quote,
    refundEtaLabel:
      quote.refundAmount > 0
        ? "Refunds usually reach the original UPI account in 3–5 business days."
        : null,
    push: push
      ? {
          configured: push.configured,
          sent: push.sent,
          skipped: push.skipped,
        }
      : null,
  });
}
