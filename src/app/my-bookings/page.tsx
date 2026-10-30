import { CalendarDays, Clock3, Wallet, WifiOff } from "lucide-react";
import { BookingTabs } from "@/components/booking/BookingTabs";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PushNotificationCard } from "@/components/notifications/PushNotificationCard";
import { OfflinePassCache } from "@/components/pwa/OfflinePassCache";
import { getPlayerBookings } from "@/lib/booking-data";
import { formatINR } from "@/lib/format";
import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My bookings",
};

export default async function MyBookingsPage() {
  const player = await getSessionUser();

  if (!player) {
    redirect("/login?next=%2Fmy-bookings");
  }

  const bookings = await getPlayerBookings(player.phone);

  const confirmed = bookings.filter(
    (booking) => booking.status === "CONFIRMED",
  );
  const totalHours = confirmed.reduce(
    (hours, booking) =>
      hours +
      (new Date(booking.slotEnd).getTime() -
        new Date(booking.slotStart).getTime()) /
        (60 * 60 * 1000),
    0,
  );
  const totalSpent = confirmed.reduce(
    (total, booking) => total + booking.paidAmount,
    0,
  );
  const upcomingCount = bookings.filter(
    (booking) => booking.isActive,
  ).length;

  // Warm the pass cache for every active confirmed booking so a player can
  // open any of their upcoming passes without a network connection, even if
  // they have not visited that pass page yet.
  const activePassUrls = bookings
    .filter(
      (booking) => booking.status === "CONFIRMED" && booking.isActive,
    )
    .map((booking) => `/booking/success/${booking.id}`);
  const offlineUrls = Array.from(
    new Set(["/my-bookings", ...activePassUrls]),
  );

  return (
    <div className="min-h-dvh pb-28">
      <PageHeader
        backHref="/"
        backLabel="Home"
        title="My bookings"
        subtitle={player ? `Player · ${player.name}` : "Passes and game history"}
        right={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.06] px-2.5 py-1 text-[10px] font-medium text-cyan-200">
            <WifiOff className="size-3" />
            Offline
          </span>
        }
      />

      <main className="mx-auto max-w-4xl px-4 pt-6">
        <section className="animate-fade-up overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-surface via-surface to-oled p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Your court time
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                {upcomingCount > 0
                  ? "You have a game coming up."
                  : "Ready for your next game?"}
              </h1>
              <p className="mt-1.5 text-xs text-slate-400">
                Passes, payments, and past games in one place.
              </p>
            </div>
            <div className="hidden rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-right sm:block">
              <p className="text-[9px] uppercase tracking-[0.16em] text-slate-500">
                Upcoming
              </p>
              <p className="text-xl font-semibold text-emerald-400">
                {upcomingCount}
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Stat
              icon={<CalendarDays className="size-3.5" />}
              value={String(confirmed.length)}
              label="Confirmed"
            />
            <Stat
              icon={<Clock3 className="size-3.5" />}
              value={`${totalHours % 1 === 0 ? totalHours : totalHours.toFixed(1)}h`}
              label="Court time"
            />
            <Stat
              icon={<Wallet className="size-3.5" />}
              value={formatINR(totalSpent)}
              label="Total spent"
            />
          </div>
        </section>

        <PushNotificationCard />

        <BookingTabs bookings={bookings} />
      </main>

      <OfflinePassCache urls={offlineUrls} />
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.025] px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-slate-500">
        <span className="text-emerald-400">{icon}</span>
        <span className="text-[9px] uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-1 text-base font-semibold text-white">{value}</p>
    </div>
  );
}
