"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  RotateCcw,
  ShieldCheck,
  Ticket,
  Wallet,
} from "lucide-react";
import type { RefundQuote } from "@/lib/cancellation";
import { NON_REFUNDABLE_FEE_NOTE, REFUND_TIERS } from "@/lib/cancellation";
import { formatINR } from "@/lib/format";
import type { BookingStatusValue, RefundStatusValue } from "@/lib/types";

const REASONS = [
  "Change of plans",
  "Booked the wrong slot",
  "Weather or ground conditions",
  "Player injury or illness",
  "Team could not make it",
  "Other",
] as const;

export interface CancelBookingSummary {
  id: string;
  status: BookingStatusValue;
  venueName: string;
  courtName: string;
  sportType: string;
  dateLabel: string;
  timeLabel: string;
  paidAmount: number;
  convenienceFee: number;
  ownerPayout: number;
  refundAmount: number;
  refundStatus: RefundStatusValue;
  refundPolicy: string | null;
}

interface CancelApiResponse {
  error?: string;
  code?: string;
  success?: boolean;
  alreadyCancelled?: boolean;
  booking?: {
    id: string;
    status: BookingStatusValue;
    refundAmount: number;
    refundStatus: RefundStatusValue;
    refundPolicy: string | null;
    cancelledAt: string | null;
  };
  refund?: RefundQuote;
  refundEtaLabel?: string | null;
}

