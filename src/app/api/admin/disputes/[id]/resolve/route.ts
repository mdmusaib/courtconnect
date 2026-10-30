import {
  AdminActionType,
  DisputeResolution,
  DisputeStatus,
  RefundStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { createAdminAction, requireAdminSession } from "@/lib/admin-actions";
import { formatINR } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResolutionInput = "FULL_REFUND" | "PARTIAL_REFUND" | "REJECTED";

const RESOLUTIONS = new Set<ResolutionInput>([
  "FULL_REFUND",
  "PARTIAL_REFUND",
  "REJECTED",
]);

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, code }, { status });
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400, "INVALID_JSON");
  }

  const payload = (body ?? {}) as {
    resolution?: unknown;
    refundAmount?: unknown;
    note?: unknown;
  };
  const resolution =
    typeof payload.resolution === "string" &&
    RESOLUTIONS.has(payload.resolution as ResolutionInput)
      ? (payload.resolution as ResolutionInput)
      : null;
  const requestedAmount =
    typeof payload.refundAmount === "number" &&
    Number.isFinite(payload.refundAmount)
      ? Math.round(payload.refundAmount)
      : null;
  const note =
    typeof payload.note === "string"
      ? payload.note.trim().slice(0, 600)
      : "";

  if (!resolution) {
    return jsonError(
      "Choose a valid dispute resolution.",
      400,
      "INVALID_RESOLUTION",
    );
  }

  if (resolution === "REJECTED" && note.length < 5) {
    return jsonError(
      "Add a short note explaining the rejection.",
      400,
      "RESOLUTION_NOTE_REQUIRED",
    );
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

  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: {
      booking: {
        select: {
          id: true,
          status: true,
          paidAmount: true,
          convenienceFee: true,
          refundAmount: true,
          refundStatus: true,
        },
      },
    },
  });

  if (!dispute) {
    return jsonError("Dispute not found.", 404, "DISPUTE_NOT_FOUND");
  }

  if (
    dispute.status === DisputeStatus.RESOLVED ||
    dispute.status === DisputeStatus.REJECTED
  ) {
    return jsonError(
      "This dispute is already closed. Reopen it before changing the outcome.",
      409,
      "DISPUTE_ALREADY_CLOSED",
    );
  }

  const maxRefund = Math.max(
    0,
    Math.round(dispute.booking.paidAmount - dispute.booking.convenienceFee),
  );

  let refundAmount = 0;

  if (resolution === "FULL_REFUND") {
    refundAmount = maxRefund;
  } else if (resolution === "PARTIAL_REFUND") {
    if (
      requestedAmount === null ||
      requestedAmount <= 0 ||
      requestedAmount > maxRefund
    ) {
      return jsonError(
        `Enter a partial refund between ₹1 and ${formatINR(maxRefund)}.`,
        400,
        "INVALID_REFUND_AMOUNT",
      );
    }

    refundAmount = requestedAmount;
  }

  const nextDisputeStatus =
    resolution === "REJECTED"
      ? DisputeStatus.REJECTED
      : DisputeStatus.RESOLVED;
  const nextResolution =
    resolution === "FULL_REFUND"
      ? DisputeResolution.FULL_REFUND
      : resolution === "PARTIAL_REFUND"
        ? DisputeResolution.PARTIAL_REFUND
        : DisputeResolution.REJECTED;
  const resolutionLabels: Record<ResolutionInput, string> = {
    FULL_REFUND: "Full court-fee refund",
    PARTIAL_REFUND: "Partial court-fee refund",
    REJECTED: "Dispute rejected",
  };
  const now = new Date();

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: nextDisputeStatus,
          resolution: nextResolution,
          resolutionNote:
            note ||
            (resolution === "REJECTED"
              ? "Rejected after platform review."
              : `${resolutionLabels[resolution]} approved by the platform admin.`),
          refundAmount,
          resolvedById: admin.id,
          resolvedAt: now,
        },
      });

      if (refundAmount > 0) {
        await tx.booking.update({
          where: { id: dispute.booking.id },
          data: {
            refundAmount,
            refundStatus: RefundStatus.PROCESSED,
            refundPolicy: `Admin dispute override · ${resolutionLabels[resolution]}`,
            refundedAt: now,
          },
        });
      }

      await createAdminAction(tx, {
        adminId: admin.id,
        action:
          refundAmount > 0
            ? AdminActionType.REFUND_OVERRIDDEN
            : AdminActionType.DISPUTE_RESOLVED,
        entityType: "DISPUTE",
        entityId: dispute.id,
        summary:
          refundAmount > 0
            ? `${resolutionLabels[resolution]} of ${formatINR(refundAmount)} on booking ${dispute.booking.id}.`
            : `Rejected dispute ${dispute.id} for booking ${dispute.booking.id}.`,
        metadata: {
          bookingId: dispute.booking.id,
          previousDisputeStatus: dispute.status,
          previousBookingRefundAmount: dispute.booking.refundAmount,
          previousBookingRefundStatus: dispute.booking.refundStatus,
          resolution,
          refundAmount,
          note: note || null,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      dispute: {
        id: result.id,
        status: result.status,
        resolution: result.resolution,
        resolutionNote: result.resolutionNote,
        refundAmount: result.refundAmount,
        resolvedAt: result.resolvedAt?.toISOString() ?? null,
      },
      bookingRefund: {
        refundAmount,
        refundStatus:
          refundAmount > 0 ? RefundStatus.PROCESSED : dispute.booking.refundStatus,
      },
    });
  } catch (error) {
    console.error("Dispute resolution failed:", error);
    return jsonError(
      "The dispute override could not be saved.",
      500,
      "DISPUTE_RESOLUTION_FAILED",
    );
  }
}
