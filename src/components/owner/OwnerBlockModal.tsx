"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Loader2,
  Lock,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import {
  OWNER_DAY_END_HOUR,
  OWNER_DAY_START_HOUR,
} from "@/lib/owner-constants";
import type { BlockTypeValue, OwnerCourtOption, SlotBlockItem } from "@/lib/types";

export interface OwnerBlockInitialData {
  courtId?: string;
  dateKey?: string;
  startHour?: number;
  endHour?: number;
  editingBlock?: SlotBlockItem | null;
}

const HOURS = Array.from(
  { length: OWNER_DAY_END_HOUR - OWNER_DAY_START_HOUR + 1 },
  (_, i) => OWNER_DAY_START_HOUR + i,
);

const DAYS_OF_WEEK = [
  { value: 0, label: "Sun", full: "Sunday" },
  { value: 1, label: "Mon", full: "Monday" },
  { value: 2, label: "Tue", full: "Tuesday" },
  { value: 3, label: "Wed", full: "Wednesday" },
  { value: 4, label: "Thu", full: "Thursday" },
  { value: 5, label: "Fri", full: "Friday" },
  { value: 6, label: "Sat", full: "Saturday" },
];

const RECURRING_REASON_PRESETS = [
  "Academy / Membership",
  "Morning Coaching (6 AM - 8 AM)",
  "Evening Academy (5 PM - 7 PM)",
  "Daily Membership Hours",
  "VIP Ground Reservation",
];

const MAINTENANCE_REASON_PRESETS = [
  "Turf Maintenance",
  "Adverse Weather / Rain",
  "Private Event",
  "Floodlight & Net Repairs",
  "Routine Cleaning",
];

