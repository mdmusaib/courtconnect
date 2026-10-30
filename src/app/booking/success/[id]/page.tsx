import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import QRCode from "qrcode";
import {
  ArrowRight,
  Ban,
  CalendarPlus,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  ShieldCheck,
  Ticket,
  WifiOff,
} from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { OfflinePassCache } from "@/components/pwa/OfflinePassCache";
import {
  PaymentVerificationLogger,
  type PaymentVerificationTrace,
} from "@/components/checkout/PaymentVerificationLogger";
import { getBookingDetails } from "@/lib/booking-data";
import {
  formatDateKey,
  formatDateKeyLong,
  formatDateTimeLong,
  formatINR,
  formatSlotRange,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Booking confirmed",
};

function toGoogleCalendarDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
}

export default async function BookingSuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const booking = await getBookingDetails(id);

  if (!booking) {
    notFound();
  }

  if (booking.status === "PENDING") {
    redirect(`/checkout/${booking.id}`);
  }

  if (booking.status !== "CONFIRMED") {
    return (
      <div className="min-h-dvh pb-28">
        <PageHeader
          backHref="/my-bookings"
          backLabel="Bookings"
          title="Booking pass"
          subtitle={booking.court.venue.name}
        />
        <main className="mx-auto max-w-lg px-4 pt-10">
          <div className="rounded-3xl border border-white/8 bg-surface/80 p-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
              <Ticket className="size-6" />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-white">
              This pass isn&apos;t active
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              The booking is currently {booking.status.toLowerCase()}.
            </p>
            <Link
              href="/my-bookings"
              className="mt-5 inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-xs font-semibold text-oled"
            >
              View my bookings
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const dateLabel = formatDateKeyLong(formatDateKey(booking.slotStart));
  const timeLabel = formatSlotRange(booking.slotStart, booking.slotEnd);
  const amountPaid = booking.paidAmount;
  const qrDataUrl = await QRCode.toDataURL(
    `courtconnect://booking/${booking.id}`,
    {
      width: 320,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#0B0F17", light: "#FFFFFF" },
    },
  );

  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `CourtConnect · ${booking.court.venue.name}`,
  )}&dates=${toGoogleCalendarDate(booking.slotStart)}/${toGoogleCalendarDate(
    booking.slotEnd,
  )}&details=${encodeURIComponent(
    `${booking.court.name} · Booking ${booking.id}`,
  )}&location=${encodeURIComponent(
    `${booking.court.venue.name}, ${booking.court.venue.address}`,
  )}`;

  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${booking.court.venue.name}, ${booking.court.venue.address}`,
  )}`;

  const hasReceiptVerification = Boolean(
    booking.aiVerifiedStatus || booking.utrNumber,
  );
  const verificationStatus =
    booking.aiVerifiedStatus ?? (booking.utrNumber ? "SUCCESS" : booking.status);
  const verificationAmount = booking.aiVerifiedAmount ?? booking.paidAmount;
  const verificationModel = booking.aiVerifiedModel ?? "gemini-2.5-flash";
  const verificationTrace: PaymentVerificationTrace = {
    bookingId: booking.id,
    courtName: booking.court.name,
    status: verificationStatus,
    utr: booking.utrNumber,
    amount: verificationAmount,
    model: verificationModel,
    app: booking.aiVerifiedApp,
    confidence: booking.aiVerifiedConfidence,
    verifiedAt: booking.aiVerifiedAt?.toISOString() ?? null,
  };

  return (
    <div className="min-h-dvh pb-28">
      <PageHeader
        backHref="/"
        backLabel="Home"
        title="Booking confirmed"
        subtitle={booking.court.venue.name}
        right={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[10px] font-medium text-emerald-300">
            <CheckCircle2 className="size-3" />
            Paid
          </span>
        }
      />

      <main className="mx-auto max-w-4xl px-4 pt-8">
        <div className="animate-fade-up text-center">
          <div className="relative mx-auto grid size-20 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/10" />
            <span className="relative grid size-20 place-items-center rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 shadow-[0_0_60px_-15px_rgba(16,185,129,0.8)]">
              <CheckCircle2 className="size-10" strokeWidth={1.8} />
            </span>
          </div>
          <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400">
            Payment verified · Slot locked
          </p>
          <h1 className="text-balance mt-2 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
            You&apos;re on the pitch.
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
            Your pass is ready. Show the QR at the venue entrance and enjoy the
            game.
          </p>
        </div>

        <section className="relative mt-8 animate-fade-up overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-surface via-surface to-oled shadow-[0_35px_100px_-55px_rgba(16,185,129,0.55)]">
          <div className="pitch-grid absolute inset-0 opacity-30" />
          <div className="absolute -right-20 -top-24 size-64 rounded-full bg-emerald-400/[0.08] blur-3xl" />

          <div className="relative p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-400">
                  Digital match pass
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                  {booking.court.venue.name}
                </h2>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                  <MapPin className="size-3.5 text-emerald-400" />
                  {booking.court.venue.city}
                </p>
              </div>
              <div className="grid size-11 place-items-center rounded-2xl border border-white/8 bg-white/[0.03] text-emerald-300">
                <ShieldCheck className="size-5" />
              </div>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
              <div className="mx-auto rounded-2xl bg-white p-2.5 shadow-lg sm:mx-0">
                <Image
                  src={qrDataUrl}
                  alt={`QR pass for booking ${booking.id}`}
                  width={220}
                  height={220}
                  unoptimized
                  className="size-[190px] sm:size-[210px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <PassField label="Date" value={dateLabel} />
                <PassField label="Time" value={timeLabel} />
                <PassField label="Court" value={booking.court.name} />
                <PassField label="Sport" value={booking.court.sportType} />
                <PassField
                  label="Amount paid"
                  value={formatINR(amountPaid)}
                  accent
                />
                <PassField
                  label="Player"
                  value={booking.user?.name ?? "CourtConnect player"}
                />
              </div>
            </div>

            <div className="relative my-5 border-t border-dashed border-white/15">
              <span className="absolute -left-8 -top-3 size-6 rounded-full bg-oled" />
              <span className="absolute -right-8 -top-3 size-6 rounded-full bg-oled" />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  Booking reference
                </p>
                <p className="mt-1 truncate font-mono text-xs text-slate-300">
                  {booking.id.toUpperCase()}
                </p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                  UPI reference
                </p>
                <p className="mt-1 font-mono text-xs text-emerald-300">
                  {booking.utrNumber ?? "—"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {hasReceiptVerification && (
          <section className="mt-4 animate-fade-up rounded-3xl border border-emerald-400/15 bg-emerald-400/[0.035] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                  <ShieldCheck className="size-5" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                    AI receipt verification
                  </p>
                  <h2 className="mt-1 text-base font-semibold text-white">
                    What Gemini read from your receipt
                  </h2>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
                <CheckCircle2 className="size-3" />
                {verificationStatus}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <PassField
                label="Extracted UTR"
                value={booking.utrNumber ?? "—"}
              />
              <PassField
                label="Extracted amount"
                value={formatINR(verificationAmount)}
                accent
              />
              <PassField
                label="Payment app"
                value={booking.aiVerifiedApp ?? "UPI"}
              />
              <PassField
                label="Verification model"
                value={verificationModel}
              />
            </div>

            <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-relaxed text-slate-500">
              <span>
                Verified{" "}
                {booking.aiVerifiedAt
                  ? formatDateTimeLong(booking.aiVerifiedAt)
                  : "during checkout"}
                .
              </span>
              {typeof booking.aiVerifiedConfidence === "number" && (
                <span>
                  Confidence{" "}
                  {Math.round(booking.aiVerifiedConfidence * 100)}%.
                </span>
              )}
              <span>
                Open the browser console for the same UTR, amount, and status
                trace.
              </span>
            </p>
          </section>
        )}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a
            href={calendarUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] text-xs font-semibold text-slate-200 transition hover:border-emerald-400/25 hover:text-white"
          >
            <CalendarPlus className="size-4 text-emerald-400" />
            Add to calendar
          </a>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/8 bg-white/[0.03] text-xs font-semibold text-slate-200 transition hover:border-emerald-400/25 hover:text-white"
          >
            <Navigation className="size-4 text-cyan-400" />
            Get directions
          </a>
          <Link
            href="/my-bookings"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-xs font-semibold text-oled transition hover:bg-emerald-300"
          >
            My bookings
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-cyan-400/12 bg-cyan-400/[0.035] p-3.5">
          <WifiOff className="mt-0.5 size-4 shrink-0 text-cyan-300" />
          <p className="text-[11px] leading-relaxed text-slate-400">
            <span className="font-semibold text-cyan-200">
              This pass is cached on your device.
            </span>{" "}
            If the venue has weak signal, open My Bookings and your most recent
            pass should still load.
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link
            href={`/booking/cancel/${booking.id}`}
            className="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500 transition hover:text-rose-300"
          >
            <Ban className="size-3" />
            Need to cancel? Review the refund policy
          </Link>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-slate-600">
          <Clock3 className="size-3" />
          Need help? Show this pass at the venue counter.
        </div>
      </main>

      <OfflinePassCache urls={[`/booking/success/${booking.id}`, "/my-bookings"]} />
      <PaymentVerificationLogger trace={verificationTrace} />
    </div>
  );
}

function PassField({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-1 text-xs font-semibold ${
          accent ? "text-emerald-300" : "text-slate-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
