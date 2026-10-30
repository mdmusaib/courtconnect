"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  Edit3,
  Loader2,
  Lock,
  Repeat,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { formatSlotRange } from "@/lib/format";
import type { CalendarBlockItem, SlotBlockItem } from "@/lib/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function OwnerBlockDetailsModal({
  block,
  open,
  onOpenChange,
  onEdit,
}: {
  block: CalendarBlockItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (block: SlotBlockItem) => void;
}) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !block) return null;

  const isRecurring = block.blockType === "PERMANENT_RECURRING";

  const timeLabel = formatSlotRange(
    new Date(block.slotStart),
    new Date(block.slotEnd),
  );

  const daysLabel = isRecurring
    ? block.daysOfWeek.length === 7
      ? "Every Day"
      : block.daysOfWeek.map((d) => DAY_NAMES[d]).join(", ")
    : null;

  async function handleUnblock() {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/owner/blocks?id=${encodeURIComponent(block!.blockId)}`,
        { method: "DELETE" },
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to unblock slot.");
      }

      onOpenChange(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to unblock slot.");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleTriggerEdit() {
    const slotBlockItem: SlotBlockItem = {
      id: block!.blockId,
      courtId: block!.courtId,
      courtName: block!.courtName,
      venueId: block!.venueId,
      venueName: block!.venueName,
      blockType: block!.blockType,
      reason: block!.reason,
      startTime: block!.startTime,
      endTime: block!.endTime,
      startDate: block!.startDate,
      endDate: block!.endDate,
      daysOfWeek: block!.daysOfWeek,
      createdAt: new Date().toISOString(),
    };

    onOpenChange(false);
    onEdit(slotBlockItem);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#121926] p-5 shadow-2xl sm:p-6">
        {/* Header Badge */}
        <div className="flex items-start justify-between gap-3 border-b border-white/6 pb-4">
          <div className="flex items-center gap-2.5">
            {isRecurring ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300">
                <Lock className="size-3.5 text-indigo-400" />
                🔒 Membership Block
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/15 px-3 py-1 text-xs font-semibold text-rose-300">
                <Wrench className="size-3.5 text-rose-400" />
                🛠️ Maintenance
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="grid size-8 place-items-center rounded-xl border border-white/8 bg-white/[0.03] text-slate-400 transition hover:bg-white/[0.08] hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="mt-4 space-y-4">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-white">
              {block.reason}
            </h3>
            <p className="mt-0.5 text-xs text-slate-400">
              {block.courtName} · {block.venueName}
            </p>
          </div>

          <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <Clock className="size-3.5 text-emerald-400" />
                Active Hours
              </span>
              <span className="font-semibold text-white">{timeLabel}</span>
            </div>

            {isRecurring && daysLabel && (
              <div className="flex items-center justify-between text-slate-300">
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <Repeat className="size-3.5 text-indigo-400" />
                  Frequency
                </span>
                <span className="font-semibold text-indigo-300">{daysLabel}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-slate-300">
              <span className="inline-flex items-center gap-1.5 text-slate-400">
                <Calendar className="size-3.5 text-cyan-400" />
                Type
              </span>
              <span className="font-medium text-slate-300">
                {isRecurring ? "Permanent Daily Recurring" : "Temporary Closure"}
              </span>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-400">
            Players on the PWA cannot book online during these blocked hours. Unblocking frees the slot immediately.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={handleTriggerEdit}
              disabled={isDeleting}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold text-white transition hover:bg-white/[0.08]"
            >
              <Edit3 className="size-3.5" />
              Edit Block
            </button>

            <button
              type="button"
              onClick={handleUnblock}
              disabled={isDeleting}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-600 px-4 text-xs font-semibold text-white shadow-lg transition hover:bg-rose-500 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              1-Tap Unblock
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
