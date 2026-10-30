"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Lock,
  Plus,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import dynamic from "next/dynamic";
import { getBookingSourceTheme } from "@/components/owner/BookingSourceTag";
import type { OwnerQuickEntryInitialSlot } from "@/components/OwnerQuickEntryModal";
import type { OwnerBlockInitialData } from "@/components/owner/OwnerBlockModal";

const OwnerQuickEntryModal = dynamic(
  () => import("@/components/OwnerQuickEntryModal").then((mod) => mod.OwnerQuickEntryModal),
  { ssr: false },
);

const OwnerBlockModal = dynamic(
  () => import("@/components/owner/OwnerBlockModal").then((mod) => mod.OwnerBlockModal),
  { ssr: false },
);

const OwnerBlockDetailsModal = dynamic(
  () => import("@/components/owner/OwnerBlockDetailsModal").then((mod) => mod.OwnerBlockDetailsModal),
  { ssr: false },
);
import {
  addDaysToDateKey,
  dateFromKey,
  formatDateKey,
  formatDateKeyLong,
  formatDateLong,
  formatINR,
  formatRelativeDateKey,
  formatSlotRange,
} from "@/lib/format";
import {
  OWNER_DAY_END_HOUR,
  OWNER_DAY_START_HOUR,
} from "@/lib/owner-constants";
import { projectBlocksToCalendar } from "@/lib/slot-block-utils";
import type {
  CalendarBlockItem,
  OwnerBookingRow,
  OwnerCourtOption,
  SlotBlockItem,
} from "@/lib/types";

const HOURS = Array.from(
  { length: OWNER_DAY_END_HOUR - OWNER_DAY_START_HOUR },
  (_, index) => OWNER_DAY_START_HOUR + index,
);
const DAY_ROW_HEIGHT = 68;
const WEEK_ROW_HEIGHT = 56;
const DIRECT_MODES = ["OFFLINE_CASH", "PHONE_BOOKING", "MANUAL_EXTERNAL"];

type CalendarView = "day" | "week";

interface DragSelection {
  isDragging: boolean;
  courtId: string;
  dateKey: string;
  startHour: number;
  currentHour: number;
}

function getIstMinutes(iso: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));

  const valueFor = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  return valueFor("hour") * 60 + valueFor("minute");
}

function itemMetrics(
  slotStart: string,
  slotEnd: string,
  rowHeight: number,
): { top: number; height: number } {
  const dayStart = OWNER_DAY_START_HOUR * 60;
  const dayEnd = OWNER_DAY_END_HOUR * 60;
  const start = Math.min(
    Math.max(getIstMinutes(slotStart), dayStart),
    dayEnd,
  );
  const end = Math.min(
    Math.max(getIstMinutes(slotEnd), dayStart),
    dayEnd,
  );
  const height = Math.max(((end - start) / 60) * rowHeight, 40);

  return {
    top: ((start - dayStart) / 60) * rowHeight,
    height,
  };
}

function bookingName(booking: OwnerBookingRow): string {
  if (booking.status === "MAINTENANCE") {
    return "Court blocked";
  }

  if (booking.customerName) {
    return booking.customerName;
  }

  if (booking.paymentMode === "OFFLINE_CASH") return "Walk-in player";
  if (booking.paymentMode === "PHONE_BOOKING") return "Phone booking";
  if (booking.paymentMode === "MANUAL_EXTERNAL") return "Ground QR player";

  return "Online player";
}

function bookingRange(booking: OwnerBookingRow): string {
  return formatSlotRange(
    new Date(booking.slotStart),
    new Date(booking.slotEnd),
  );
}

function hourLabel(hour: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: true,
  }).format(new Date(`2000-01-01T${String(hour).padStart(2, "0")}:00:00+05:30`));
}

function rowBackground(rowHeight: number): string {
  return `repeating-linear-gradient(to bottom, rgba(255,255,255,0.055) 0, rgba(255,255,255,0.055) 1px, transparent 1px, transparent ${rowHeight}px)`;
}

function layoutDayBookings(dayBookings: OwnerBookingRow[]): {
  placed: Array<{ booking: OwnerBookingRow; lane: number }>;
  laneCount: number;
} {
  const sorted = [...dayBookings].sort(
    (a, b) =>
      new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime() ||
      a.courtName.localeCompare(b.courtName),
  );
  const laneEnds: number[] = [];
  const placed = sorted.map((booking) => {
    const start = new Date(booking.slotStart).getTime();
    const end = new Date(booking.slotEnd).getTime();
    let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);

    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }

    return { booking, lane };
  });

  return { placed, laneCount: Math.max(1, laneEnds.length) };
}

