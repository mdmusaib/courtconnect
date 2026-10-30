"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Ban,
  Check,
  Clock3,
  Loader2,
  LockKeyhole,
  Sun,
  Wrench,
  Zap,
} from "lucide-react";
import { SportIcon } from "@/components/venue/SportVisual";
import { formatINR } from "@/lib/format";
import { calculateBookingPrice } from "@/lib/pricing";
import type {
  DaySchedule,
  SlotBooking,
  VenueBookingData,
} from "@/lib/types";

type SlotState = "available" | "selected" | "locked" | "booked" | "past" | "maintenance";

export function SlotMatrix({
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

  const [selectedDateKey, setSelectedDateKey] = useState(initialDay?.key ?? "");
  const [selectedCourtId, setSelectedCourtId] = useState(
    initialCourt?.id ?? "",
  );
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDay =
    days.find((day) => day.key === selectedDateKey) ?? days[0];
  const selectedCourt =
    venue.courts.find((court) => court.id === selectedCourtId) ??
    venue.courts[0];
  const selectedSlot = selectedDay?.slots.find(
    (slot) => slot.startIso === selectedSlotIso,
  );
  const now = new Date(nowIso).getTime();

  const bookingStatusByKey = useMemo(() => {
    const map = new Map<string, string>();

    for (const booking of bookings) {
      map.set(`${booking.courtId}|${booking.slotStart}`, booking.status);
    }

    return map;
  }, [bookings]);

  function getSlotState(slotStartIso: string): SlotState {
    const key = `${selectedCourtId}|${slotStartIso}`;
    const status = bookingStatusByKey.get(key);

    if (status === "CONFIRMED") return "booked";
    if (status === "PENDING") return "locked";
    if (status === "MAINTENANCE") return "maintenance";
    if (new Date(slotStartIso).getTime() <= now) return "past";
    if (slotStartIso === selectedSlotIso) return "selected";

    return "available";
  }

  function handleCourtChange(courtId: string) {
    setSelectedCourtId(courtId);
    setSelectedSlotIso(null);
    setError(null);
  }

  function handleDateChange(dateKey: string) {
    setSelectedDateKey(dateKey);
    setSelectedSlotIso(null);
    setError(null);
  }

  async function handleContinue() {
    if (!selectedCourt || !selectedSlot || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: selectedCourt.id,
          slotStart: selectedSlot.startIso,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        checkoutUrl?: string;
        booking?: { id: string };
      };

      if (!response.ok) {
        setError(payload.error ?? "Could not hold this slot. Please try again.");
        if (response.status === 409) {
          setSelectedSlotIso(null);
          router.refresh();
        }
        return;
      }

      router.push(
        payload.checkoutUrl ??
          (payload.booking ? `/checkout/${payload.booking.id}` : "/my-bookings"),
      );
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const total = selectedCourt
    ? calculateBookingPrice(selectedCourt.price, "FULL_ONLINE").totalPayable
    : 0;

  return (
    <div className="animate-fade-up">
      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Live slot matrix
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Pick a time
            </h1>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[10px] font-medium text-cyan-200">
            <Zap className="size-3.5 text-cyan-300" />
            1 min hold
          </span>
        </div>

        <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1">
          {venue.courts.map((court) => {
            const active = court.id === selectedCourtId;

            return (
              <button
                key={court.id}
                type="button"
                onClick={() => handleCourtChange(court.id)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                  active
                    ? "border-emerald-400/40 bg-emerald-400/10 text-white"
                    : "border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-slate-200"
                }`}
              >
                <SportIcon
                  sport={court.sportType}
                  className={`size-4 ${active ? "text-emerald-300" : "text-slate-500"}`}
                />
                {court.name}
                <span className="text-[10px] text-slate-500">
                  {formatINR(court.price)}
                </span>
              </button>
            );
          })}
        </div>

        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {days.map((day) => {
            const active = day.key === selectedDateKey;

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => handleDateChange(day.key)}
                aria-pressed={active}
                className={`flex min-w-[64px] shrink-0 flex-col items-center rounded-2xl border px-3 py-2.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                  active
                    ? "border-emerald-400 bg-emerald-400 text-oled"
                    : "border-white/8 bg-white/[0.025] text-slate-400 hover:border-white/15"
                }`}
              >
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wide ${
                    active ? "text-oled/70" : "text-slate-500"
                  }`}
                >
                  {day.label}
                </span>
                <span className="mt-1 text-lg font-semibold leading-none">
                  {day.day}
                </span>
                <span
                  className={`mt-1 text-[9px] uppercase tracking-wider ${
                    active ? "text-oled/60" : "text-slate-600"
                  }`}
                >
                  {day.month}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sun className="size-3.5 text-amber-300" />
            {selectedDay?.dateLabel}
            <span className="text-slate-600">·</span>
            <span>{selectedCourt?.sportType}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500">
            <Legend className="bg-emerald-400/15 border-emerald-400/30" label="Open" />
            <Legend className="bg-cyan-400/15 border-cyan-400/30" label="Held" />
            <Legend className="bg-slate-500/10 border-slate-600/40" label="Booked" />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {selectedDay?.slots.map((slot) => {
            const state = getSlotState(slot.startIso);

            return (
              <button
                key={slot.startIso}
                type="button"
                disabled={state !== "available" && state !== "selected"}
                onClick={() =>
                  setSelectedSlotIso(
                    state === "selected" ? null : slot.startIso,
                  )
                }
                aria-pressed={state === "selected"}
                className={`group relative flex min-h-[74px] flex-col items-start justify-center rounded-2xl border px-3 py-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                  state === "selected"
                    ? "border-emerald-400 bg-emerald-400 text-oled shadow-[0_8px_30px_-10px_rgba(16,185,129,0.75)]"
                    : state === "available"
                      ? "border-emerald-400/20 bg-emerald-400/[0.06] text-slate-200 hover:border-emerald-400/50 hover:bg-emerald-400/10"
                      : state === "locked"
                        ? "cursor-not-allowed border-cyan-400/20 bg-cyan-400/[0.055] text-cyan-200/70"
                        : state === "maintenance"
                          ? "cursor-not-allowed border-amber-400/15 bg-amber-400/[0.04] text-amber-200/60"
                          : "cursor-not-allowed border-white/5 bg-white/[0.015] text-slate-600"
                }`}
              >
                <span className="text-[13px] font-semibold tracking-tight">
                  {slot.label}
                </span>
                <span
                  className={`mt-1 flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider ${
                    state === "selected"
                      ? "text-oled/65"
                      : state === "available"
                        ? "text-emerald-400/80"
                        : "opacity-70"
                  }`}
                >
                  {state === "available" && (
                    <>
                      <Check className="size-2.5" /> Available
                    </>
                  )}
                  {state === "selected" && (
                    <>
                      <Check className="size-2.5" /> Selected
                    </>
                  )}
                  {state === "locked" && (
                    <>
                      <LockKeyhole className="size-2.5" /> On hold
                    </>
                  )}
                  {state === "booked" && (
                    <>
                      <Ban className="size-2.5" /> Booked
                    </>
                  )}
                  {state === "maintenance" && (
                    <>
                      <Wrench className="size-2.5" /> Maintenance
                    </>
                  )}
                  {state === "past" && "Past"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="fixed inset-x-0 z-40 safe-nav border-t border-white/8 bg-oled/90 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 py-3">
          {error && (
            <div className="mb-2 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-[11px] text-rose-200">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              {selectedSlot && selectedCourt ? (
                <>
                  <p className="truncate text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    {selectedCourt.name} · {selectedDay?.dateLabel}
                  </p>
                  <p className="truncate text-sm font-semibold text-white">
                    {selectedSlot.range}
                    <span className="ml-2 font-normal text-emerald-400">
                      {formatINR(total)}
                    </span>
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                    Ready when you are
                  </p>
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
                    <Clock3 className="size-3.5 text-emerald-400" />
                    Select an open slot
                  </p>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleContinue}
              disabled={!selectedSlot || isSubmitting}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-400 px-4 text-xs font-semibold text-oled transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Holding...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="size-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`size-2 rounded-full border ${className}`} />
      {label}
    </span>
  );
}
