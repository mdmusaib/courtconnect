"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Loader2,
  Phone,
  Plus,
  QrCode,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { BookingSourceTag } from "@/components/owner/BookingSourceTag";
import {
  addDaysToDateKey,
  formatDateKey,
  formatDateKeyLong,
  formatINR,
  formatSlotRange,
} from "@/lib/format";
import {
  OWNER_DAY_END_HOUR,
  OWNER_DAY_START_HOUR,
  OWNER_ENTRY_FUTURE_DAYS,
  OWNER_ENTRY_MAX_HOURS,
  OWNER_ENTRY_PAST_DAYS,
} from "@/lib/owner-constants";
import type {
  OwnerBookingRow,
  OwnerCourtOption,
  OwnerEntryType,
} from "@/lib/types";

const HOUR_MS = 60 * 60 * 1000;

interface EntryTypeOption {
  value: OwnerEntryType;
  label: string;
  description: string;
  icon: LucideIcon;
  selectedClass: string;
  iconClass: string;
  note: string;
}

const ENTRY_TYPES: EntryTypeOption[] = [
  {
    value: "WALK_IN",
    label: "Walk-in cash",
    description: "Collected now",
    icon: Banknote,
    selectedClass:
      "border-amber-400/50 bg-amber-400/[0.14] text-amber-50 shadow-[0_0_0_1px_rgba(251,191,36,0.15)]",
    iconClass: "text-amber-300",
    note: "Cash is recorded as collected today.",
  },
  {
    value: "PHONE",
    label: "Phone booking",
    description: "Pay at venue",
    icon: Phone,
    selectedClass:
      "border-cyan-400/50 bg-cyan-400/[0.14] text-cyan-50 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]",
    iconClass: "text-cyan-300",
    note: "The court is confirmed; payment stays due at the venue.",
  },
  {
    value: "GROUND_QR",
    label: "Ground QR",
    description: "Venue UPI",
    icon: QrCode,
    selectedClass:
      "border-violet-400/50 bg-violet-400/[0.14] text-violet-50 shadow-[0_0_0_1px_rgba(167,139,250,0.15)]",
    iconClass: "text-violet-300",
    note: "Direct ground QR payment received by the venue.",
  },
];

export interface OwnerQuickEntryInitialSlot {
  courtId?: string;
  dateKey?: string;
  hour?: number;
  durationHours?: number;
}

export interface OwnerQuickEntryResult {
  booking: OwnerBookingRow;
  entryType: OwnerEntryType;
  amount: number;
  collectedNow: number;
  dueAtVenue: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getIstHour(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  return Number(parts.find((part) => part.type === "hour")?.value ?? 0);
}

function nextStartHour(dateKey: string, todayKey: string): number {
  if (dateKey !== todayKey) {
    return 18;
  }

  return clamp(getIstHour(new Date()) + 1, OWNER_DAY_START_HOUR, 22);
}

function hourLabel(hour: number): string {
  const date = new Date(
    `2000-01-01T${String(hour).padStart(2, "0")}:00:00+05:30`,
  );

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "numeric",
    hour12: true,
  }).format(date);
}

