import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { OwnerCalendar } from "@/components/owner/OwnerCalendar";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  addDaysToDateKey,
  dateFromKey,
  formatDateKey,
} from "@/lib/format";
import {
  getOwnerCalendarBookings,
  getOwnerCourtOptions,
} from "@/lib/owner-data";
import { requireRole } from "@/lib/session";
import { getOwnerSlotBlocks } from "@/lib/slot-blocks";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Owner calendar",
};

function isValidDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return formatDateKey(dateFromKey(value)) === value;
}

function weekStartKey(dateKey: string): string {
  const day = dateFromKey(dateKey).getUTCDay();
  return addDaysToDateKey(dateKey, -((day + 6) % 7));
}

export default async function OwnerCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const params = await searchParams;
  const todayKey = formatDateKey(new Date());
  const selectedDateKey =
    params.date && isValidDateKey(params.date) ? params.date : todayKey;
  const view = params.view === "week" ? "week" : "day";
  const days =
    view === "week"
      ? Array.from({ length: 7 }, (_, index) =>
          addDaysToDateKey(weekStartKey(selectedDateKey), index),
        )
      : [selectedDateKey];

  const owner = await requireRole(["OWNER", "ADMIN"], "owner");

  const [courts, bookings, slotBlocks] = await Promise.all([
    getOwnerCourtOptions(owner.id),
    getOwnerCalendarBookings(owner.id, days[0], days[days.length - 1]),
    getOwnerSlotBlocks(owner.id),
  ]);

  if (courts.length === 0) {
    return (
      <EmptyState
        title="No courts on this account"
        description="Add a venue and court before using the multi-court calendar."
        actionLabel="Back to overview"
        actionHref="/owner"
        variant="bookings"
      />
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/owner"
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:text-emerald-300"
          >
            <ArrowLeft className="size-3" />
            Owner overview
          </Link>
          <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight text-white">
            <CalendarDays className="size-4 text-emerald-400" />
            Multi-court calendar
          </h2>
        </div>
        <p className="max-w-md text-[11px] leading-relaxed text-slate-500">
          Online bookings stay emerald, walk-ins amber, phone bookings cyan,
          direct ground QR violet, and maintenance blocks rose.
        </p>
      </div>

      <OwnerCalendar
        courts={courts}
        bookings={bookings}
        slotBlocks={slotBlocks}
        days={days}
        selectedDateKey={selectedDateKey}
        todayKey={todayKey}
        nowIso={new Date().toISOString()}
        view={view}
      />
    </div>
  );
}