export function CancelBookingPanel({
  booking,
  quote,
}: {
  booking: CancelBookingSummary;
  quote: RefundQuote;
}) {
  const router = useRouter();
  const [reason, setReason] = useState<string>(REASONS[0]);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    refundAmount: number;
    refundStatus: RefundStatusValue;
    refundPolicy: string | null;
    alreadyCancelled: boolean;
    eta: string | null;
  } | null>(null);

  async function handleCancel() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const cancellationReason = note.trim()
        ? `${reason} — ${note.trim()}`
        : reason;
      const response = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          reason: cancellationReason,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as CancelApiResponse;

      if (!response.ok || !data.booking) {
        throw new Error(data.error || "Could not cancel this booking.");
      }

      setResult({
        refundAmount: data.booking.refundAmount,
        refundStatus: data.booking.refundStatus,
        refundPolicy: data.booking.refundPolicy,
        alreadyCancelled: data.alreadyCancelled === true,
        eta: data.refundEtaLabel ?? null,
      });
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not cancel this booking.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <section className="animate-pop overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.09] via-surface to-surface p-6 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 shadow-[0_0_50px_-15px_rgba(16,185,129,0.65)]">
          <CheckCircle2 className="size-8" />
        </div>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
          {result.alreadyCancelled ? "Already cancelled" : "Cancellation confirmed"}
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
          {result.refundAmount > 0
            ? `${formatINR(result.refundAmount)} refund queued.`
            : "Your slot has been released."}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
          {result.refundAmount > 0
            ? `${result.eta ?? "Refunds are returned to the original UPI account."} The venue has been notified and the slot is available again.`
            : "No refund is due under the cancellation window. The court is now open for other players."}
        </p>

        <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2 text-left">
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Refund amount
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-300">
              {formatINR(result.refundAmount)}
            </p>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Refund status
            </p>
            <p className="mt-1 text-sm font-semibold capitalize text-white">
              {result.refundStatus === "PENDING"
                ? "Processing"
                : result.refundStatus.toLowerCase()}
            </p>
          </div>
        </div>

        {result.refundPolicy && (
          <p className="mt-3 text-[10px] text-slate-500">{result.refundPolicy}</p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/my-bookings"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-xs font-semibold text-oled transition hover:bg-emerald-300"
          >
            <Ticket className="size-4" />
            My bookings
          </Link>
          <Link
            href="/#venues"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
          >
            Find another court
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </section>
    );
  }

  const isPending = booking.status === "PENDING";
  const buttonLabel = isPending
    ? "Release held slot"
    : quote.refundAmount > 0
      ? `Cancel & refund ${formatINR(quote.refundAmount)}`
      : "Cancel without refund";

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/8 bg-surface/80 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
              Cancellation request
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
              {booking.venueName}
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {booking.courtName} · {booking.sportType}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] text-slate-300">
            <CalendarDays className="size-3 text-emerald-400" />
            {booking.dateLabel}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Court time
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-white">
              <Clock3 className="size-3.5 text-cyan-400" />
              {booking.timeLabel}
            </p>
          </div>
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Amount paid
            </p>
            <p className="mt-1 text-xs font-semibold text-white">
              {formatINR(booking.paidAmount)}
            </p>
          </div>
          <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
              Eligible now
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-300">
              {formatINR(quote.refundAmount)}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-emerald-400/15 bg-gradient-to-br from-emerald-400/[0.07] via-surface to-surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              Refund estimate
            </p>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
              {formatINR(quote.refundAmount)}
            </p>
            <p className="mt-1 text-xs text-slate-400">{quote.policyLabel}</p>
          </div>
          <div className="grid size-12 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
            <RotateCcw className="size-5" />
          </div>
        </div>

        <div className="mt-4 space-y-2 rounded-2xl border border-white/6 bg-black/10 p-3.5 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Court fee paid</span>
            <span className="font-medium text-slate-200">
              {formatINR(quote.courtFeePaid)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-slate-400">Refund percentage</span>
            <span className="font-medium text-slate-200">
              {quote.refundPercent}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Wallet className="size-3 text-slate-500" />
              Convenience fee
            </span>
            <span className="font-medium text-amber-300">
              {formatINR(quote.nonRefundableFee)} non-refundable
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 border-t border-white/8 pt-2">
            <span className="font-semibold text-white">Refund now</span>
            <span className="text-base font-semibold text-emerald-300">
              {formatINR(quote.refundAmount)}
            </span>
          </div>
        </div>

        <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
          {quote.note}
        </p>
      </section>

      <section className="rounded-3xl border border-white/8 bg-surface/80 p-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Why are you cancelling?
        </p>
        <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
          {REASONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setReason(option)}
              aria-pressed={reason === option}
              className={`rounded-xl border px-3 py-2.5 text-left text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                reason === option
                  ? "border-emerald-400/35 bg-emerald-400/[0.09] text-emerald-200"
                  : "border-white/8 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-slate-200"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="text-[10px] font-medium text-slate-500">
            Add a note <span className="text-slate-600">optional</span>
          </span>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={240}
            rows={2}
            placeholder="Anything the venue should know?"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-oled/70 px-3 py-2.5 text-xs text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/15"
          />
        </label>

        <div className="mt-4 rounded-2xl border border-amber-400/15 bg-amber-400/[0.045] p-3.5">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200">
            <AlertTriangle className="size-3.5" />
            Cancellation policy
          </p>
          <div className="mt-2 space-y-1.5">
            {REFUND_TIERS.map((tier) => (
              <div
                key={tier.minHours}
                className="flex items-center justify-between gap-3 text-[10px]"
              >
                <span className="text-slate-400">{tier.label}</span>
                <span
                  className={
                    tier.percent === quote.refundPercent && quote.courtFeePaid > 0
                      ? "font-semibold text-emerald-300"
                      : "text-slate-500"
                  }
                >
                  {tier.percent}% of court fee
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 border-t border-white/8 pt-2 text-[9px] leading-relaxed text-slate-500">
            {NON_REFUNDABLE_FEE_NOTE} Refunds are calculated from the court fee
            only and are returned to the original UPI account.
          </p>
        </div>

        {!quote.canCancel && (
          <div className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2.5 text-xs text-rose-200">
            {quote.reason}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2.5 text-xs leading-relaxed text-rose-200"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleCancel}
          disabled={submitting || !quote.canCancel}
          className={`mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:cursor-not-allowed disabled:opacity-50 ${
            quote.refundAmount > 0
              ? "bg-rose-400 text-oled hover:bg-rose-300 focus-visible:ring-rose-300"
              : "border border-white/10 bg-white/[0.04] text-slate-200 hover:border-white/20 hover:text-white focus-visible:ring-emerald-400/70"
          }`}
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Cancelling booking…
            </>
          ) : (
            <>
              <RotateCcw className="size-4" />
              {buttonLabel}
            </>
          )}
        </button>

        <p className="mt-2 text-center text-[9px] text-slate-600">
          This action cannot be undone. The court will be released immediately.
        </p>
      </section>
    </div>
  );
}