export function OwnerQuickEntryModal({
  courts,
  todayKey,
  initialSlot,
  open: controlledOpen,
  onOpenChange,
  onCreated,
  trigger,
  defaultOpen = false,
}: {
  courts: OwnerCourtOption[];
  todayKey: string;
  initialSlot?: OwnerQuickEntryInitialSlot;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onCreated?: (result: OwnerQuickEntryResult) => void;
  trigger?: ReactNode;
  defaultOpen?: boolean;
}) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const [selectedCourtId, setSelectedCourtId] = useState(
    initialSlot?.courtId ?? courts[0]?.id ?? "",
  );
  const [dateKey, setDateKey] = useState(initialSlot?.dateKey ?? todayKey);
  const [startHour, setStartHour] = useState(
    initialSlot?.hour ??
      nextStartHour(initialSlot?.dateKey ?? todayKey, todayKey),
  );
  const [duration, setDuration] = useState(initialSlot?.durationHours ?? 1);
  const [entryType, setEntryType] = useState<OwnerEntryType>("WALK_IN");
  const [customerName, setCustomerName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<OwnerQuickEntryResult | null>(null);
  const wasOpenRef = useRef(defaultOpen);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (nextOpen: boolean) => {
    if (submitting && !nextOpen) {
      return;
    }

    if (!isControlled) {
      setInternalOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      wasOpenRef.current = false;
      return;
    }

    if (wasOpenRef.current) {
      return;
    }

    wasOpenRef.current = true;

    const validCourtId = courts.some(
      (court) => court.id === initialSlot?.courtId,
    )
      ? initialSlot?.courtId
      : courts[0]?.id ?? "";
    const nextDateKey = initialSlot?.dateKey ?? todayKey;
    const nextDuration = clamp(
      initialSlot?.durationHours ?? 1,
      1,
      OWNER_ENTRY_MAX_HOURS,
    );
    const latestStart = OWNER_DAY_END_HOUR - nextDuration;

    setSelectedCourtId(validCourtId ?? "");
    setDateKey(nextDateKey);
    setDuration(nextDuration);
    setStartHour(
      clamp(
        initialSlot?.hour ?? nextStartHour(nextDateKey, todayKey),
        OWNER_DAY_START_HOUR,
        latestStart,
      ),
    );
    setEntryType("WALK_IN");
    setCustomerName("");
    setError(null);
    setSuccess(null);
    setSubmitting(false);
  }, [open, courts, initialSlot, todayKey]);

  useEffect(() => {
    if (!open) {
      return;
    }

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.focus();
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus();
    };
    // setOpen is stable for the lifetime of an open modal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedCourt =
    courts.find((court) => court.id === selectedCourtId) ?? courts[0];

  const latestStart = OWNER_DAY_END_HOUR - duration;
  const startOptions = useMemo(
    () =>
      Array.from(
        { length: latestStart - OWNER_DAY_START_HOUR + 1 },
        (_, index) => OWNER_DAY_START_HOUR + index,
      ),
    [latestStart],
  );

  useEffect(() => {
    if (startHour > latestStart) {
      setStartHour(latestStart);
    }
  }, [latestStart, startHour]);

  const minDateKey = addDaysToDateKey(todayKey, -OWNER_ENTRY_PAST_DAYS);
  const maxDateKey = addDaysToDateKey(todayKey, OWNER_ENTRY_FUTURE_DAYS);
  const total = (selectedCourt?.price ?? 0) * duration;
  const collectedNow =
    entryType === "PHONE" ? 0 : total;
  const dueAtVenue = entryType === "PHONE" ? total : 0;
  const selectedEntryType =
    ENTRY_TYPES.find((option) => option.value === entryType) ?? ENTRY_TYPES[0];

  const previewRange = useMemo(() => {
    const start = new Date(
      `${dateKey}T${String(startHour).padStart(2, "0")}:00:00+05:30`,
    );

    if (Number.isNaN(start.getTime())) {
      return "";
    }

    return formatSlotRange(start, new Date(start.getTime() + duration * HOUR_MS));
  }, [dateKey, duration, startHour]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCourt || submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const slotStart = new Date(
        `${dateKey}T${String(startHour).padStart(2, "0")}:00:00+05:30`,
      );
      const slotEnd = new Date(slotStart.getTime() + duration * HOUR_MS);

      const response = await fetch("/api/owner/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courtId: selectedCourt.id,
          slotStart: slotStart.toISOString(),
          slotEnd: slotEnd.toISOString(),
          entryType,
          customerName: customerName.trim(),
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
        booking?: OwnerBookingRow;
        entryType?: OwnerEntryType;
        amount?: number;
        collectedNow?: number;
        dueAtVenue?: number;
      };

      if (!response.ok || !data.booking) {
        throw new Error(data.error || "Could not log this entry. Please retry.");
      }

      const result: OwnerQuickEntryResult = {
        booking: data.booking,
        entryType: data.entryType ?? entryType,
        amount: data.amount ?? total,
        collectedNow: data.collectedNow ?? collectedNow,
        dueAtVenue: data.dueAtVenue ?? dueAtVenue,
      };

      setSuccess(result);
      onCreated?.(result);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not log this entry. Please retry.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function resetForAnother() {
    setSuccess(null);
    setError(null);
    setCustomerName("");
    setEntryType("WALK_IN");
    setDateKey(initialSlot?.dateKey ?? todayKey);
    setSelectedCourtId(initialSlot?.courtId ?? courts[0]?.id ?? "");
    setDuration(initialSlot?.durationHours ?? 1);
    setStartHour(
      clamp(
        initialSlot?.hour ?? nextStartHour(todayKey, todayKey),
        OWNER_DAY_START_HOUR,
        OWNER_DAY_END_HOUR - (initialSlot?.durationHours ?? 1),
      ),
    );
  }

  const defaultTrigger = !isControlled ? (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 text-sm font-semibold text-oled shadow-[0_14px_38px_-16px_rgba(16,185,129,0.9)] transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-oled"
    >
      <Plus className="size-4" strokeWidth={2.6} />
      Quick entry
    </button>
  ) : null;

  const modal =
    mounted && open
      ? createPortal(
          <div
            className="fixed inset-0 z-[80] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setOpen(false);
              }
            }}
          >
            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="owner-quick-entry-title"
              tabIndex={-1}
              className="relative max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl border border-white/10 bg-[#111a29] shadow-[0_40px_120px_-30px_rgba(0,0,0,1)] outline-none sm:rounded-3xl"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-emerald-400/[0.08] to-transparent" />

              <div className="relative flex items-start justify-between gap-4 border-b border-white/8 px-5 py-4 sm:px-6">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 shrink-0 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                    <Zap className="size-5" />
                  </div>
                  <div>
                    <h2
                      id="owner-quick-entry-title"
                      className="text-base font-semibold tracking-tight text-white sm:text-lg"
                    >
                      Quick entry
                    </h2>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">
                      Log a direct booking in seconds. No screenshot, no AI
                      check, ₹0 platform fee.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                  className="grid size-8 shrink-0 place-items-center rounded-full border border-white/8 bg-white/[0.03] text-slate-400 transition hover:border-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 disabled:opacity-50"
                  aria-label="Close quick entry"
                >
                  <X className="size-4" />
                </button>
              </div>

              {success ? (
                <div className="relative px-5 py-6 sm:px-6">
                  <div className="flex flex-col items-center text-center">
                    <div className="grid size-14 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-emerald-300">
                      <CheckCircle2 className="size-7" />
                    </div>
                    <h3 className="mt-3 text-lg font-semibold text-white">
                      Entry logged
                    </h3>
                    <p className="mt-1 max-w-sm text-xs leading-relaxed text-slate-400">
                      The court is blocked instantly. Collected and due amounts
                      are recorded below with a ₹0 platform fee.
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {success.booking.courtName}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {success.booking.venueName}
                        </p>
                      </div>
                      <BookingSourceTag
                        status={success.booking.status}
                        paymentMode={success.booking.paymentMode}
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <SummaryCell
                        label="Court time"
                        value={formatSlotRange(
                          new Date(success.booking.slotStart),
                          new Date(success.booking.slotEnd),
                        )}
                        icon={<Clock3 className="size-3.5" />}
                      />
                      <SummaryCell
                        label="Date"
                        value={formatDateKeyLong(
                          formatDateKey(new Date(success.booking.slotStart)),
                        )}
                        icon={<Sparkles className="size-3.5" />}
                      />
                      <SummaryCell
                        label="Collected now"
                        value={formatINR(success.collectedNow)}
                        icon={<Banknote className="size-3.5" />}
                        accent="text-emerald-300"
                      />
                      <SummaryCell
                        label="Due at venue"
                        value={formatINR(success.dueAtVenue)}
                        icon={<ShieldCheck className="size-3.5" />}
                        accent={
                          success.dueAtVenue > 0
                            ? "text-amber-300"
                            : "text-slate-300"
                        }
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3 text-sm">
                      <span className="text-slate-400">Total court rate</span>
                      <span className="font-semibold text-white">
                        {formatINR(success.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={resetForAnother}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                    >
                      <Plus className="size-4" />
                      Add another
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-semibold text-oled transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="relative px-5 py-5 sm:px-6">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Payment source
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      {ENTRY_TYPES.map((option) => {
                        const Icon = option.icon;
                        const selected = option.value === entryType;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => setEntryType(option.value)}
                            aria-pressed={selected}
                            className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                              selected
                                ? option.selectedClass
                                : "border-white/8 bg-white/[0.025] text-slate-300 hover:border-white/15 hover:bg-white/[0.05]"
                            }`}
                          >
                            <span
                              className={`grid size-9 shrink-0 place-items-center rounded-xl border ${
                                selected
                                  ? "border-white/10 bg-black/15"
                                  : "border-white/8 bg-white/[0.03]"
                              }`}
                            >
                              <Icon
                                className={`size-4 ${
                                  selected ? option.iconClass : "text-slate-400"
                                }`}
                              />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs font-semibold">
                                {option.label}
                              </span>
                              <span className="mt-0.5 block text-[10px] opacity-70">
                                {option.description}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Court
                      </span>
                      <select
                        value={selectedCourt?.id ?? ""}
                        onChange={(event) =>
                          setSelectedCourtId(event.target.value)
                        }
                        className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-oled/70 px-3 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
                      >
                        {courts.map((court) => (
                          <option key={court.id} value={court.id}>
                            {court.name} · {court.venueName} ·{" "}
                            {formatINR(court.price)}/hr
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Date
                      </span>
                      <input
                        type="date"
                        required
                        min={minDateKey}
                        max={maxDateKey}
                        value={dateKey}
                        onChange={(event) => setDateKey(event.target.value)}
                        className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-oled/70 px-3 text-sm text-white outline-none transition [color-scheme:dark] focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Start
                        </span>
                        <select
                          value={startHour}
                          onChange={(event) =>
                            setStartHour(Number(event.target.value))
                          }
                          className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-oled/70 px-3 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
                        >
                          {startOptions.map((hour) => (
                            <option key={hour} value={hour}>
                              {hourLabel(hour)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label>
                        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Duration
                        </span>
                        <select
                          value={duration}
                          onChange={(event) =>
                            setDuration(Number(event.target.value))
                          }
                          className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-oled/70 px-3 text-sm text-white outline-none transition focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
                        >
                          {Array.from(
                            { length: OWNER_ENTRY_MAX_HOURS },
                            (_, index) => index + 1,
                          ).map((hours) => (
                            <option key={hours} value={hours}>
                              {hours} {hours === 1 ? "hour" : "hours"}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <label className="sm:col-span-2">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Player name / note{" "}
                        <span className="font-normal normal-case tracking-normal text-slate-600">
                          optional
                        </span>
                      </span>
                      <input
                        type="text"
                        maxLength={120}
                        value={customerName}
                        onChange={(event) => setCustomerName(event.target.value)}
                        placeholder="e.g. Karthik — regular 7v7 group"
                        className="mt-1.5 h-11 w-full rounded-xl border border-white/10 bg-oled/70 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:ring-2 focus:ring-emerald-400/20"
                      />
                    </label>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.025] p-4">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <div>
                        <p className="text-white">
                          Court rate
                          <span className="ml-2 text-[11px] text-slate-500">
                            {formatINR(selectedCourt?.price ?? 0)} × {duration}{" "}
                            {duration === 1 ? "hour" : "hours"}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-500">
                          {previewRange}
                        </p>
                      </div>
                      <p className="font-medium text-white">{formatINR(total)}</p>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                      <div className="flex items-center gap-1.5 text-emerald-300">
                        <ShieldCheck className="size-3.5" />
                        Platform fee
                      </div>
                      <p className="font-semibold text-emerald-300">₹0</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-white/8 pt-3">
                      <span className="text-sm font-medium text-white">Total</span>
                      <span className="text-lg font-semibold text-white">
                        {formatINR(total)}
                      </span>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
                        <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                          Collected now
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-emerald-300">
                          {formatINR(collectedNow)}
                        </p>
                      </div>
                      <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
                        <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                          Due at venue
                        </p>
                        <p
                          className={`mt-0.5 text-sm font-semibold ${
                            dueAtVenue > 0 ? "text-amber-300" : "text-slate-300"
                          }`}
                        >
                          {formatINR(dueAtVenue)}
                        </p>
                      </div>
                    </div>

                    <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
                      <Sparkles className="mt-0.5 size-3 shrink-0 text-emerald-400" />
                      {selectedEntryType.note} AI verification and receipt
                      upload are skipped.
                    </p>
                  </div>

                  {error && (
                    <div
                      role="alert"
                      aria-live="polite"
                      className="mt-3 rounded-xl border border-rose-400/25 bg-rose-400/10 px-3 py-2.5 text-xs text-rose-200"
                    >
                      {error}
                    </div>
                  )}

                  <div className="sticky bottom-0 -mx-5 mt-4 flex gap-2 border-t border-white/8 bg-[#111a29]/95 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      disabled={submitting}
                      className="inline-flex h-11 flex-1 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 disabled:opacity-50 sm:flex-none sm:px-5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !selectedCourt}
                      className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 text-sm font-semibold text-oled transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#111a29] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Logging entry…
                        </>
                      ) : (
                        <>
                          Log {selectedEntryType.label.toLowerCase()} ·{" "}
                          {formatINR(total)}
                          <Plus className="size-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {trigger ?? defaultTrigger}
      {modal}
    </>
  );
}

function SummaryCell({
  label,
  value,
  icon,
  accent = "text-white",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2">
      <div className="flex items-center gap-1.5 text-slate-500">
        <span className="text-emerald-400">{icon}</span>
        <span className="text-[9px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className={`mt-0.5 text-xs font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
