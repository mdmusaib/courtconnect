import { BlockType } from "@prisma/client";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number, code: string) {
  return NextResponse.json({ error: message, code }, { status });
}

async function requireOwnerAccess() {
  const auth = await requireApiUser(["OWNER", "ADMIN"]);

  if (!auth.user) {
    return { owner: null, response: auth.response } as const;
  }

  return { owner: auth.user, response: null } as const;
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export async function GET(request: Request) {
  const access = await requireOwnerAccess();

  if (!access.owner) {
    return access.response;
  }

  const owner = access.owner;

  const { searchParams } = new URL(request.url);
  const courtId = searchParams.get("courtId");

  const blocks = await prisma.slotBlock.findMany({
    where: {
      court: {
        ...(owner.role === "ADMIN" ? {} : { venue: { ownerId: owner.id } }),
        ...(courtId ? { id: courtId } : {}),
      },
    },
    include: {
      court: {
        select: {
          id: true,
          name: true,
          sportType: true,
          price: true,
          venue: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ blocks });
}

export async function POST(request: Request) {
  const access = await requireOwnerAccess();

  if (!access.owner) {
    return access.response;
  }

  const owner = access.owner;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400, "INVALID_JSON");
  }

  const payload = (body ?? {}) as {
    courtId?: unknown;
    blockType?: unknown;
    reason?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    daysOfWeek?: unknown;
  };

  const courtId = typeof payload.courtId === "string" ? payload.courtId.trim() : "";
  const blockType = payload.blockType === "PERMANENT_RECURRING" ? BlockType.PERMANENT_RECURRING : BlockType.TEMPORARY;
  const reason = typeof payload.reason === "string" ? payload.reason.trim() : "";

  if (!courtId) {
    return jsonError("courtId is required.", 400, "MISSING_COURT_ID");
  }

  if (!reason) {
    return jsonError("Reason is required.", 400, "MISSING_REASON");
  }

  // Ensure owner owns the court (platform admins may manage any venue).
  const court = await prisma.court.findFirst({
    where: {
      id: courtId,
      ...(owner.role === "ADMIN" ? {} : { venue: { ownerId: owner.id } }),
    },
  });

  if (!court) {
    return jsonError("Court not found or not owned by you.", 404, "COURT_NOT_FOUND");
  }

  if (blockType === BlockType.PERMANENT_RECURRING) {
    const startTime = typeof payload.startTime === "string" ? payload.startTime.trim() : "";
    const endTime = typeof payload.endTime === "string" ? payload.endTime.trim() : "";
    const rawDays = Array.isArray(payload.daysOfWeek) ? payload.daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
    const daysOfWeek = rawDays
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);

    if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
      return jsonError("startTime and endTime must be in 'HH:mm' format (e.g. '06:00').", 400, "INVALID_TIME_FORMAT");
    }

    if (startTime >= endTime) {
      return jsonError("startTime must be before endTime.", 400, "INVALID_TIME_RANGE");
    }

    if (daysOfWeek.length === 0) {
      return jsonError("Select at least one day of the week for recurring blocks.", 400, "INVALID_DAYS_OF_WEEK");
    }

    const created = await prisma.slotBlock.create({
      data: {
        courtId,
        blockType,
        reason,
        startTime,
        endTime,
        daysOfWeek: Array.from(new Set(daysOfWeek)).sort((a, b) => a - b),
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            sportType: true,
            price: true,
            venue: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, block: created }, { status: 201 });
  }

  // Temporary maintenance / custom block
  const startDateStr = typeof payload.startDate === "string" ? payload.startDate : "";
  const endDateStr = typeof payload.endDate === "string" ? payload.endDate : "";

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return jsonError("startDate and endDate must be valid ISO date strings.", 400, "INVALID_DATE");
  }

  if (startDate >= endDate) {
    return jsonError("startDate must be before endDate.", 400, "INVALID_DATE_RANGE");
  }

  const created = await prisma.slotBlock.create({
    data: {
      courtId,
      blockType,
      reason,
      startDate,
      endDate,
      daysOfWeek: [],
    },
    include: {
      court: {
        select: {
          id: true,
          name: true,
          sportType: true,
          price: true,
          venue: {
            select: { id: true, name: true },
          },
        },
      },
    },
  });

  return NextResponse.json({ success: true, block: created }, { status: 201 });
}

