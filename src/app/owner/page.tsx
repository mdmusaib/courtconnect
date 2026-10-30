import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CalendarPlus,
  Clock3,
  Gauge,
  LayoutDashboard,
  Sparkles,
  Ticket,
  TrendingUp,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { BookingSourceTag } from "@/components/owner/BookingSourceTag";
import { OwnerQuickEntryModal } from "@/components/OwnerQuickEntryModal";
import {
  formatDateKey,
  formatDateKeyLong,
  formatINR,
  formatRelativeDateKey,
  formatSlotRange,
} from "@/lib/format";
import { getOwnerDashboardData } from "@/lib/owner-data";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Owner dashboard",
};

export default async function OwnerDashboardPage() {
  const owner = await requireRole(["OWNER", "ADMIN"], "owner");

  const data = await getOwnerDashboardData(owner.id);
  const courts = data.venues.flatMap((venue) =>
    venue.courts.map((court) => ({
      id: court.id,
      name: court.name,
      venueId: venue.id,
      venueName: venue.name,
      sportType: court.sportType,
      price: court.price,
    })),
  );
  const nextBooking = data.nextBooking;
  const schedule = data.todayBookings.slice(0, 8);

  return (
    <div className="animate-fade-up">
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-[#17243a] via-surface to-oled p-5 shadow-[0_30px_90px_-55px_rgba(0,0,0,1)] sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-emerald-400/[0.09] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-cyan-400/[0.05] blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                <LayoutDashboard className="size-3" />
                Owner command centre
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] font-medium text-slate-400">
                <Sparkles className="size-3 text-cyan-300" />
                AI-free direct entry
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Your turf, at a glance.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              {formatDateKeyLong(data.todayKey)} · {data.courtCount} courts ·{" "}
              {data.venues.map((venue) => venue.name).join(" · ")}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300">
                <TrendingUp className="size-3.5 text-emerald-400" />
                Booked value{" "}
                <strong className="font-semibold text-white">
                  {formatINR(data.totalRevenue)}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300">
                <Banknote className="size-3.5 text-amber-300" />
                Direct{" "}
                <strong className="font-semibold text-white">
                  {formatINR(data.directRevenue)}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300">
                <Wallet className="size-3.5 text-cyan-300" />
                Online payout{" "}
                <strong className="font-semibold text-white">
                  {formatINR(data.onlinePayout)}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row xl:flex-col">
            <OwnerQuickEntryModal courts={courts} todayKey={data.todayKey} />
            <Link
              href="/owner/calendar"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
            >
              <CalendarDays className="size-4" />
              Open calendar
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={Ticket}
            label="Bookings today"
            value={String(data.confirmedCount)}
            hint={
              data.pendingCount > 0
                ? `${data.pendingCount} online hold${data.pendingCount === 1 ? "" : "s"}`
                : `${data.maintenanceCount} maintenance block${data.maintenanceCount === 1 ? "" : "s"}`
            }
            accent="text-emerald-300"
            iconClass="border-emerald-400/20 bg-emerald-400/10"
          />
          <Metric
            icon={Banknote}
            label="Cash collected"
            value={formatINR(data.cashCollected)}
            hint="Walk-in cash logged today"
            accent="text-amber-300"
            iconClass="border-amber-400/20 bg-amber-400/10"
          />
          <Metric
            icon={Wallet}
            label="Online payouts due"
            value={formatINR(data.onlinePayout)}
            hint="100% court rate, 0% commission"
            accent="text-cyan-300"
            iconClass="border-cyan-400/20 bg-cyan-400/10"
          />
          <Metric
            icon={Gauge}
            label="Occupancy"
            value={`${data.occupancyRate}%`}
            hint={`${data.bookedHours}h booked across ${data.courtCount} courts`}
            accent="text-violet-300"
            iconClass="border-violet-400/20 bg-violet-400/10"
          />
        </div>
      </section>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.45fr_1fr]">
        <section className="overflow-hidden rounded-3xl border border-white/8 bg-surface/70">
          <div className="flex items-start justify-between gap-3 border-b border-white/6 px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Live today
              </p>
              <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-white">
                Court flow
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Online, walk-in, phone, and maintenance blocks.
              </p>
            </div>
            <Link
              href="/owner/calendar"
              className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium text-slate-300 transition hover:border-emerald-400/25 hover:text-emerald-300"
            >
              Full calendar
              <ArrowRight className="size-3" />
            </Link>
          </div>

          {schedule.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/8 bg-white/[0.03] text-slate-500">
                <CalendarPlus className="size-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">
                No court activity yet today.
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                Use Quick entry above to log a walk-in, phone booking, or direct
                ground QR payment in seconds.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.045]">
              {schedule.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.02] sm:px-5"
                >
                  <div className="w-[4.6rem] shrink-0">
                    <p className="text-[11px] font-semibold text-white">
                      {formatSlotRange(
                        new Date(booking.slotStart),
                        new Date(booking.slotEnd),
                      ).split(" – ")[0]}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      {formatRelativeDateKey(
                        formatDateKey(new Date(booking.slotStart)),
                      )}
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-xs font-semibold text-white">
                        {booking.courtName}
                      </p>
                      <BookingSourceTag
                        status={booking.status}
                        paymentMode={booking.paymentMode}
                      />
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {booking.customerName ?? booking.venueName}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-white">
                      {booking.status === "MAINTENANCE"
                        ? "Blocked"
                        : formatINR(booking.ownerPayout)}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      {booking.status === "PENDING"
                        ? "Hold"
                        : booking.status === "MAINTENANCE"
                          ? "Maintenance"
                          : booking.dueAmount > 0
                            ? `${formatINR(booking.dueAmount)} due`
                            : "Paid"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <section className="rounded-3xl border border-white/8 bg-surface/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                  Court load
                </p>
                <h2 className="mt-0.5 text-base font-semibold text-white">
                  Occupancy by court
                </h2>
              </div>
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-1 text-[9px] text-slate-400">
                {data.bookedHours}h total
              </span>
            </div>

            <div className="mt-4 space-y-3.5">
              {data.courtUtilization.map((item) => (
                <div key={item.court.id}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-white">
                        {item.court.name}
                      </p>
                      <p className="truncate text-[9px] text-slate-500">
                        {item.court.venueName}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[11px] font-semibold text-white">
                        {item.utilization}%
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {formatINR(item.revenue)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                      style={{ width: `${item.utilization}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-emerald-400/12 bg-gradient-to-br from-emerald-400/[0.08] via-surface/70 to-surface/70 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                  Next up
                </p>
                <h2 className="mt-0.5 text-base font-semibold text-white">
                  {nextBooking ? "Next confirmed game" : "No upcoming game yet"}
                </h2>
              </div>
              <span className="grid size-9 place-items-center rounded-xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                <Clock3 className="size-4" />
              </span>
            </div>

            {nextBooking ? (
              <>
                <p className="mt-3 text-xl font-semibold tracking-tight text-white">
                  {formatSlotRange(
                    new Date(nextBooking.slotStart),
                    new Date(nextBooking.slotEnd),
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {formatDateKeyLong(
                    formatDateKey(new Date(nextBooking.slotStart)),
                  )}{" "}
                  · {nextBooking.courtName}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <BookingSourceTag
                    status={nextBooking.status}
                    paymentMode={nextBooking.paymentMode}
                  />
                  <span className="text-[10px] text-slate-500">
                    {nextBooking.customerName ?? nextBooking.venueName}
                  </span>
                </div>
                <Link
                  href="/owner/calendar"
                  className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-300 transition hover:text-emerald-200"
                >
                  See it on the calendar
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                Fill the next slot with a walk-in or phone booking. Direct
                entries are confirmed instantly with a ₹0 platform fee.
              </p>
            )}
          </section>
        </div>
      </div>

      <section className="mt-4 overflow-hidden rounded-3xl border border-white/8 bg-surface/70">
        <div className="flex items-start justify-between gap-3 border-b border-white/6 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
              Direct ledger
            </p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-white">
              Recent direct entries
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Walk-in, phone, and ground QR bookings logged by your team.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-200">
            <Zap className="size-3" />
            ₹0 platform fee
          </span>
        </div>

        {data.recentDirectEntries.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold text-white">
              No direct entries yet.
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              Quick-entry bookings will appear here with the source, collected
              amount, and venue.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-white/6 text-[9px] uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Court</th>
                  <th className="px-3 py-2.5 font-medium">Source</th>
                  <th className="px-3 py-2.5 font-medium">Slot</th>
                  <th className="px-3 py-2.5 font-medium">Player</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.045]">
                {data.recentDirectEntries.map((entry) => (
                  <tr key={entry.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <p className="text-xs font-medium text-white">
                        {entry.courtName}
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {entry.venueName}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <BookingSourceTag
                        status={entry.status}
                        paymentMode={entry.paymentMode}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[11px] text-slate-300">
                        {formatDateKeyLong(
                          formatDateKey(new Date(entry.slotStart)),
                        )}
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {formatSlotRange(
                          new Date(entry.slotStart),
                          new Date(entry.slotEnd),
                        )}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-slate-400">
                      {entry.customerName ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <p className="text-xs font-semibold text-white">
                        {formatINR(entry.ownerPayout)}
                      </p>
                      <p className="text-[9px] text-amber-300/80">
                        {entry.dueAmount > 0
                          ? `${formatINR(entry.dueAmount)} due`
                          : "Collected"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  iconClass,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  accent: string;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-black/10 p-3.5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <span
          className={`grid size-8 place-items-center rounded-xl border ${iconClass}`}
        >
          <Icon className={`size-4 ${accent}`} />
        </span>
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-2.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9px] text-slate-500">{hint}</p>
    </div>
  );
}