export function OwnerCalendar({
  courts,
  bookings,
  slotBlocks = [],
  days,
  selectedDateKey,
  todayKey,
  nowIso,
  view,
}: {
  courts: OwnerCourtOption[];
  bookings: OwnerBookingRow[];
  slotBlocks?: SlotBlockItem[];
  days: string[];
  selectedDateKey: string;
  todayKey: string;
  nowIso: string;
  view: CalendarView;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [courtFilter, setCourtFilter] = useState("ALL");

  // Quick Entry Modal
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);
  const [initialSlot, setInitialSlot] = useState<OwnerQuickEntryInitialSlot>();

  // Slot Block Modal (Create / Edit)
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockInitialData, setBlockInitialData] = useState<OwnerBlockInitialData>();

  // Block Details Modal (1-Tap Unblock / Edit Trigger)
  const [blockDetailsModalOpen, setBlockDetailsModalOpen] = useState(false);
  const [selectedBlockForDetails, setSelectedBlockForDetails] = useState<CalendarBlockItem | null>(null);

  // Drag-to-select range state
  const [dragSelection, setDragSelection] = useState<DragSelection | null>(null);

  const visibleCourts =
    courtFilter === "ALL"
      ? courts
      : courts.filter((court) => court.id === courtFilter);

  const filteredBookings = useMemo(
    () =>
      courtFilter === "ALL"
        ? bookings
        : bookings.filter((booking) => booking.courtId === courtFilter),
    [bookings, courtFilter],
  );

  // Project blocks to visible days
  const calendarBlocks = useMemo(
    () => projectBlocksToCalendar(slotBlocks, days),
    [slotBlocks, days],
  );

  const filteredBlocks = useMemo(
    () =>
      courtFilter === "ALL"
        ? calendarBlocks
        : calendarBlocks.filter((b) => b.courtId === courtFilter),
    [calendarBlocks, courtFilter],
  );

  const confirmedBookings = filteredBookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );
  const directBookings = confirmedBookings.filter((booking) =>
    DIRECT_MODES.includes(booking.paymentMode),
  );
  const recurringBlocks = filteredBlocks.filter(
    (b) => b.blockType === "PERMANENT_RECURRING",
  );
  const maintenanceBlocks = filteredBlocks.filter(
    (b) => b.blockType === "TEMPORARY",
  );

  const rangeLabel =
    view === "week" && days.length > 1
      ? `${formatDateLong(dateFromKey(days[0]))} – ${formatDateLong(dateFromKey(days[days.length - 1]))}`
      : formatDateKeyLong(selectedDateKey);

  function navigate(nextDateKey: string, nextView: CalendarView = view) {
    startTransition(() => {
      router.push(
        `${pathname}?view=${nextView}&date=${encodeURIComponent(nextDateKey)}`,
      );
    });
  }

  function openQuickEntry(slot?: OwnerQuickEntryInitialSlot) {
    const fallbackCourtId = visibleCourts[0]?.id ?? courts[0]?.id;
    const fallbackDateKey = selectedDateKey;

    setInitialSlot(
      slot ?? {
        courtId: fallbackCourtId,
        dateKey: fallbackDateKey,
      },
    );
    setQuickEntryOpen(true);
  }

  function openBlockModal(initial?: OwnerBlockInitialData) {
    const fallbackCourtId = visibleCourts[0]?.id ?? courts[0]?.id;
    const fallbackDateKey = selectedDateKey;

    setBlockInitialData(
      initial ?? {
        courtId: fallbackCourtId,
        dateKey: fallbackDateKey,
        startHour: 6,
        endHour: 8,
      },
    );
    setBlockModalOpen(true);
  }

  function handleSelectBlock(block: CalendarBlockItem) {
    setSelectedBlockForDetails(block);
    setBlockDetailsModalOpen(true);
  }

  function handleEditFromDetails(blockItem: SlotBlockItem) {
    setBlockInitialData({
      editingBlock: blockItem,
      courtId: blockItem.courtId,
    });
    setBlockModalOpen(true);
  }

  // Drag handling
  function handleStartDrag(courtId: string, dateKey: string, hour: number) {
    setDragSelection({
      isDragging: true,
      courtId,
      dateKey,
      startHour: hour,
      currentHour: hour,
    });
  }

  function handleHoverDrag(courtId: string, dateKey: string, hour: number) {
    if (dragSelection?.isDragging && dragSelection.courtId === courtId && dragSelection.dateKey === dateKey) {
      setDragSelection((prev) => (prev ? { ...prev, currentHour: hour } : null));
    }
  }

  function handleEndDrag() {
    if (!dragSelection) return;

    const start = Math.min(dragSelection.startHour, dragSelection.currentHour);
    const end = Math.max(dragSelection.startHour, dragSelection.currentHour) + 1;

    openBlockModal({
      courtId: dragSelection.courtId,
      dateKey: dragSelection.dateKey,
      startHour: start,
      endHour: end,
    });

    setDragSelection(null);
  }

  return (
    <>
      <section className="rounded-3xl border border-white/8 bg-surface/70 p-4 sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
              Unified multi-court calendar
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Every court, one timeline.
            </h1>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
              Drag across a time range or tap any slot to set recurring memberships or maintenance blocks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-white/8 bg-white/[0.03] p-1">
              {(["day", "week"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => navigate(selectedDateKey, option)}
                  aria-pressed={view === option}
                  className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold capitalize transition-all duration-100 active:scale-95 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                    view === option
                      ? "bg-emerald-400 text-oled"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>

            {/* Block Slot / Schedule Modal Button */}
            <button
              type="button"
              onClick={() => openBlockModal()}
              disabled={courts.length === 0}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-indigo-500/40 bg-indigo-500/15 px-3.5 text-xs font-semibold text-indigo-200 transition-all duration-100 active:scale-95 ease-out hover:bg-indigo-500/25 hover:border-indigo-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <Lock className="size-3.5 text-indigo-400" />
              Block slot / Schedule
            </button>

            {/* Quick Entry Button */}
            <button
              type="button"
              onClick={() => openQuickEntry()}
              disabled={courts.length === 0}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-emerald-400 px-3.5 text-xs font-semibold text-oled transition-all duration-100 active:scale-95 ease-out hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-3.5" strokeWidth={2.6} />
              Quick entry
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-white/6 pt-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-xl border border-white/8">
              <button
                type="button"
                onClick={() =>
                  navigate(addDaysToDateKey(selectedDateKey, view === "week" ? -7 : -1))
                }
                className="grid size-9 place-items-center border-r border-white/8 bg-white/[0.03] text-slate-400 transition-all duration-100 active:scale-90 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400/70"
                aria-label={view === "week" ? "Previous week" : "Previous day"}
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate(todayKey)}
                className="bg-white/[0.03] px-3 text-[11px] font-semibold text-slate-300 transition-all duration-100 active:scale-95 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400/70"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() =>
                  navigate(addDaysToDateKey(selectedDateKey, view === "week" ? 7 : 1))
                }
                className="grid size-9 place-items-center border-l border-white/8 bg-white/[0.03] text-slate-400 transition-all duration-100 active:scale-90 hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400/70"
                aria-label={view === "week" ? "Next week" : "Next day"}
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-white">{rangeLabel}</p>
                {isPending && (
                  <Loader2 className="size-3.5 animate-spin text-emerald-400" />
                )}
              </div>
              <p className="text-[10px] text-slate-500">
                {view === "week"
                  ? "Mon–Sun week · courts remain color-coded"
                  : formatRelativeDateKey(selectedDateKey)}
              </p>
            </div>

            <label className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[10px] text-slate-400">
              <CalendarDays className="size-3.5 text-cyan-300" />
              <span className="sr-only">Jump to date</span>
              <input
                type="date"
                value={selectedDateKey}
                onChange={(event) => {
                  if (event.target.value) {
                    navigate(event.target.value);
                  }
                }}
                className="w-[7.4rem] bg-transparent text-[10px] text-slate-200 outline-none [color-scheme:dark]"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              active={courtFilter === "ALL"}
              label="All courts"
              onClick={() => setCourtFilter("ALL")}
            />
            {courts.map((court) => (
              <FilterChip
                key={court.id}
                active={courtFilter === court.id}
                label={court.name}
                onClick={() => setCourtFilter(court.id)}
              />
            ))}
          </div>
        </div>

        {/* Legend bar */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/6 pt-3">
          <LegendDot color="bg-emerald-400" label="Online" />
          <LegendDot color="bg-amber-400" label="Walk-in" />
          <LegendDot color="bg-cyan-400" label="Phone" />
          <LegendDot color="bg-violet-400" label="Ground QR" />
          <LegendDot color="bg-indigo-400" label="🔒 Membership Block" />
          <LegendDot color="bg-rose-400" label="🛠️ Maintenance" />
          <span className="hidden h-3 w-px bg-white/10 sm:block" />
          <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
            <ShieldCheck className="size-3 text-emerald-400" />
            ₹0 fee direct entries
          </span>
          <span className="ml-auto text-[10px] text-slate-500">
            {confirmedBookings.length} booked · {directBookings.length} direct · {recurringBlocks.length} recurring · {maintenanceBlocks.length} maintenance
          </span>
        </div>
      </section>

      {/* Main Calendar View */}
      <section
        className="mt-4 overflow-hidden rounded-3xl border border-white/8 bg-surface/60 select-none"
        onMouseLeave={() => setDragSelection(null)}
      >
        <div className="flex items-center justify-between gap-3 border-b border-white/6 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-emerald-400" />
            <p className="text-xs font-semibold text-white">
              {view === "day" ? "Court columns" : "Week timeline"}
            </p>
            <span className="hidden text-[10px] text-slate-500 sm:inline">
              6:00 AM – 11:00 PM IST
            </span>
          </div>
          <p className="text-[10px] text-slate-500">
            {view === "day"
              ? `${visibleCourts.length} court${visibleCourts.length === 1 ? "" : "s"}`
              : `${days.length} days`}
          </p>
        </div>

        {visibleCourts.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-sm font-semibold text-white">No courts found.</p>
            <p className="mt-1 text-xs text-slate-500">
              Add a court to this venue before using the calendar.
            </p>
          </div>
        ) : view === "day" ? (
          <DayCalendar
            days={[selectedDateKey]}
            courts={visibleCourts}
            bookings={filteredBookings}
            blocks={filteredBlocks}
            todayKey={todayKey}
            nowIso={nowIso}
            dragSelection={dragSelection}
            onStartDrag={handleStartDrag}
            onHoverDrag={handleHoverDrag}
            onEndDrag={handleEndDrag}
            onSelectBlock={handleSelectBlock}
          />
        ) : (
          <WeekCalendar
            days={days}
            courts={visibleCourts}
            bookings={filteredBookings}
            blocks={filteredBlocks}
            todayKey={todayKey}
            nowIso={nowIso}
            dragSelection={dragSelection}
            onStartDrag={handleStartDrag}
            onHoverDrag={handleHoverDrag}
            onEndDrag={handleEndDrag}
            onSelectBlock={handleSelectBlock}
          />
        )}
      </section>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] text-slate-500">
        <p className="inline-flex items-center gap-1.5">
          <Sparkles className="size-3 text-indigo-400" />
          Click or drag across hours to set recurring membership or maintenance blocks. Tap any blocked slot to unblock.
        </p>
        <Link
          href="/owner"
          className="font-medium text-slate-400 transition hover:text-emerald-300"
        >
          Back to overview
        </Link>
      </div>

      {/* Quick Entry Modal */}
      <OwnerQuickEntryModal
        courts={courts}
        todayKey={todayKey}
        open={quickEntryOpen}
        onOpenChange={setQuickEntryOpen}
        initialSlot={initialSlot}
      />

      {/* Slot Block Modal */}
      <OwnerBlockModal
        courts={courts}
        todayKey={todayKey}
        open={blockModalOpen}
        onOpenChange={setBlockModalOpen}
        initialData={blockInitialData}
        onOpenQuickEntry={() => {
          if (blockInitialData?.courtId) {
            openQuickEntry({
              courtId: blockInitialData.courtId,
              dateKey: blockInitialData.dateKey || selectedDateKey,
              hour: blockInitialData.startHour || 6,
            });
          } else {
            openQuickEntry();
          }
        }}
      />

      {/* Block Details Modal (1-Tap Unblock) */}
      <OwnerBlockDetailsModal
        block={selectedBlockForDetails}
        open={blockDetailsModalOpen}
        onOpenChange={setBlockDetailsModalOpen}
        onEdit={handleEditFromDetails}
      />
    </>
  );
}

