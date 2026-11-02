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
      <div className="flex rounded-2xl border border-line bg-surface p-1">
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

      <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-line bg-white p-3.5">
        <WifiOff className="mt-0.5 size-4 shrink-0 text-slate-400" />
        <p className="text-[10px] leading-relaxed text-slate-500">
          <span className="font-semibold text-slate-700">Offline ready.</span>{" "}
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
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        active
          ? "bg-white text-slate-900 shadow-card"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      {icon}
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[9px] ${
          active ? "bg-primary-soft text-emerald-700" : "bg-slate-100 text-slate-500"
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
    <article className="overflow-hidden rounded-3xl border border-line bg-card shadow-card transition hover:shadow-lift">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-line bg-slate-50">
            <SportIcon
              sport={booking.court.sportType}
              className="size-5 text-primary"
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {holdExpired ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  <span className="size-1.5 rounded-full bg-slate-400" />
                  Hold expired
                </span>
              ) : (
                <StatusBadge status={booking.status} />
              )}
              <span className="text-[10px] text-slate-500">
                {booking.court.sportType}
              </span>
            </div>
            <h3 className="mt-2 truncate text-sm font-semibold text-slate-900">
              {booking.venue.name}
            </h3>
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              {booking.court.name}
            </p>
          </div>

          <div className="shrink-0 text-right">
            <p
              className={`text-base font-semibold tracking-tight ${
                isPending ? "text-amber-600" : "text-slate-900"
              }`}
            >
              {formatINR(amount)}
            </p>
            <p className="text-[9px] uppercase tracking-wider text-slate-400">
              {isPending ? "Due" : "Paid"}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-slate-50 px-2.5 py-2 text-[11px] text-slate-700">
            <CalendarDays className="size-3.5 shrink-0 text-primary" />
            <span className="truncate">{booking.dateLabel}</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl border border-line bg-slate-50 px-2.5 py-2 text-[11px] text-slate-700">
            <Clock3 className="size-3.5 shrink-0 text-cyan-600" />
            <span className="truncate">{booking.timeLabel}</span>
          </div>
        </div>

        {booking.status === "CANCELLED" && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-2">
            <span className="text-[10px] text-slate-500">
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
                booking.refundAmount > 0 ? "text-primary" : "text-slate-400"
              }`}
            >
              {formatINR(booking.refundAmount)}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-slate-50 px-4 py-3">
        <p className="min-w-0 truncate font-mono text-[9px] text-slate-400">
          #{booking.id.slice(0, 8).toUpperCase()}
        </p>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
          {isConfirmed && booking.isActive && (
            <Link
              href={`/booking/success/${booking.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-primary px-3 text-[10px] font-semibold text-white transition hover:bg-primary-deep"
            >
              <Ticket className="size-3" />
              View pass
            </Link>
          )}

          {canPay && (
            <Link
              href={`/checkout/${booking.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg bg-amber-500 px-3 text-[10px] font-semibold text-white transition hover:bg-amber-600"
            >
              Complete payment
              <ArrowRight className="size-3" />
            </Link>
          )}

          {booking.canCancel && (
            <Link
              href={`/booking/cancel/${booking.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[10px] font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100"
            >
              <Ban className="size-3" />
              Cancel
            </Link>
          )}

          {((!isConfirmed && !canPay) ||
            (isConfirmed && !booking.isActive)) && (
            <Link
              href={`/venue/${booking.venue.id}/book?courtId=${booking.court.id}`}
              className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-white px-3 text-[10px] font-semibold text-slate-600 transition hover:border-primary/40 hover:text-primary"
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