function hourToTimeString(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function timeToHourLabel(timeStr: string): string {
  const [h] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:00 ${period}`;
}

export function OwnerBlockModal({
  courts,
  todayKey,
  open,
  onOpenChange,
  initialData,
  onOpenQuickEntry,
}: {
  courts: OwnerCourtOption[];
  todayKey: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: OwnerBlockInitialData;
  onOpenQuickEntry?: () => void;
}) {
  const router = useRouter();

  const [blockType, setBlockType] = useState<BlockTypeValue>("PERMANENT_RECURRING");
  const [courtId, setCourtId] = useState(courts[0]?.id ?? "");
  const [reason, setReason] = useState("Academy / Membership");

  // Recurring block state
  const [startTime, setStartTime] = useState("06:00");
  const [endTime, setEndTime] = useState("08:00");
  const [selectedDays, setSelectedDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  // Temporary block state
  const [startDateKey, setStartDateKey] = useState(todayKey);
  const [tempStartHour, setTempStartHour] = useState("06:00");
  const [endDateKey, setEndDateKey] = useState(todayKey);
  const [tempEndHour, setTempEndHour] = useState("08:00");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isEditing = Boolean(initialData?.editingBlock);

  // Sync state when modal opens or initialData changes
  useEffect(() => {
    if (!open) {
      setErrorMessage(null);
      return;
    }

    if (initialData?.editingBlock) {
      const b = initialData.editingBlock;
      setBlockType(b.blockType);
      setCourtId(b.courtId);
      setReason(b.reason);

      if (b.blockType === "PERMANENT_RECURRING") {
        setStartTime(b.startTime || "06:00");
        setEndTime(b.endTime || "08:00");
        setSelectedDays(b.daysOfWeek.length > 0 ? b.daysOfWeek : [0, 1, 2, 3, 4, 5, 6]);
      } else {
        if (b.startDate) {
          const s = new Date(b.startDate);
          setStartDateKey(s.toISOString().slice(0, 10));
          const sh = String(s.getUTCHours()).padStart(2, "0");
          setTempStartHour(`${sh}:00`);
        }
        if (b.endDate) {
          const e = new Date(b.endDate);
          setEndDateKey(e.toISOString().slice(0, 10));
          const eh = String(e.getUTCHours()).padStart(2, "0");
          setTempEndHour(`${eh}:00`);
        }
      }
    } else {
      if (initialData?.courtId) setCourtId(initialData.courtId);
      const startH = initialData?.startHour ?? 6;
      const endH = initialData?.endHour ?? Math.min(startH + 2, OWNER_DAY_END_HOUR);
      const sStr = hourToTimeString(startH);
      const eStr = hourToTimeString(endH);

      setStartTime(sStr);
      setEndTime(eStr);
      setTempStartHour(sStr);
      setTempEndHour(eStr);

      const dKey = initialData?.dateKey || todayKey;
      setStartDateKey(dKey);
      setEndDateKey(dKey);
      setReason("Academy / Membership");
    }
  }, [open, initialData, todayKey]);

  if (!open) return null;

  function toggleDay(day: number) {
    if (selectedDays.includes(day)) {
      if (selectedDays.length === 1) return; // keep at least 1 day
      setSelectedDays(selectedDays.filter((d) => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort((a, b) => a - b));
    }
  }

  function selectEveryDay() {
    setSelectedDays([0, 1, 2, 3, 4, 5, 6]);
  }

  function selectWeekdays() {
    setSelectedDays([1, 2, 3, 4, 5]);
  }

  function selectWeekends() {
    setSelectedDays([0, 6]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        courtId,
        blockType,
        reason: reason.trim(),
      };

      if (blockType === "PERMANENT_RECURRING") {
        if (startTime >= endTime) {
          setErrorMessage("Start time must be before end time.");
          setIsSubmitting(false);
          return;
        }
        if (selectedDays.length === 0) {
          setErrorMessage("Please select at least one day of the week.");
          setIsSubmitting(false);
          return;
        }
        payload.startTime = startTime;
        payload.endTime = endTime;
        payload.daysOfWeek = selectedDays;
      } else {
        // Construct ISO start & end in IST (+05:30)
        const startIso = `${startDateKey}T${tempStartHour}:00+05:30`;
        const endIso = `${endDateKey}T${tempEndHour}:00+05:30`;

        if (new Date(startIso) >= new Date(endIso)) {
          setErrorMessage("Start date/time must be strictly before end date/time.");
          setIsSubmitting(false);
          return;
        }

        payload.startDate = new Date(startIso).toISOString();
        payload.endDate = new Date(endIso).toISOString();
      }

      const method = isEditing ? "PUT" : "POST";
      if (isEditing) {
        payload.id = initialData?.editingBlock?.id;
      }

      const res = await fetch("/api/owner/blocks", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save slot block.");
      }

      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!initialData?.editingBlock) return;
    if (!confirm("Are you sure you want to unblock this slot?")) return;

    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/owner/blocks?id=${encodeURIComponent(initialData.editingBlock.id)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove block.");
      }

      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to unblock slot.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-white p-5 shadow-lift sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                {blockType === "PERMANENT_RECURRING" ? (
                  <Lock className="size-4 text-indigo-600" />
                ) : (
                  <Wrench className="size-4 text-rose-600" />
                )}
              </span>
              <h2 className="text-base font-semibold text-slate-900">
                {isEditing ? "Edit Blocked Slot" : "Block Slot / Schedule"}
              </h2>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Prevent player bookings during recurring memberships or maintenance closures.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid size-8 place-items-center rounded-xl border border-line bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Tab Switcher: Recurring vs Temporary */}
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => {
              setBlockType("PERMANENT_RECURRING");
              if (!isEditing) setReason("Academy / Membership");
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
              blockType === "PERMANENT_RECURRING"
                ? "bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Lock className="size-3.5 text-indigo-600" />
            <span>Permanent Recurring</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setBlockType("TEMPORARY");
              if (!isEditing) setReason("Turf Maintenance");
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
              blockType === "TEMPORARY"
                ? "bg-rose-50 text-rose-700 border border-rose-200 shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Wrench className="size-3.5 text-rose-600" />
            <span>Temporary Maintenance</span>
          </button>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            <AlertTriangle className="size-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Court selector */}
          <div>
            <label className="text-[11px] font-medium text-slate-500">Court to Block</label>
            <select
              value={courtId}
              onChange={(e) => setCourtId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none transition focus:border-indigo-500/60"
            >
              {courts.map((court) => (
                <option key={court.id} value={court.id} className="bg-white text-slate-900">
                  {court.name} · {court.sportType} ({court.venueName})
                </option>
              ))}
            </select>
          </div>

          {/* Form fields for Recurring */}
          {blockType === "PERMANENT_RECURRING" ? (
            <div className="space-y-4 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                  🔒 Recurring Daily Schedule
                </span>
                <span className="text-[10px] text-slate-500">Every selected day</span>
              </div>

              {/* Time Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-slate-500">Start Time</label>
                  <select
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500"
                  >
                    {HOURS.slice(0, -1).map((h) => {
                      const t = hourToTimeString(h);
                      return (
                        <option key={t} value={t} className="bg-white">
                          {timeToHourLabel(t)}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-medium text-slate-500">End Time</label>
                  <select
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-indigo-500"
                  >
                    {HOURS.slice(1).map((h) => {
                      const t = hourToTimeString(h);
                      return (
                        <option key={t} value={t} className="bg-white">
                          {timeToHourLabel(t)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Quick Preset Buttons for Days */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-medium text-slate-500">Repeat Days</label>
                  <div className="flex gap-1.5 text-[10px]">
                    <button
                      type="button"
                      onClick={selectEveryDay}
                      className="text-indigo-600 underline decoration-indigo-300 hover:text-indigo-700"
                    >
                      Every day
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={selectWeekdays}
                      className="text-indigo-600 underline decoration-indigo-300 hover:text-indigo-700"
                    >
                      Mon–Fri
                    </button>
                    <span className="text-slate-300">·</span>
                    <button
                      type="button"
                      onClick={selectWeekends}
                      className="text-indigo-600 underline decoration-indigo-300 hover:text-indigo-700"
                    >
                      Sat–Sun
                    </button>
                  </div>
                </div>

                {/* Day selector pills */}
                <div className="mt-1.5 flex gap-1">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = selectedDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`flex-1 rounded-xl py-1.5 text-[11px] font-semibold transition ${
                          isSelected
                            ? "bg-indigo-600 text-white shadow-sm"
                            : "border border-line bg-slate-50 text-slate-500 hover:text-slate-900"
                        }`}
                        title={day.full}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Reason presets */}
              <div>
                <label className="text-[10px] font-medium text-slate-500">Reason / Tag</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {RECURRING_REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReason(preset)}
                      className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                        reason === preset
                          ? "bg-indigo-100 text-indigo-700 border border-indigo-300"
                          : "border border-line bg-slate-50 text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Morning Membership (6 AM - 8 AM)"
                  className="mt-2 w-full rounded-xl border border-line bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>
          ) : (
            /* Form fields for Temporary Maintenance */
            <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50/60 p-3.5 sm:p-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700">
                  🛠️ Maintenance & Event Closure
                </span>
                <span className="text-[10px] text-slate-500">Specific date range</span>
              </div>

              {/* Start Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-slate-500">Start Date</label>
                  <input
                    type="date"
                    value={startDateKey}
                    onChange={(e) => {
                      setStartDateKey(e.target.value);
                      if (e.target.value > endDateKey) {
                        setEndDateKey(e.target.value);
                      }
                    }}
                    className="mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none [color-scheme:light] focus:border-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-slate-500">Start Time</label>
                  <select
                    value={tempStartHour}
                    onChange={(e) => setTempStartHour(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-rose-500"
                  >
                    {HOURS.slice(0, -1).map((h) => {
                      const t = hourToTimeString(h);
                      return (
                        <option key={t} value={t} className="bg-white">
                          {timeToHourLabel(t)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* End Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-medium text-slate-500">End Date</label>
                  <input
                    type="date"
                    value={endDateKey}
                    onChange={(e) => setEndDateKey(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none [color-scheme:light] focus:border-rose-500"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] font-medium text-slate-500">End Time</label>
                  <select
                    value={tempEndHour}
                    onChange={(e) => setTempEndHour(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-line bg-slate-50 px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-rose-500"
                  >
                    {HOURS.slice(1).map((h) => {
                      const t = hourToTimeString(h);
                      return (
                        <option key={t} value={t} className="bg-white">
                          {timeToHourLabel(t)}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Reason presets */}
              <div>
                <label className="text-[10px] font-medium text-slate-500">Reason / Tag</label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {MAINTENANCE_REASON_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setReason(preset)}
                      className={`rounded-lg px-2 py-1 text-[10px] font-medium transition ${
                        reason === preset
                          ? "bg-rose-100 text-rose-700 border border-rose-300"
                          : "border border-line bg-slate-50 text-slate-500 hover:text-slate-900"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Turf Maintenance or Adverse Weather"
                  className="mt-2 w-full rounded-xl border border-line bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-rose-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-between gap-2 pt-2">
            {isEditing ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Unblock Slot
              </button>
            ) : onOpenQuickEntry ? (
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  onOpenQuickEntry();
                }}
                className="text-[11px] text-slate-500 underline decoration-slate-300 hover:text-primary"
              >
                Need walk-in player entry instead?
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="h-10 rounded-xl border border-line px-3.5 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-semibold text-white shadow-md transition disabled:opacity-50 ${
                  blockType === "PERMANENT_RECURRING"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Check className="size-3.5" />
                )}
                {isEditing ? "Save Changes" : "Apply Slot Block"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
