import {
  AdminActionType,
  RefundStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { createAdminAction, requireAdminSession } from "@/lib/admin-actions";
import { formatINR } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400, "INVALID_JSON");
  }

  const payload = (body ?? {}) as {
    bookingId?: unknown;
    action?: unknown;
  };
  const bookingId =
    typeof payload.bookingId === "string" ? payload.bookingId.trim() : "";
  const action = payload.action === "FAIL" ? "FAIL" : "PROCESS";

  if (!bookingId) {
    return jsonError("bookingId is required.", 400, "MISSING_BOOKING_ID");
  }

  let admin;

  try {
    admin = await requireAdminSession();
  } catch {
    return jsonError(
      "Platform admin access is required.",
      403,
      "ADMIN_ACCESS_REQUIRED",
    );
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: {
      id: true,
      status: true,
      refundAmount: true,
      refundStatus: true,
      refundPolicy: true,
    },
  });

  if (!booking) {
    return jsonError("Booking not found.", 404, "BOOKING_NOT_FOUND");
  }

  if (booking.refundStatus !== RefundStatus.PENDING) {
    return jsonError(
      "This booking has no pending refund.",
      409,
      "NO_PENDING_REFUND",
    );
  }

  if (booking.refundAmount <= 0) {
    return jsonError(
      "This booking has a zero refund amount.",
      409,
      "ZERO_REFUND",
    );
  }

  const now = new Date();

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const next = await tx.booking.update({
        where: { id: booking.id },
        data:
          action === "FAIL"
            ? { refundStatus: RefundStatus.FAILED }
            : { refundStatus: RefundStatus.PROCESSED, refundedAt: now },
        select: {
          id: true,
          refundAmount: true,
          refundStatus: true,
          refundedAt: true,
        },
      });

      await createAdminAction(tx, {
        adminId: admin.id,
        action: AdminActionType.REFUND_PROCESSED,
        entityType: "BOOKING",
        entityId: booking.id,
        summary:
          action === "FAIL"
            ? `Marked ${formatINR(booking.refundAmount)} refund as failed for booking ${booking.id}.`
            : `Marked ${formatINR(booking.refundAmount)} refund as processed for booking ${booking.id}.`,
        metadata: {
          previousRefundStatus: booking.refundStatus,
          refundPolicy: booking.refundPolicy,
          action,
        },
      });

      return next;
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: updated.id,
        refundAmount: updated.refundAmount,
        refundStatus: updated.refundStatus,
        refundedAt: updated.refundedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("Refund status update failed:", error);
    return jsonError(
      "The refund status could not be updated.",
      500,
      "REFUND_UPDATE_FAILED",
    );
  }
}
