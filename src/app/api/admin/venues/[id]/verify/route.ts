import {
  AdminActionType,
  VerificationStatus,
} from "@prisma/client";
import { NextResponse } from "next/server";
import { createAdminAction, requireAdminSession } from "@/lib/admin-actions";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    action?: unknown;
    notes?: unknown;
  };
  const action = payload.action === "REJECT" ? "REJECT" : "VERIFY";
  const notes =
    typeof payload.notes === "string"
      ? payload.notes.trim().slice(0, 500)
      : "";

  if (action === "REJECT" && notes.length < 5) {
    return jsonError(
      "Add a short reason so the owner knows what to fix.",
      400,
      "REJECTION_REASON_REQUIRED",
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

  const venue = await prisma.venue.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      verificationStatus: true,
      verificationNotes: true,
    },
  });

  if (!venue) {
    return jsonError("Venue not found.", 404, "VENUE_NOT_FOUND");
  }

  const nextStatus =
    action === "REJECT"
      ? VerificationStatus.REJECTED
      : VerificationStatus.VERIFIED;
  const verifiedAt =
    action === "VERIFY" ? new Date() : null;
  const verificationNotes =
    notes ||
    (action === "VERIFY"
      ? "Owner documents and ground details verified by the platform team."
      : venue.verificationNotes);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.venue.update({
        where: { id: venue.id },
        data: {
          verificationStatus: nextStatus,
          verificationNotes,
          verifiedAt,
        },
        select: {
          id: true,
          name: true,
          verificationStatus: true,
          verificationNotes: true,
          verifiedAt: true,
        },
      });

      await createAdminAction(tx, {
        adminId: admin.id,
        action:
          action === "REJECT"
            ? AdminActionType.VENUE_REJECTED
            : AdminActionType.VENUE_VERIFIED,
        entityType: "VENUE",
        entityId: venue.id,
        summary:
          action === "REJECT"
            ? `Rejected ${venue.name}: ${notes}`
            : `Verified ${venue.name} for public listing.`,
        metadata: {
          previousStatus: venue.verificationStatus,
          previousNotes: venue.verificationNotes,
          notes: verificationNotes,
        },
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      venue: {
        ...result,
        verifiedAt: result.verifiedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error("Venue verification update failed:", error);
    return jsonError(
      "The venue verification could not be updated.",
      500,
      "VENUE_VERIFICATION_FAILED",
    );
  }
}
