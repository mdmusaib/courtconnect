import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Ban,
  CheckCircle2,
  Clock3,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { CancelBookingPanel } from "@/components/booking/CancelBookingPanel";
import { PageHeader } from "@/components/navigation/PageHeader";
import { calculateRefundQuote } from "@/lib/cancellation";
import { getBookingDetails } from "@/lib/booking-data";
import { getSessionUser } from "@/lib/session";
import {
  formatDateKey,
  formatDateKeyLong,
  formatINR,
  formatSlotRange,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Cancel booking",
};

function refundStatusLabel(status: string): string {
  if (status === "PENDING") return "Refund processing";
  if (status === "PROCESSED") return "Refund completed";
  if (status === "FAILED") return "Refund needs attention";
  return "No refund due";
}

export default async function CancelBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [booking, player] = await Promise.all([
    getBookingDetails(id),
    getSessionUser(),
  ]);

  if (!booking || !player || booking.userId !== player.id) {
    notFound();
  }

  const quote = calculateRefundQuote({
    status: booking.status,
    userId: booking.userId,
    slotStart: booking.slotStart,
    paidAmount: booking.paidAmount,
    convenienceFee: booking.convenienceFee,
    ownerPayout: booking.ownerPayout,
  });
  const dateLabel = formatDateKeyLong(formatDateKey(booking.slotStart));
  const timeLabel = formatSlotRange(booking.slotStart, booking.slotEnd);

  return (
    <div className="min-h-dvh pb-16">
      <PageHeader
        backHref="/my-bookings"
        backLabel="My bookings"
        title="Cancel booking"
        subtitle={`${booking.court.venue.name} · ${dateLabel}`}
        right={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/15 bg-amber-400/[0.06] px-2.5 py-1 text-[10px] font-medium text-amber-200">
            <Clock3 className="size-3" />
            Policy applies
          </span>
        }
      />

      <main className="mx-auto max-w-2xl px-4 pt-6">
        {booking.status === "CANCELLED" ? (
          <section className="animate-pop rounded-3xl border border-white/8 bg-surface/80 p-6 text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-full border border-rose-400/20 bg-rose-400/10 text-rose-300">
              <Ban className="size-8" />
            </div>
            <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-300">
              Booking cancelled
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              {booking.refundAmount > 0
                ? `${formatINR(booking.refundAmount)} refund ${booking.refundStatus === "PROCESSED" ? "completed" : "queued"}.`
                : "This slot has been released."}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
              {booking.cancellationReason ??
                "The booking was cancelled before the court time."}
            </p>

            <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2 text-left">
              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                  Refund
                </p>
                <p className="mt-1 text-lg font-semibold text-emerald-300">
                  {formatINR(booking.refundAmount)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/[0.025] p-3">
                <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                  Status
                </p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {refundStatusLabel(booking.refundStatus)}
                </p>
              </div>
            </div>

            {booking.refundPolicy && (
              <p className="mt-3 text-[10px] text-slate-500">
                {booking.refundPolicy}
              </p>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Link
                href="/my-bookings"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-xs font-semibold text-oled transition hover:bg-emerald-300"
              >
                <CheckCircle2 className="size-4" />
                Back to my bookings
              </Link>
              <Link
                href="/#venues"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-5 text-xs font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                Book another court
                <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </section>
        ) : (
          <>
            <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-white/7 bg-white/[0.02] p-3.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-400" />
              <p className="text-[11px] leading-relaxed text-slate-400">
                Cancellation is calculated from the time remaining before the
                slot starts. The court fee is refundable on a sliding scale; the
                convenience fee is not.
              </p>
            </div>

            <CancelBookingPanel
              booking={{
                id: booking.id,
                status: booking.status,
                venueName: booking.court.venue.name,
                courtName: booking.court.name,
                sportType: booking.court.sportType,
                dateLabel,
                timeLabel,
                paidAmount: booking.paidAmount,
                convenienceFee: booking.convenienceFee,
                ownerPayout: booking.ownerPayout,
                refundAmount: booking.refundAmount,
                refundStatus: booking.refundStatus,
                refundPolicy: booking.refundPolicy,
              }}
              quote={quote}
            />

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
              <RotateCcw className="size-3" />
              Need help instead? Contact the venue before cancelling.
            </div>
          </>
        )}
      </main>
    </div>
  );
}
