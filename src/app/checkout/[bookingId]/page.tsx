import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Clock3, XCircle } from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { CheckoutPanel } from "@/components/checkout/CheckoutPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getBookingDetails } from "@/lib/booking-data";
import {
  formatDateKey,
  formatDateKeyLong,
  formatSlotRange,
  formatTime,
} from "@/lib/format";
import { requireSessionUser } from "@/lib/session";
import type { CheckoutBookingData } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout",
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const [booking, player] = await Promise.all([
    getBookingDetails(bookingId),
    requireSessionUser(),
  ]);

  if (!booking) {
    notFound();
  }

  if (booking.userId !== player.id) {
    notFound();
  }

  if (booking.status === "CONFIRMED") {
    redirect(`/booking/success/${booking.id}`);
  }

  const dateLabel = formatDateKeyLong(formatDateKey(booking.slotStart));
  const timeLabel = formatSlotRange(booking.slotStart, booking.slotEnd);
  const fullDateLabel = `${dateLabel} · ${formatTime(booking.slotStart)}`;

  if (booking.status !== "PENDING") {
    return (
      <div className="min-h-dvh pb-28">
        <PageHeader
          backHref={`/venue/${booking.court.venue.id}`}
          backLabel="Venue"
          title="Checkout"
          subtitle={booking.court.venue.name}
        />
        <main className="mx-auto max-w-lg px-4 pt-10">
          <div className="rounded-3xl border border-white/8 bg-surface/80 p-6 text-center">
            <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-rose-400/20 bg-rose-400/10 text-rose-300">
              <XCircle className="size-6" />
            </div>
            <h1 className="mt-4 text-xl font-semibold text-white">
              This booking can&apos;t be paid
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              The current status is {booking.status.toLowerCase()}. The slot hold
              may have expired or the booking was changed.
            </p>
            <div className="mt-4 flex justify-center">
              <StatusBadge status={booking.status} />
            </div>
            <div className="mt-5 rounded-2xl border border-white/6 bg-white/[0.02] p-3 text-left">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {dateLabel} · {timeLabel}
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {booking.court.venue.name}
              </p>
              <p className="text-xs text-slate-400">{booking.court.name}</p>
            </div>
            <Link
              href={`/venue/${booking.court.venue.id}/book?courtId=${booking.court.id}`}
              prefetch={true}
              className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 text-xs font-semibold text-oled transition-all duration-100 active:scale-95 hover:bg-emerald-300"
            >
              Pick another slot
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const checkoutBooking: CheckoutBookingData = {
    id: booking.id,
    status: booking.status,
    paymentMode: booking.paymentMode,
    createdAt: booking.createdAt.toISOString(),
    slotStart: booking.slotStart.toISOString(),
    slotEnd: booking.slotEnd.toISOString(),
    userId: booking.userId,
    paidAmount: booking.paidAmount,
    dueAmount: booking.dueAmount,
    convenienceFee: booking.convenienceFee,
    ownerPayout: booking.ownerPayout,
    utrNumber: booking.utrNumber,
    dateLabel,
    timeLabel,
    fullDateLabel,
    court: {
      id: booking.court.id,
      name: booking.court.name,
      sportType: booking.court.sportType,
      price: booking.court.price,
      venue: {
        id: booking.court.venue.id,
        name: booking.court.venue.name,
        address: booking.court.venue.address,
        city: booking.court.venue.city,
      },
    },
  };

  return (
    <div className="min-h-dvh pb-28">
      <PageHeader
        backHref={`/venue/${booking.court.venue.id}/book?courtId=${booking.court.id}`}
        backLabel="Slots"
        title="Checkout"
        subtitle={`${booking.court.venue.name} · ${dateLabel}`}
        right={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[10px] font-medium text-cyan-200">
            <Clock3 className="size-3" />
           1 min hold
          </span>
        }
      />

      <main className="mx-auto max-w-5xl px-4 pt-5">
        <CheckoutPanel
          booking={checkoutBooking}
          upiId={process.env.NEXT_PUBLIC_UPI_ID ?? "courtconnect@upi"}
          serverNow={new Date().toISOString()}
        />
      </main>
    </div>
  );
}
