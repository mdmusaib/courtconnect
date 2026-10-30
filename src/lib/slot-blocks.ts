import { BlockType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { SlotBlockItem } from "@/lib/types";
import {
  getIstDayOfWeek,
  getIstTimeStr,
  timeToMinutes,
} from "@/lib/slot-block-utils";

export {
  getIstDayOfWeek,
  getIstTimeStr,
  timeToMinutes,
  projectBlocksToCalendar,
} from "@/lib/slot-block-utils";

/**
 * Fetches all slot blocks for a venue owner.
 */
export async function getOwnerSlotBlocks(ownerId: string): Promise<SlotBlockItem[]> {
  const blocks = await prisma.slotBlock.findMany({
    where: {
      court: { venue: { ownerId } },
    },
    include: {
      court: {
        include: {
          venue: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return blocks.map((b) => ({
    id: b.id,
    courtId: b.courtId,
    courtName: b.court.name,
    venueId: b.court.venue.id,
    venueName: b.court.venue.name,
    blockType: b.blockType,
    reason: b.reason,
    startTime: b.startTime,
    endTime: b.endTime,
    startDate: b.startDate?.toISOString() ?? null,
    endDate: b.endDate?.toISOString() ?? null,
    daysOfWeek: b.daysOfWeek,
    createdAt: b.createdAt.toISOString(),
  }));
}

/**
 * Checks if a proposed time slot (slotStart to slotEnd) conflicts with any active SlotBlock.
 */
export async function checkSlotBlockConflict(
  courtId: string,
  slotStart: Date,
  slotEnd: Date,
): Promise<{ blocked: boolean; reason?: string; blockType?: string }> {
  const blocks = await prisma.slotBlock.findMany({
    where: { courtId },
  });

  const slotDayOfWeek = getIstDayOfWeek(slotStart);
  const slotStartMinutes = timeToMinutes(getIstTimeStr(slotStart));
  const slotEndMinutes = timeToMinutes(getIstTimeStr(slotEnd));

  for (const block of blocks) {
    if (block.blockType === BlockType.TEMPORARY) {
      if (block.startDate && block.endDate) {
        if (block.startDate < slotEnd && block.endDate > slotStart) {
          return {
            blocked: true,
            reason: block.reason,
            blockType: block.blockType,
          };
        }
      }
    } else if (block.blockType === BlockType.PERMANENT_RECURRING) {
      if (
        block.daysOfWeek.includes(slotDayOfWeek) &&
        block.startTime &&
        block.endTime
      ) {
        const bStartMin = timeToMinutes(block.startTime);
        const bEndMin = timeToMinutes(block.endTime);

        if (slotStartMinutes < bEndMin && slotEndMinutes > bStartMin) {
          return {
            blocked: true,
            reason: block.reason,
            blockType: block.blockType,
          };
        }
      }
    }
  }

  return { blocked: false };
}