function DayCalendar({
  days,
  courts,
  bookings,
  blocks,
  todayKey,
  nowIso,
  dragSelection,
  onStartDrag,
  onHoverDrag,
  onEndDrag,
  onSelectBlock,
}: {
  days: string[];
  courts: OwnerCourtOption[];
  bookings: OwnerBookingRow[];
  blocks: CalendarBlockItem[];
  todayKey: string;
  nowIso: string;
  dragSelection: DragSelection | null;
  onStartDrag: (courtId: string, dateKey: string, hour: number) => void;
  onHoverDrag: (courtId: string, dateKey: string, hour: number) => void;
  onEndDrag: () => void;
  onSelectBlock: (block: CalendarBlockItem) => void;
}) {
  const dateKey = days[0];
  const isToday = dateKey === todayKey;
  const nowTop = ((getIstMinutes(nowIso) - OWNER_DAY_START_HOUR * 60) / 60) * DAY_ROW_HEIGHT;
  const showNow = isToday && nowTop >= 0 && nowTop <= HOURS.length * DAY_ROW_HEIGHT;

  const byCourtBookings = new Map<string, OwnerBookingRow[]>();
  for (const booking of bookings) {
    if (formatDateKey(new Date(booking.slotStart)) !== dateKey) continue;
    const list = byCourtBookings.get(booking.courtId) ?? [];
    list.push(booking);
    byCourtBookings.set(booking.courtId, list);
  }

  const byCourtBlocks = new Map<string, CalendarBlockItem[]>();
  for (const block of blocks) {
    if (formatDateKey(new Date(block.slotStart)) !== dateKey) continue;
    const list = byCourtBlocks.get(block.courtId) ?? [];
    list.push(block);
    byCourtBlocks.set(block.courtId, list);
  }

  return (
    <div className="overflow-x-auto" onMouseUp={onEndDrag}>
      <div
        className="grid min-w-max"
        style={{
          gridTemplateColumns: `4.5rem repeat(${courts.length}, minmax(180px, 1fr))`,
        }}
      >
        <div className="sticky left-0 z-20 border-b border-r border-white/6 bg-[#101827] px-2 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            IST
          </p>
        </div>
        {courts.map((court) => (
          <div
            key={court.id}
            className="border-b border-r border-white/6 bg-[#101827] px-3 py-3 last:border-r-0"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-white">
                  {court.name}
                </p>
                <p className="truncate text-[9px] text-slate-500">
                  {court.venueName} · {formatINR(court.price)}/hr
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/8 bg-white/[0.03] px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-slate-500">
                {court.sportType}
              </span>
            </div>
          </div>
        ))}

        <div
          className="relative sticky left-0 z-20 border-r border-white/6 bg-[#0f1724]"
          style={{ height: HOURS.length * DAY_ROW_HEIGHT }}
        >
          {HOURS.map((hour, index) => (
            <div
              key={hour}
              className="absolute inset-x-0 border-t border-white/[0.045] px-2 pt-1"
              style={{ top: index * DAY_ROW_HEIGHT }}
            >
              <p className="text-[9px] font-medium text-slate-500">
                {hourLabel(hour)}
              </p>
            </div>
          ))}
          {showNow && (
            <span
              className="absolute right-0 z-30 -translate-y-1/2 rounded-l-full bg-rose-400 px-1 py-0.5 text-[7px] font-bold text-oled"
              style={{ top: nowTop }}
            >
              NOW
            </span>
          )}
        </div>

        {courts.map((court) => {
          const courtBookings = byCourtBookings.get(court.id) ?? [];
          const courtBlocks = byCourtBlocks.get(court.id) ?? [];

          const isCourtDragging =
            dragSelection?.isDragging &&
            dragSelection.courtId === court.id &&
            dragSelection.dateKey === dateKey;

          let dragTop = 0;
          let dragHeight = 0;
          if (isCourtDragging) {
            const minH = Math.min(dragSelection.startHour, dragSelection.currentHour);
            const maxH = Math.max(dragSelection.startHour, dragSelection.currentHour);
            dragTop = (minH - OWNER_DAY_START_HOUR) * DAY_ROW_HEIGHT;
            dragHeight = (maxH - minH + 1) * DAY_ROW_HEIGHT;
          }

          return (
            <div
              key={court.id}
              className="relative border-r border-white/6 last:border-r-0 select-none"
              style={{
                height: HOURS.length * DAY_ROW_HEIGHT,
                backgroundImage: rowBackground(DAY_ROW_HEIGHT),
              }}
            >
              {/* Hour slot targets */}
              {HOURS.map((hour, index) => (
                <div
                  key={hour}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onStartDrag(court.id, dateKey, hour);
                  }}
                  onMouseEnter={() => onHoverDrag(court.id, dateKey, hour)}
                  className="group absolute inset-x-0 z-0 border-t border-white/[0.025] cursor-pointer transition hover:bg-indigo-400/[0.05]"
                  style={{
                    top: index * DAY_ROW_HEIGHT,
                    height: DAY_ROW_HEIGHT,
                  }}
                >
                  <Plus className="absolute right-1.5 top-1.5 size-3 text-slate-600/0 transition group-hover:text-indigo-400/80" />
                </div>
              ))}

              {/* Drag selection overlay preview */}
              {isCourtDragging && (
                <div
                  className="pointer-events-none absolute inset-x-1 z-30 rounded-xl border-2 border-dashed border-indigo-400/90 bg-indigo-500/25 backdrop-blur-[1px]"
                  style={{ top: dragTop, height: dragHeight }}
                >
                  <span className="absolute left-2 top-2 rounded bg-indigo-600 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white shadow">
                    Drag to block
                  </span>
                </div>
              )}

              {/* Existing Bookings */}
              {courtBookings.map((booking) => {
                const theme = getBookingSourceTheme(
                  booking.status,
                  booking.paymentMode,
                );
                const Icon = theme.icon;
                const metrics = itemMetrics(booking.slotStart, booking.slotEnd, DAY_ROW_HEIGHT);

                return (
                  <div
                    key={booking.id}
                    title={`${theme.label} · ${bookingName(booking)} · ${bookingRange(booking)}`}
                    className={`absolute inset-x-1 z-10 overflow-hidden rounded-xl border p-1.5 shadow-[0_8px_26px_-18px_rgba(0,0,0,0.9)] ${theme.blockClass}`}
                    style={metrics}
                  >
                    <div className="flex items-center gap-1">
                      <Icon className="size-2.5 shrink-0" />
                      <span className="truncate text-[8px] font-bold uppercase tracking-[0.1em]">
                        {theme.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[10px] font-semibold leading-tight">
                      {bookingName(booking)}
                    </p>
                    <p className="truncate text-[8px] opacity-75">
                      {bookingRange(booking)}
                    </p>
                    {metrics.height >= 80 && (
                      <p className="mt-0.5 truncate text-[8px] font-medium opacity-80">
                        {booking.status === "MAINTENANCE"
                          ? "Blocked"
                          : formatINR(booking.ownerPayout)}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Render SlotBlocks (Recurring & Temporary) */}
              {courtBlocks.map((block) => {
                const metrics = itemMetrics(block.slotStart, block.slotEnd, DAY_ROW_HEIGHT);
                const isRecurring = block.blockType === "PERMANENT_RECURRING";

                return (
                  <div
                    key={block.id}
                    onClick={() => onSelectBlock(block)}
                    title={`Tap to manage: ${block.reason} (${formatSlotRange(new Date(block.slotStart), new Date(block.slotEnd))})`}
                    className={`group absolute inset-x-1 z-20 cursor-pointer overflow-hidden rounded-xl border p-2 transition hover:scale-[1.01] hover:brightness-110 ${
                      isRecurring
                        ? "border-indigo-500/60 bg-gradient-to-br from-[#1b1c3e] via-[#1e1b4b] to-[#2d1b4e] text-indigo-100 shadow-[0_8px_26px_-18px_rgba(99,102,241,0.7)] ring-1 ring-indigo-500/40"
                        : "border-rose-500/70 bg-[repeating-linear-gradient(45deg,rgba(225,29,72,0.24),rgba(225,29,72,0.24)_10px,rgba(225,29,72,0.08)_10px,rgba(225,29,72,0.08)_20px)] bg-[#2b1016] text-rose-100 shadow-[0_8px_26px_-18px_rgba(244,63,94,0.7)] ring-1 ring-rose-500/40"
                    }`}
                    style={metrics}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1 min-w-0">
                        {isRecurring ? (
                          <Lock className="size-2.5 shrink-0 text-indigo-400" />
                        ) : (
                          <Wrench className="size-2.5 shrink-0 text-rose-400" />
                        )}
                        <span
                          className={`truncate text-[8px] font-extrabold uppercase tracking-[0.1em] ${
                            isRecurring ? "text-indigo-300" : "text-rose-300"
                          }`}
                        >
                          {isRecurring ? "🔒 Membership Block" : "🛠️ Maintenance"}
                        </span>
                      </div>
                      <span className="hidden font-mono text-[7px] text-white/60 group-hover:inline">
                        1-Tap Unblock
                      </span>
                    </div>

                    <p className="mt-0.5 truncate text-[10px] font-bold leading-tight text-white">
                      {block.reason}
                    </p>

                    <p className="truncate text-[8px] opacity-80">
                      {formatSlotRange(new Date(block.slotStart), new Date(block.slotEnd))}
                    </p>
                  </div>
                );
              })}

              {showNow && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20 border-t border-rose-400/70"
                  style={{ top: nowTop }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekCalendar({
  days,
  courts,
  bookings,
  blocks,
  todayKey,
  nowIso,
  dragSelection,
  onStartDrag,
  onHoverDrag,
  onEndDrag,
  onSelectBlock,
}: {
  days: string[];
  courts: OwnerCourtOption[];
  bookings: OwnerBookingRow[];
  blocks: CalendarBlockItem[];
  todayKey: string;
  nowIso: string;
  dragSelection: DragSelection | null;
  onStartDrag: (courtId: string, dateKey: string, hour: number) => void;
  onHoverDrag: (courtId: string, dateKey: string, hour: number) => void;
  onEndDrag: () => void;
  onSelectBlock: (block: CalendarBlockItem) => void;
}) {
  const nowTop = ((getIstMinutes(nowIso) - OWNER_DAY_START_HOUR * 60) / 60) * WEEK_ROW_HEIGHT;
  const showNow = nowTop >= 0 && nowTop <= HOURS.length * WEEK_ROW_HEIGHT;
  const byDayBookings = new Map<string, OwnerBookingRow[]>();
  const byDayBlocks = new Map<string, CalendarBlockItem[]>();
  const weekColumnWidth = Math.max(170, courts.length * 64);

  for (const booking of bookings) {
    const key = formatDateKey(new Date(booking.slotStart));
    const list = byDayBookings.get(key) ?? [];
    list.push(booking);
    byDayBookings.set(key, list);
  }

  for (const block of blocks) {
    const key = formatDateKey(new Date(block.slotStart));
    const list = byDayBlocks.get(key) ?? [];
    list.push(block);
    byDayBlocks.set(key, list);
  }

  return (
    <div className="overflow-x-auto" onMouseUp={onEndDrag}>
      <div
        className="grid min-w-max"
        style={{
          gridTemplateColumns: `4.5rem repeat(${days.length}, minmax(${weekColumnWidth}px, 1fr))`,
        }}
      >
        <div className="sticky left-0 z-20 border-b border-r border-white/6 bg-[#101827] px-2 py-3">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            IST
          </p>
        </div>
        {days.map((dayKey) => {
          const dayBookings = byDayBookings.get(dayKey) ?? [];
          const dayBlocks = byDayBlocks.get(dayKey) ?? [];
          const isToday = dayKey === todayKey;

          return (
            <div
              key={dayKey}
              className={`border-b border-r border-white/6 px-2.5 py-2.5 last:border-r-0 ${
                isToday ? "bg-emerald-400/[0.06]" : "bg-[#101827]"
              }`}
            >
              <p
                className={`text-[9px] font-semibold uppercase tracking-[0.14em] ${
                  isToday ? "text-emerald-300" : "text-slate-500"
                }`}
              >
                {formatRelativeDateKey(dayKey)}
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-white">
                {formatDateKeyLong(dayKey)}
              </p>
              <p className="mt-0.5 text-[9px] text-slate-500">
                {dayBookings.length} booking{dayBookings.length === 1 ? "" : "s"} · {dayBlocks.length} block{dayBlocks.length === 1 ? "" : "s"}
              </p>
            </div>
          );
        })}

        <div
          className="relative sticky left-0 z-20 border-r border-white/6 bg-[#0f1724]"
          style={{ height: HOURS.length * WEEK_ROW_HEIGHT }}
        >
          {HOURS.map((hour, index) => (
            <div
              key={hour}
              className="absolute inset-x-0 border-t border-white/[0.045] px-2 pt-1"
              style={{ top: index * WEEK_ROW_HEIGHT }}
            >
              <p className="text-[9px] font-medium text-slate-500">
                {hourLabel(hour)}
              </p>
            </div>
          ))}
        </div>

        {days.map((dayKey) => {
          const dayBookings = byDayBookings.get(dayKey) ?? [];
          const dayBlocks = byDayBlocks.get(dayKey) ?? [];
          const isToday = dayKey === todayKey;
          const { placed, laneCount } = layoutDayBookings(dayBookings);

          const isDayDragging =
            dragSelection?.isDragging && dragSelection.dateKey === dayKey;

          let dragTop = 0;
          let dragHeight = 0;
          if (isDayDragging) {
            const minH = Math.min(dragSelection.startHour, dragSelection.currentHour);
            const maxH = Math.max(dragSelection.startHour, dragSelection.currentHour);
            dragTop = (minH - OWNER_DAY_START_HOUR) * WEEK_ROW_HEIGHT;
            dragHeight = (maxH - minH + 1) * WEEK_ROW_HEIGHT;
          }

          return (
            <div
              key={dayKey}
              className={`relative border-r border-white/6 last:border-r-0 select-none ${
                isToday ? "bg-emerald-400/[0.025]" : ""
              }`}
              style={{
                height: HOURS.length * WEEK_ROW_HEIGHT,
                backgroundImage: rowBackground(WEEK_ROW_HEIGHT),
              }}
            >
              {HOURS.map((hour, index) => (
                <div
                  key={hour}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onStartDrag(courts[0]?.id ?? "", dayKey, hour);
                  }}
                  onMouseEnter={() =>
                    onHoverDrag(courts[0]?.id ?? "", dayKey, hour)
                  }
                  className="group absolute inset-x-0 z-0 border-t border-white/[0.025] cursor-pointer transition hover:bg-indigo-400/[0.05]"
                  style={{
                    top: index * WEEK_ROW_HEIGHT,
                    height: WEEK_ROW_HEIGHT,
                  }}
                >
                  <Plus className="absolute right-1.5 top-1.5 size-3 text-slate-600/0 transition group-hover:text-indigo-400/80" />
                </div>
              ))}

              {isDayDragging && (
                <div
                  className="pointer-events-none absolute inset-x-1 z-30 rounded-lg border-2 border-dashed border-indigo-400/90 bg-indigo-500/25 backdrop-blur-[1px]"
                  style={{ top: dragTop, height: dragHeight }}
                >
                  <span className="absolute left-2 top-2 rounded bg-indigo-600 px-1 py-0.5 text-[7px] font-bold uppercase text-white shadow">
                    Drag to block
                  </span>
                </div>
              )}

              {placed.map(({ booking, lane }) => {
                const theme = getBookingSourceTheme(
                  booking.status,
                  booking.paymentMode,
                );
                const Icon = theme.icon;
                const metrics = itemMetrics(booking.slotStart, booking.slotEnd, WEEK_ROW_HEIGHT);
                const laneWidth = 100 / Math.max(1, laneCount);

                return (
                  <div
                    key={booking.id}
                    title={`${theme.label} · ${booking.courtName} · ${bookingName(booking)} · ${bookingRange(booking)}`}
                    className={`absolute z-10 overflow-hidden rounded-lg border p-1 shadow-[0_8px_26px_-18px_rgba(0,0,0,0.9)] ${theme.blockClass}`}
                    style={{
                      ...metrics,
                      left: `calc(${lane * laneWidth}% + 2px)`,
                      width: `calc(${laneWidth}% - 4px)`,
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <Icon className="size-2.5 shrink-0" />
                      <span className="truncate text-[7px] font-bold uppercase tracking-[0.08em]">
                        {theme.label}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[8px] font-semibold leading-tight">
                      {booking.courtName}
                    </p>
                    {laneCount <= 2 && (
                      <p className="truncate text-[7px] opacity-75">
                        {bookingName(booking)}
                      </p>
                    )}
                  </div>
                );
              })}

              {/* Render SlotBlocks in Week View */}
              {dayBlocks.map((block) => {
                const metrics = itemMetrics(block.slotStart, block.slotEnd, WEEK_ROW_HEIGHT);
                const isRecurring = block.blockType === "PERMANENT_RECURRING";

                return (
                  <div
                    key={block.id}
                    onClick={() => onSelectBlock(block)}
                    title={`Tap to manage: ${block.reason} · ${block.courtName}`}
                    className={`group absolute inset-x-1 z-20 cursor-pointer overflow-hidden rounded-lg border p-1 transition hover:scale-[1.01] hover:brightness-110 ${
                      isRecurring
                        ? "border-indigo-500/60 bg-gradient-to-br from-[#1b1c3e] via-[#1e1b4b] to-[#2d1b4e] text-indigo-100 shadow-[0_8px_26px_-18px_rgba(99,102,241,0.7)] ring-1 ring-indigo-500/40"
                        : "border-rose-500/70 bg-[repeating-linear-gradient(45deg,rgba(225,29,72,0.24),rgba(225,29,72,0.24)_10px,rgba(225,29,72,0.08)_10px,rgba(225,29,72,0.08)_20px)] bg-[#2b1016] text-rose-100 shadow-[0_8px_26px_-18px_rgba(244,63,94,0.7)] ring-1 ring-rose-500/40"
                    }`}
                    style={metrics}
                  >
                    <div className="flex items-center gap-1">
                      {isRecurring ? (
                        <Lock className="size-2.5 shrink-0 text-indigo-400" />
                      ) : (
                        <Wrench className="size-2.5 shrink-0 text-rose-400" />
                      )}
                      <span
                        className={`truncate text-[7px] font-extrabold uppercase tracking-[0.08em] ${
                          isRecurring ? "text-indigo-300" : "text-rose-300"
                        }`}
                      >
                        {isRecurring ? "🔒 Membership" : "🛠️ Maintenance"}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-[8px] font-bold leading-tight text-white">
                      {block.courtName}: {block.reason}
                    </p>
                  </div>
                );
              })}

              {isToday && showNow && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-20 border-t border-rose-400/70"
                  style={{ top: nowTop }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-2.5 py-1 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
        active
          ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
          : "border-white/8 bg-white/[0.025] text-slate-500 hover:border-white/15 hover:text-slate-300"
      }`}
    >
      {label}
    </button>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-400">
      <span className={`size-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}
