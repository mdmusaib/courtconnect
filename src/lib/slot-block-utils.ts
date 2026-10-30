import {
  slotStartForKey,
} from "@/lib/format";
import {
  OWNER_DAY_END_HOUR,
  OWNER_DAY_START_HOUR,
} from "@/lib/owner-constants";
import type { CalendarBlockItem, SlotBlockItem } from "@/lib/types";

/**
 * Returns day-of-week (0 = Sunday, 1 = Monday, ... 6 = Saturday) in Asia/Kolkata.
 */
export function getIstDayOfWeek(date: Date): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(date);

  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return map[weekday] ?? date.getDay();
}

/**
 * Returns "HH:mm" in Asia/Kolkata.
 */
export function getIstTimeStr(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const hour = parts.find((p) => p.type === "hour")?.value ?? "00";
  const minute = parts.find((p) => p.type === "minute")?.value ?? "00";

  return `${hour}:${minute}`;
}

/**
 * Converts "HH:mm" to minutes since midnight.
 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Projects SlotBlock items into concrete occurrences across the visible calendar days.
 */
export function projectBlocksToCalendar(
  blocks: SlotBlockItem[],
  days: string[],
): CalendarBlockItem[] {
  const results: CalendarBlockItem[] = [];

  for (const dayKey of days) {
    const dayDate = new Date(`${dayKey}T12:00:00+05:30`);
    const dayOfWeek = getIstDayOfWeek(dayDate);
    const dayStartBoundary = slotStartForKey(dayKey, OWNER_DAY_START_HOUR);
    const dayEndBoundary = slotStartForKey(dayKey, OWNER_DAY_END_HOUR);

    for (const block of blocks) {
      if (block.blockType === "PERMANENT_RECURRING") {
        if (!block.daysOfWeek.includes(dayOfWeek) || !block.startTime || !block.endTime) {
          continue;
        }

        const [startH, startM] = block.startTime.split(":").map(Number);
        const [endH, endM] = block.endTime.split(":").map(Number);

        const occurrenceStart = new Date(
          `${dayKey}T${String(startH).padStart(2, "0")}:${String(startM || 0).padStart(2, "0")}:00+05:30`,
        );
        const occurrenceEnd = new Date(
          `${dayKey}T${String(endH).padStart(2, "0")}:${String(endM || 0).padStart(2, "0")}:00+05:30`,
        );

        if (occurrenceEnd <= dayStartBoundary || occurrenceStart >= dayEndBoundary) {
          continue;
        }

        results.push({
          id: `${block.id}-${dayKey}`,
          blockId: block.id,
          courtId: block.courtId,
          courtName: block.courtName,
          venueId: block.venueId,
          venueName: block.venueName,
          blockType: block.blockType,
          reason: block.reason,
          slotStart: occurrenceStart.toISOString(),
          slotEnd: occurrenceEnd.toISOString(),
          startTime: block.startTime,
          endTime: block.endTime,
          startDate: block.startDate,
          endDate: block.endDate,
          daysOfWeek: block.daysOfWeek,
        });
      } else if (block.blockType === "TEMPORARY") {
        if (!block.startDate || !block.endDate) continue;

        const tempStart = new Date(block.startDate);
        const tempEnd = new Date(block.endDate);

        if (tempEnd <= dayStartBoundary || tempStart >= dayEndBoundary) {
          continue;
        }

        const occurrenceStart = tempStart < dayStartBoundary ? dayStartBoundary : tempStart;
        const occurrenceEnd = tempEnd > dayEndBoundary ? dayEndBoundary : tempEnd;

        results.push({
          id: `${block.id}-${dayKey}`,
          blockId: block.id,
          courtId: block.courtId,
          courtName: block.courtName,
          venueId: block.venueId,
          venueName: block.venueName,
          blockType: block.blockType,
          reason: block.reason,
          slotStart: occurrenceStart.toISOString(),
          slotEnd: occurrenceEnd.toISOString(),
          startTime: block.startTime,
          endTime: block.endTime,
          startDate: block.startDate,
          endDate: block.endDate,
          daysOfWeek: block.daysOfWeek,
        });
      }
    }
  }

  return results;
}
