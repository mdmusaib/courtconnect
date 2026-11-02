"use client";

import { useEffect, useMemo, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useBookingSession } from "@/lib/booking-store";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Info,
  Loader2,
  LockKeyhole,
  MoonStar,
  Plus,
  Sun,
  Sunrise,
  Sunset,
  Timer,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { SportIcon } from "@/components/venue/SportVisual";
import { formatINR, formatTime } from "@/lib/format";
import { calculateBookingPrice } from "@/lib/pricing";
import type {
  DaySchedule,
  SlotBooking,
  SlotOption,
  VenueBookingData,
} from "@/lib/types";

type SlotState = "available" | "booked" | "locked" | "maintenance" | "past";
type PeriodId = "morning" | "afternoon" | "evening" | "late";

const DURATION_OPTIONS = [1, 2, 3];

const PERIOD_DEFINITIONS = [
  {
    id: "morning",
    title: "Morning",
    range: "6 AM – 12 PM",
    icon: Sunrise,
    accent: "text-amber-600",
    chip: "border-amber-200 bg-amber-50",
  },
  {
    id: "afternoon",
    title: "Afternoon",
    range: "12 PM – 4 PM",
    icon: Sun,
    accent: "text-sky-600",
    chip: "border-sky-200 bg-sky-50",
  },
  {
    id: "evening",
    title: "Evening Peak",
    range: "4 PM – 10 PM",
    icon: Sunset,
    accent: "text-orange-600",
    chip: "border-orange-200 bg-orange-50",
  },
  {
    id: "late",
    title: "Late Night",
    range: "10 PM – 11 PM",
    icon: MoonStar,
    accent: "text-violet-600",
    chip: "border-violet-200 bg-violet-50",
  },
] satisfies {
  id: PeriodId;
  title: string;
  range: string;
  icon: typeof Sunrise;
  accent: string;
  chip: string;
}[];

const hourFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  hourCycle: "h23",
});

function getSlotHour(slotStartIso: string): number {
  return Number(hourFormatter.format(new Date(slotStartIso)));
}

function getPeriodId(slotStartIso: string): PeriodId {
  const hour = getSlotHour(slotStartIso);

  if (hour < 12) return "morning";
  if (hour < 16) return "afternoon";
  if (hour < 22) return "evening";
  return "late";
}

function stateLabel(state: SlotState): string {
  switch (state) {
    case "booked":
      return "Booked";
    case "locked":
      return "On hold";
    case "maintenance":
      return "Maintenance";
    case "past":
      return "Past";
    default:
      return "Available";
  }
}

function durationLabel(hours: number): string {
  return hours === 1 ? "1 Hour" : `${hours} Hours`;
}

function shortDuration(hours: number): string {
  return `${hours} ${hours === 1 ? "hr" : "hrs"}`;
}