export async function DELETE(request: Request) {
  const access = await requireOwnerAccess();

  if (!access.owner) {
    return access.response;
  }

  const owner = access.owner;

  const { searchParams } = new URL(request.url);
  let id = searchParams.get("id");

  if (!id) {
    try {
      const body = (await request.json()) as { id?: string };
      id = body?.id ?? null;
    } catch {
      // ignore JSON parse error if body is empty
    }
  }

  if (!id) {
    return jsonError("Block id is required.", 400, "MISSING_ID");
  }

  const block = await prisma.slotBlock.findFirst({
    where: {
      id,
      court: {
        ...(owner.role === "ADMIN" ? {} : { venue: { ownerId: owner.id } }),
      },
    },
  });

  if (!block) {
    return jsonError("Block not found or not owned by you.", 404, "NOT_FOUND");
  }

  await prisma.slotBlock.delete({
    where: { id },
  });

  return NextResponse.json({ success: true, deletedId: id });
}

export async function PUT(request: Request) {
  const access = await requireOwnerAccess();

  if (!access.owner) {
    return access.response;
  }

  const owner = access.owner;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body.", 400, "INVALID_JSON");
  }

  const payload = (body ?? {}) as {
    id?: unknown;
    courtId?: unknown;
    blockType?: unknown;
    reason?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    daysOfWeek?: unknown;
  };

  const id = typeof payload.id === "string" ? payload.id.trim() : "";
  if (!id) {
    return jsonError("id is required to update a block.", 400, "MISSING_ID");
  }

  const existing = await prisma.slotBlock.findFirst({
    where: {
      id,
      court: {
        ...(owner.role === "ADMIN" ? {} : { venue: { ownerId: owner.id } }),
      },
    },
  });

  if (!existing) {
    return jsonError("Block not found or not owned by you.", 404, "NOT_FOUND");
  }

  const blockType = payload.blockType === "PERMANENT_RECURRING" ? BlockType.PERMANENT_RECURRING : BlockType.TEMPORARY;
  const reason = typeof payload.reason === "string" && payload.reason.trim() ? payload.reason.trim() : existing.reason;

  if (blockType === BlockType.PERMANENT_RECURRING) {
    const startTime = typeof payload.startTime === "string" ? payload.startTime.trim() : existing.startTime || "06:00";
    const endTime = typeof payload.endTime === "string" ? payload.endTime.trim() : existing.endTime || "08:00";
    const rawDays = Array.isArray(payload.daysOfWeek) ? payload.daysOfWeek : existing.daysOfWeek;
    const daysOfWeek = rawDays
      .map((d) => Number(d))
      .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);

    if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
      return jsonError("startTime and endTime must be in 'HH:mm' format.", 400, "INVALID_TIME_FORMAT");
    }

    if (startTime >= endTime) {
      return jsonError("startTime must be before endTime.", 400, "INVALID_TIME_RANGE");
    }

    const updated = await prisma.slotBlock.update({
      where: { id },
      data: {
        blockType,
        reason,
        startTime,
        endTime,
        startDate: null,
        endDate: null,
        daysOfWeek: Array.from(new Set(daysOfWeek)).sort((a, b) => a - b),
      },
      include: {
        court: {
          select: {
            id: true,
            name: true,
            sportType: true,
            price: true,
            venue: { select: { id: true, name: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, block: updated });
  }

  const startDateStr = typeof payload.startDate === "string" ? payload.startDate : existing.startDate?.toISOString() ?? "";
  const endDateStr = typeof payload.endDate === "string" ? payload.endDate : existing.endDate?.toISOString() ?? "";

  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return jsonError("startDate and endDate must be valid dates.", 400, "INVALID_DATE");
  }

  if (startDate >= endDate) {
    return jsonError("startDate must be before endDate.", 400, "INVALID_DATE_RANGE");
  }

  const updated = await prisma.slotBlock.update({
    where: { id },
    data: {
      blockType,
      reason,
      startDate,
      endDate,
      startTime: null,
      endTime: null,
      daysOfWeek: [],
    },
    include: {
      court: {
        select: {
          id: true,
          name: true,
          sportType: true,
          price: true,
          venue: { select: { id: true, name: true } },
        },
      },
    },
  });

  return NextResponse.json({ success: true, block: updated });
}
