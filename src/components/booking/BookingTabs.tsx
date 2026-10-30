"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Ban,
  CalendarDays,
  Clock3,
  History,
  Ticket,
  WifiOff,
} from "lucide-react";
import { SportIcon } from "@/components/venue/SportVisual";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatINR } from "@/lib/format";
import type { BookingListItem } from "@/lib/types";

export function BookingTabs({ bookings }: { bookings: BookingListItem[] }) {
  const [tab, setTab] = useState<"active" | "past">("active");

  const activeBookings = useMemo(
    () =>
      bookings
        .filter((booking) => booking.isActive)
        .sort(
          (a, b) =>
            new Date(a.slotStart).getTime() - new Date(b.slotStart).getTime(),
        ),
    [bookings],
  );

  const pastBookings = useMemo(
    () =>
      bookings
        .filter((booking) => !booking.isActive)
        .sort(
          (a, b) =>
            new Date(b.slotStart).getTime() - new Date(a.slotStart).getTime(),
        ),
    [bookings],
  );

  const visible = tab === "active" ? activeBookings : pastBookings;

  return (
    <div className="mt-6">
      <div className="flex rounded-2xl border border-white/8 bg-surface/60 p-1">
        <TabButton
          active={tab === "active"}
          onClick={() => setTab("active")}
          icon={<CalendarDays className="size-3.5" />}
          label="Active"
          count={activeBookings.length}
        />
        <TabButton
          active={tab === "past"}
          onClick={() => setTab("past")}
          icon={<History className="size-3.5" />}
          label="Past"
          count={pastBookings.length}
        />
      </div>

      {visible.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            variant="bookings"
            title={
              tab === "active"
                ? "No upcoming games yet"
                : "No past bookings yet"
            }
            description={
              tab === "active"
                ? "Your confirmed passes and pending payments will show up here."
                : "Once you play, your game history and passes stay here."
            }
            actionLabel="Find a court"
            actionHref="/#venues"
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {visible.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))}
        </div>
      )}

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-white/7 bg-white/[0.02] p-3.5">
        <WifiOff className="mt-0.5 size-4 shrink-0 text-slate-500" />
        <p className="text-[10px] leading-relaxed text-slate-500">
          <span className="font-semibold text-slate-300">Offline ready.</span>{" "}
          This page and recent passes are cached on your device by the CourtConnect
          service worker.
        </p>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
        active
          ? "bg-emerald-400 text-oled shadow-[0_6px_24px_-10px_rgba(16,185,129,0.8)]"
          : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {icon}
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[9px] ${
          active ? "bg-oled/15 text-oled" : "bg-white/[0.05] text-slate-500"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function BookingCard({ booking }: { booking: BookingListItem }) {
  const isPending = booking.status === "PENDING";
  const isConfirmed = booking.status === "CONFIRMED";
  const holdExpired = isPending && booking.holdExpired;
  const canPay = isPending && booking.isActive && !holdExpired;
  const amount = isPending ? booking.dueAmount : booking.paidAmount;

  return (
    <article className="overflow-hidden rounded-3xl border border-white/8 bg-surface/80 transition hover:border-white/12">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-white/8 bg-white/[0.03]">
            <SportIcon
              sport={booking.court.sportType}
              className="size-5 text-emerald-300"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {holdExpired ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-500/30 bg-slate-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  <span className="size-1.5 rounded-full bg-slate-500" />
                  Hold expired
                </span>
              ) : (
                <StatusBadge status={booking.status} />
              )}
              <span className="text-[10px] text-slate-500">
                {booking.court.sportType}
              </span>
            </div>
            <h3 className="mt-2 truncate text-sm font-semibold text-white">
              {booking.venue.name}
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {booking.court.name}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p
              className={`text-base font-semibold tracking-tight ${
                isPending ? "text-amber-300" : "text-white"
              }`}
            >
              {formatINR(amount)}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-slate-500">
              {isPending ? "Due" : "Paid"}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-white/6 bg-white/[0.02] px-2.5 py-2 text-[11px] text-slate-300">
            <CalendarDays className="size-3.5 shrink-0 text-emerald-400" />
            <span className="truncate">{booking.dateLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-white/6 bg-white/[0.02] px-2.5 py-2 text-[11px] text-slate-300">
            <Clock3 className="size-3.5 shrink-0 text-cyan-400" />
            <span className="truncate">{booking.timeLabel}</span>
          </div>
        </div>

        {booking.status === "CANCELLED" && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-rose-400/12 bg-rose-400/[0.035] px-2.5 py-2">
            <span className="text-[10px] text-slate-400">
              {booking.refundAmount > 0
                ? booking.refundStatus === "PROCESSED"
                  ? "Refund completed"
                  : booking.refundStatus === "FAILED"
                    ? "Refund needs attention"
                    : "Refund processing"
                : "No refund due"}
            </span>
            <span
              className={`text-[11px] font-semibold ${
                booking.refundAmount > 0 ? "text-emerald-300" : "text-slate-400"
              }`}
            >
              {formatINR(booking.refundAmount)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/6 bg-white/[0.012] px-4 py-3">
        <p className="min-w-0 truncate font-mono text-[9px] text-slate-600">
          #{booking.id.slice(0, 8).toUpperCase()}
        </p>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {isConfirmed && booking.isActive && (
            <Link
              href={`/booking/success/${booking.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-emerald-400 px-3 text-[10px] font-semibold text-oled transition hover:bg-emerald-300"
            >
              <Ticket className="size-3" />
              View pass
            </Link>
          )}

          {canPay && (
            <Link
              href={`/checkout/${booking.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-amber-400 px-3 text-[10px] font-semibold text-oled transition hover:bg-amber-300"
            >
              Complete payment
              <ArrowRight className="size-3" />
            </Link>
          )}

          {booking.canCancel && (
            <Link
              href={`/booking/cancel/${booking.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-3 text-[10px] font-semibold text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-400/[0.1]"
            >
              <Ban className="size-3" />
              Cancel
            </Link>
          )}

          {((!isConfirmed && !canPay) ||
            (isConfirmed && !booking.isActive)) && (
            <Link
              href={`/venue/${booking.venue.id}/book?courtId=${booking.court.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-[10px] font-semibold text-slate-300 transition hover:border-emerald-400/30 hover:text-emerald-300"
            >
              Book again
              <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