export function SlotRangeSelector({
  venue,
  days,
  bookings,
  initialCourtId,
  initialDateKey,
  nowIso,
}: {
  venue: VenueBookingData;
  days: DaySchedule[];
  bookings: SlotBooking[];
  initialCourtId?: string;
  initialDateKey?: string;
  nowIso: string;
}) {
  const router = useRouter();
  const initialDay =
    days.find((day) => day.key === initialDateKey) ?? days[0];
  const initialCourt =
    venue.courts.find((court) => court.id === initialCourtId) ??
    venue.courts[0];

  const session = useBookingSession();

  // Instant back-navigation restore from client cache
  const restoredCourtId =
    session.venueId === venue.id && session.courtId && venue.courts.some((c) => c.id === session.courtId)
      ? session.courtId
      : (initialCourt?.id ?? "");

  const restoredDateKey =
    session.venueId === venue.id && session.dateKey && days.some((d) => d.key === session.dateKey)
      ? session.dateKey
      : (initialDay?.key ?? "");

  const [selectedDateKey, setSelectedDateKey] = useState(restoredDateKey);
  const [selectedCourtId, setSelectedCourtId] = useState(restoredCourtId);
  const [selectedStartIso, setSelectedStartIso] = useState<string | null>(
    session.venueId === venue.id ? session.startIso : null,
  );
  const [requestedHours, setRequestedHours] = useState(
    session.venueId === venue.id ? session.hours : 1,
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [, startTransition] = useTransition();

  // React 19 Optimistic UI: Highlights selected slot range with 0ms visual lag
  const [optimisticSelection, setOptimisticSelection] = useOptimistic(
    { startIso: selectedStartIso, hours: requestedHours },
    (_state, update: { startIso: string | null; hours: number }) => update,
  );

  const effectiveStartIso = optimisticSelection.startIso;
  const effectiveHours = optimisticSelection.hours;

  const selectedDay =
    days.find((day) => day.key === selectedDateKey) ?? days[0];
  const selectedCourt =
    venue.courts.find((court) => court.id === selectedCourtId) ??
    venue.courts[0];
  const daySlots = selectedDay?.slots ?? [];
  const now = new Date(nowIso).getTime();

  // Sync state back to booking session store for instant back navigation
  useEffect(() => {
    session.setSession({
      venueId: venue.id,
      courtId: selectedCourtId,
      dateKey: selectedDateKey,
      startIso: selectedStartIso,
      hours: requestedHours,
    });
  }, [venue.id, selectedCourtId, selectedDateKey, selectedStartIso, requestedHours]);

  const bookingStatusByKey = useMemo(() => {
    const map = new Map<string, string>();

    for (const booking of bookings) {
      map.set(`${booking.courtId}|${booking.slotStart}`, booking.status);
    }

    return map;
  }, [bookings]);

  function getSlotState(slot: SlotOption): SlotState {
    const status = bookingStatusByKey.get(
      `${selectedCourtId}|${slot.startIso}`,
    );

    if (status === "CONFIRMED") return "booked";
    if (status === "PENDING") return "locked";
    if (status === "MAINTENANCE") return "maintenance";
    if (new Date(slot.startIso).getTime() <= now) return "past";

    return "available";
  }

  const startIndex = effectiveStartIso
    ? daySlots.findIndex((slot) => slot.startIso === effectiveStartIso)
    : -1;

  let contiguousHours = 0;

  if (startIndex >= 0) {
    while (
      startIndex + contiguousHours < daySlots.length &&
      getSlotState(daySlots[startIndex + contiguousHours]) === "available"
    ) {
      contiguousHours += 1;
    }
  }

  const rangeHours =
    startIndex >= 0 ? Math.min(effectiveHours, contiguousHours) : 0;
  const rangeSlots =
    startIndex >= 0
      ? daySlots.slice(startIndex, startIndex + rangeHours)
      : [];
  const rangeStart = rangeSlots[0];
  const rangeEndSlot = rangeSlots[rangeSlots.length - 1];
  const rangeEndIso = rangeEndSlot?.endIso;
  const firstBlockedSlot =
    startIndex >= 0 ? daySlots[startIndex + contiguousHours] : undefined;
  const firstBlockedState = firstBlockedSlot
    ? getSlotState(firstBlockedSlot)
    : null;
  const isRangeReady = Boolean(
    selectedCourt && rangeStart && rangeEndIso && rangeHours > 0,
  );
  const pricing = isRangeReady
    ? calculateBookingPrice(
        (selectedCourt?.price ?? 0) * rangeHours,
        "FULL_ONLINE",
      )
    : null;

  // Next.js Route Prefetching: Warm route chunks ahead of user taps.
  // `/checkout/[bookingId]` is dynamic and its id is only created by the
  // POST /api/bookings hold, so we pre-prefetch the checkout segment shell
  // (layout + loading skeleton + shared chunks) and the bookings list so
  // navigation renders instantly the moment the hold resolves.
  useEffect(() => {
    if (isRangeReady) {
      router.prefetch("/checkout/session-warmup");
      router.prefetch("/my-bookings");
    }
  }, [isRangeReady, router]);

  function clearSelection() {
    startTransition(() => {
      setOptimisticSelection({ startIso: null, hours: 1 });
    });
    setSelectedStartIso(null);
    setRequestedHours(1);
    setRangeError(null);
    setSubmitError(null);
    session.clearSlot();
  }

  function handleDateChange(dateKey: string) {
    if (dateKey === selectedDateKey) return;
    setSelectedDateKey(dateKey);
    clearSelection();
  }

  function handleCourtChange(courtId: string) {
    if (courtId === selectedCourtId) return;
    setSelectedCourtId(courtId);
    clearSelection();
  }

  function handleSlotSelect(slot: SlotOption) {
    const index = daySlots.findIndex(
      (candidate) => candidate.startIso === slot.startIso,
    );

    if (index < 0 || getSlotState(slot) !== "available") {
      return;
    }

    setSubmitError(null);
    setRangeError(null);

    let nextStartIso = slot.startIso;
    let nextHours = 1;

    if (startIndex < 0 || index < startIndex) {
      nextStartIso = slot.startIso;
      nextHours = 1;
    } else if (index === startIndex) {
      nextStartIso = slot.startIso;
      nextHours = 1;
    } else {
      const requested = index - startIndex + 1;

      if (requested > contiguousHours) {
        const blocker = daySlots[startIndex + contiguousHours];
        const blockerTime = blocker
          ? formatTime(new Date(blocker.startIso))
          : "The next hour";

        setRangeError(
          `That range would cross ${blockerTime} (${stateLabel(
            blocker ? getSlotState(blocker) : "past",
          ).toLowerCase()}). This start can run for up to ${shortDuration(
            contiguousHours,
          )}.`,
        );
        return;
      }

      nextStartIso = selectedStartIso ?? slot.startIso;
      nextHours = requested;
    }

    // Instantly reflect in optimistic UI with zero delay
    startTransition(() => {
      setOptimisticSelection({ startIso: nextStartIso, hours: nextHours });
    });
    setSelectedStartIso(nextStartIso);
    setRequestedHours(nextHours);
  }

  function handleDurationSelect(hours: number) {
    if (startIndex < 0) return;

    setSubmitError(null);

    if (hours > contiguousHours) {
      const blocker = daySlots[startIndex + contiguousHours];
      const blockerTime = blocker
        ? formatTime(new Date(blocker.startIso))
        : "the next hour";

      setRangeError(
        `${durationLabel(hours)} would overlap ${blockerTime}, which is ${
          blocker ? stateLabel(getSlotState(blocker)).toLowerCase() : "unavailable"
        }. Choose up to ${shortDuration(contiguousHours)}.`,
      );
      return;
    }

    startTransition(() => {
      setOptimisticSelection({ startIso: effectiveStartIso, hours });
    });
    setRequestedHours(hours);
    setRangeError(null);
  }

  async function handleProceed() {
    if (
      !selectedCourt ||
      !rangeStart ||
      !rangeEndIso ||
      isSubmitting ||
      !isRangeReady
    ) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: selectedCourt.id,
          slotStart: rangeStart.startIso,
          slotEnd: rangeEndIso,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        checkoutUrl?: string;
        booking?: { id: string };
      };

      if (!response.ok) {
        setSubmitError(
          payload.error ?? "Could not hold this range. Please try again.",
        );

        if (response.status === 409) {
          setSelectedStartIso(null);
          setRequestedHours(1);
          router.refresh();
        }

        return;
      }

      router.push(
        payload.checkoutUrl ??
          (payload.booking ? `/checkout/${payload.booking.id}` : "/my-bookings"),
      );
    } catch {
      setSubmitError("Network error. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="animate-fade-up">
        <section className="relative overflow-hidden rounded-3xl border border-line bg-card p-5 shadow-card">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-24 size-56 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
              Multi-hour booking
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
              Build your session
            </h2>
            <p className="mt-1.5 max-w-md text-xs leading-relaxed text-slate-500">
              Tap an open hour to set your start. Then tap a later hour or use
              the duration pills to lock in your range.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-primary-soft px-2.5 py-1 text-[10px] font-medium text-emerald-700">
            <Zap className="size-3.5 text-emerald-600" />
            1-hour blocks
          </span>
        </div>
      </section>

      <div className="sticky top-[3.25rem] z-30 -mx-4 bg-page/95 px-4 py-2 backdrop-blur-xl">
      <section className="rounded-3xl border border-line bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            <CalendarDays className="size-3.5 text-primary" />
            Select date
          </p>
          <span className="truncate text-[10px] text-slate-500">
            {selectedCourt
              ? `${selectedCourt.name} · ${formatINR(selectedCourt.price)}/hr`
              : selectedDay?.dateLabel}
          </span>
        </div>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {days.map((day) => {
            const active = day.key === selectedDateKey;

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => handleDateChange(day.key)}
                aria-pressed={active}
                aria-label={`Book ${day.dateLabel}`}
                className={`flex min-w-[68px] h-16 shrink-0 flex-col items-center justify-center rounded-2xl border px-3 transition-all duration-100 active:scale-95 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  active
                    ? "border-primary bg-primary text-white shadow-primary"
                    : "border-line bg-white text-slate-700 shadow-card hover:border-primary/40 hover:text-slate-900"
                }`}
              >
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    active ? "text-white/80" : "text-slate-400"
                  }`}
                >
                  {day.label}
                </span>
                <span className="mt-1 text-lg font-semibold leading-none">
                  {day.day}
                </span>
                <span
                  className={`mt-1 text-[9px] uppercase tracking-wider ${
                    active ? "text-white/70" : "text-slate-400"
                  }`}
                >
                  {day.month}
                </span>
              </button>
            );
          })}
        </div>
      </section>
      </div>

      <section className="mt-4 rounded-3xl border border-line bg-card p-4 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Court
          </p>
          <span className="text-[10px] text-slate-500">
            {selectedCourt ? `${formatINR(selectedCourt.price)}/hr` : ""}
          </span>
        </div>

        <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
          {venue.courts.map((court) => {
            const active = court.id === selectedCourtId;

            return (
              <button
                key={court.id}
                type="button"
                onClick={() => handleCourtChange(court.id)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-medium transition-all duration-100 active:scale-95 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  active
                    ? "border-primary/40 bg-primary-soft text-slate-900 shadow-card"
                    : "border-line bg-white text-slate-500 shadow-card hover:border-primary/30 hover:text-slate-800"
                }`}
              >
                <SportIcon
                  sport={court.sportType}
                  className={`size-4 ${
                    active ? "text-primary" : "text-slate-400"
                  }`}
                />
                {court.name}
                <span className="text-[10px] text-slate-400">
                  {formatINR(court.price)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        className={`mt-4 rounded-3xl border p-4 shadow-card transition ${
          selectedStartIso
            ? "border-primary/30 bg-primary-soft/60"
            : "border-line bg-card"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Timer className="size-3.5" />
              {selectedStartIso ? "Your session" : "How it works"}
            </p>
            {selectedStartIso && rangeStart ? (
              <p className="mt-1.5 text-sm font-semibold text-slate-900">
                Start {formatTime(new Date(rangeStart.startIso))}
                <span className="ml-2 font-normal text-emerald-700">
                  {durationLabel(rangeHours)}
                </span>
              </p>
            ) : (
              <p className="mt-1.5 text-sm font-medium text-slate-600">
                Tap an available hour to set your start time.
              </p>
            )}
            {!selectedStartIso && (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                We automatically lock out any range that crosses a booked or
                maintenance hour.
              </p>
            )}
          </div>

          {selectedStartIso && (
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Clear selected time range"
              className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-white text-slate-400 shadow-card transition hover:border-rose-300 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {selectedStartIso && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {DURATION_OPTIONS.map((hours) => {
                const active = rangeHours === hours;
                const overLimit = hours > contiguousHours;

                return (
                  <button
                    key={hours}
                    type="button"
                    onClick={() => handleDurationSelect(hours)}
                    aria-pressed={active}
                    aria-disabled={overLimit}
                    className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[11px] font-semibold transition-all duration-100 active:scale-95 ease-out cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      overLimit
                        ? "cursor-not-allowed border-line bg-slate-50 text-slate-400"
                        : active
                          ? "border-primary bg-primary text-white shadow-primary"
                          : "border-primary/30 bg-white text-primary hover:bg-primary-soft"
                    }`}
                  >
                    {overLimit ? (
                      <LockKeyhole className="size-3" />
                    ) : active ? (
                      <Check className="size-3" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                    {hours === 1 ? "+1 Hour" : `+${hours} Hours`}
                  </button>
                );
              })}
            </div>

            {firstBlockedSlot && firstBlockedState && (
              <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-amber-700">
                <Info className="mt-0.5 size-3 shrink-0" />
                <span>
                  The next block at{" "}
                  {formatTime(new Date(firstBlockedSlot.startIso))} is{" "}
                  {stateLabel(firstBlockedState).toLowerCase()}. Your range is
                  capped at {shortDuration(contiguousHours)}.
                </span>
              </p>
            )}

            {rangeError && (
              <div
                role="alert"
                className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-3 py-2.5 text-[11px] leading-relaxed text-amber-800"
              >
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span className="flex-1">{rangeError}</span>
                <button
                  type="button"
                  onClick={() => setRangeError(null)}
                  aria-label="Dismiss alert"
                  className="shrink-0 text-amber-700 transition hover:text-amber-900"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <div className="mt-5 space-y-4">
        {PERIOD_DEFINITIONS.map((period) => {
          const periodSlots = daySlots.filter(
            (slot) => getPeriodId(slot.startIso) === period.id,
          );

          if (periodSlots.length === 0) {
            return null;
          }

          const openCount = periodSlots.filter(
            (slot) => getSlotState(slot) === "available",
          ).length;
          const PeriodIcon = period.icon;

          return (
            <section
              key={period.id}
              className="rounded-3xl border border-line bg-card p-4 shadow-card"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`grid size-9 place-items-center rounded-xl border ${period.chip} ${period.accent}`}
                  >
                    <PeriodIcon className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {period.title}
                    </h3>
                    <p className="text-[10px] text-slate-400">{period.range}</p>
                  </div>
                </div>
                <span className="rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-500">
                  {openCount} open
                </span>
              </div>

              <div className="no-scrollbar -mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
                {periodSlots.map((slot) => {
                  const index = daySlots.findIndex(
                    (candidate) => candidate.startIso === slot.startIso,
                  );
                  const state = getSlotState(slot);
                  const isAvailable = state === "available";
                  const isStart = startIndex >= 0 && index === startIndex;
                  const isEnd =
                    startIndex >= 0 &&
                    rangeSlots.length > 1 &&
                    index === startIndex + rangeSlots.length - 1;
                  const isInRange =
                    startIndex >= 0 &&
                    index > startIndex &&
                    index < startIndex + rangeSlots.length - 1;
                  const isSelectableEnd =
                    isAvailable &&
                    startIndex >= 0 &&
                    index > startIndex &&
                    index - startIndex < contiguousHours;
                  const crossesBlockedHour =
                    isAvailable &&
                    startIndex >= 0 &&
                    index > startIndex &&
                    index - startIndex >= contiguousHours;

                  const cardClass =
                    isStart || isEnd
                      ? "border-primary bg-primary text-white shadow-primary"
                      : isInRange
                        ? "border-primary/50 bg-primary-soft text-emerald-700"
                        : isAvailable
                          ? `border-line bg-white text-slate-900 hover:border-primary/50 hover:shadow-card ${
                              isSelectableEnd
                                ? "ring-1 ring-primary/25"
                                : ""
                            }`
                          : state === "locked"
                            ? "cursor-not-allowed border-cyan-200 bg-cyan-50 text-cyan-700"
                            : state === "maintenance"
                              ? "cursor-not-allowed border-amber-200 bg-amber-50 text-amber-700"
                              : "cursor-not-allowed border-line bg-slate-50 text-slate-400";

                  const hint = isStart
                    ? "Start time"
                    : isEnd
                      ? "End time"
                      : isInRange
                        ? "In range"
                        : isSelectableEnd
                          ? "Tap to extend"
                          : crossesBlockedHour
                            ? "Crosses a blocked hour"
                            : stateLabel(state);

                  return (
                    <button
                      key={slot.startIso}
                      type="button"
                      disabled={!isAvailable}
                      onClick={() => handleSlotSelect(slot)}
                      aria-pressed={isStart || isEnd}
                      aria-label={`${slot.range}, ${hint}`}
                      className={`group relative flex h-20 min-w-[76px] shrink-0 flex-col items-start justify-center rounded-2xl border px-3 py-2.5 text-left transition-all duration-100 ${
                        isAvailable ? "active:scale-95 cursor-pointer" : ""
                      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${cardClass}`}
                    >
                      <span className="text-[15px] font-semibold leading-none tracking-tight">
                        {slot.label}
                      </span>
                      <span
                        className={`mt-1 text-[10px] font-medium ${
                          isStart || isEnd
                            ? "text-white/75"
                            : isInRange
                              ? "text-emerald-700/80"
                              : "text-slate-400"
                        }`}
                      >
                        to {formatTime(new Date(slot.endIso))}
                      </span>
                      <span
                        className={`mt-1.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider ${
                          isStart || isEnd
                            ? "text-white/85"
                            : isInRange
                              ? "text-emerald-700"
                              : isAvailable
                                ? crossesBlockedHour
                                  ? "text-amber-600"
                                  : "text-primary"
                                : "opacity-80"
                        }`}
                      >
                        {(isStart || isEnd) && <Check className="size-2.5" />}
                        {state === "maintenance" && (
                          <Wrench className="size-2.5" />
                        )}
                        {!isAvailable && state !== "maintenance" && (
                          <LockKeyhole className="size-2.5" />
                        )}
                        {isInRange && <Check className="size-2.5" />}
                        {isAvailable ? formatINR(selectedCourt?.price ?? 0) : hint}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>

      {isRangeReady && selectedDay && selectedCourt && pricing && rangeStart && rangeEndIso && (
        <div className="fixed inset-x-0 z-40 safe-nav border-t border-line bg-white/95 shadow-nav backdrop-blur-2xl">
          <div className="mx-auto max-w-5xl px-4 pb-3 pt-2.5">
            <div className="mx-auto h-1 w-10 rounded-full bg-slate-200 sm:hidden" />

            {submitError && (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] text-rose-700">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="mt-2 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      {selectedDay.dateLabel} · {selectedCourt.name}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-semibold text-slate-900">
                      <Clock3 className="size-3.5 text-primary" />
                      <span>
                        {formatTime(new Date(rangeStart.startIso))} –{" "}
                        {formatTime(new Date(rangeEndIso))}
                      </span>
                      <span className="rounded-full border border-emerald-200 bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        ({shortDuration(rangeHours)})
                      </span>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={clearSelection}
                    aria-label="Clear selected time range"
                    className="grid size-8 shrink-0 place-items-center rounded-full border border-line bg-white text-slate-400 shadow-card transition hover:border-rose-300 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 md:hidden"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-500">
                  <span className="text-slate-700">
                    {durationLabel(rangeHours)} @{" "}
                    {formatINR(selectedCourt.price)}/hr ={" "}
                    {formatINR(pricing.courtPrice)}
                  </span>
                  <span className="text-slate-300">+</span>
                  <span>{formatINR(pricing.convenienceFee)} fee</span>
                  <span className="text-slate-300">=</span>
                  <span className="text-sm font-semibold text-primary">
                    {formatINR(pricing.totalPayable)} total
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleProceed}
                disabled={!isRangeReady || isSubmitting}
                className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-sm font-semibold text-white shadow-primary transition-all duration-100 active:scale-95 ease-out hover:bg-primary-deep disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:w-auto"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Holding range...
                  </>
                ) : (
                  <>
                    Proceed to Checkout
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
