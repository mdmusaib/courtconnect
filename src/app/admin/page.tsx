import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarCheck2,
  ClipboardCheck,
  Gauge,
  IndianRupee,
  Scale,
  ShieldCheck,
  ShieldEllipsis,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { DisputeBadge } from "@/components/admin/AdminBadges";
import { getAdminOverviewData } from "@/lib/admin-data";
import {
  formatDateKey,
  formatDateKeyLong,
  formatINR,
} from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Super Admin",
};

export default async function AdminOverviewPage() {
  const data = await getAdminOverviewData();
  const todayLabel = formatDateKeyLong(formatDateKey(new Date()));
  const pendingVenues = data.venues.filter(
    (venue) => venue.verificationStatus === "PENDING",
  );
  const openDisputes = data.disputes.filter(
    (dispute) =>
      dispute.status === "OPEN" || dispute.status === "UNDER_REVIEW",
  );
  const maxDailyGmv = Math.max(
    1,
    ...data.dailyRevenue.map((day) => day.gmv),
  );

  return (
    <div className="animate-fade-up">
      <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-[#17243a] via-surface to-oled p-5 shadow-[0_30px_90px_-55px_rgba(0,0,0,1)] sm:p-7">
        <div className="pointer-events-none absolute -right-24 -top-28 size-72 rounded-full bg-emerald-400/[0.09] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-cyan-400/[0.06] blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
                <ShieldEllipsis className="size-3" />
                Super Admin
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[10px] font-medium text-slate-400">
                <Gauge className="size-3 text-emerald-300" />
                {todayLabel}
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Platform control, without the noise.
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
              Verify new venues, audit global revenue, and override player
              disputes from one console. Every action is written to the audit
              trail.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300">
                <TrendingUp className="size-3.5 text-emerald-400" />
                Lifetime GMV{" "}
                <strong className="font-semibold text-white">
                  {formatINR(data.revenue.totals.gmv)}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300">
                <IndianRupee className="size-3.5 text-cyan-300" />
                Platform fees{" "}
                <strong className="font-semibold text-white">
                  {formatINR(data.revenue.totals.platformRevenue)}
                </strong>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] text-slate-300">
                <Wallet className="size-3.5 text-amber-300" />
                Owner payouts{" "}
                <strong className="font-semibold text-white">
                  {formatINR(data.revenue.totals.ownerPayout)}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row xl:flex-col">
            <Link
              href="/admin/venues?status=PENDING"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-4 text-sm font-semibold text-oled transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <ClipboardCheck className="size-4" />
              Review {data.counts.pendingVenues} venue
              {data.counts.pendingVenues === 1 ? "" : "s"}
            </Link>
            <Link
              href="/admin/disputes?status=OPEN"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
            >
              <Scale className="size-4" />
              {data.counts.openDisputes} open dispute
              {data.counts.openDisputes === 1 ? "" : "s"}
            </Link>
          </div>
        </div>

        <div className="relative mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={Banknote}
            label="Lifetime GMV"
            value={formatINR(data.revenue.totals.gmv)}
            hint={`${data.revenue.totals.onlinePayments} verified online payment${data.revenue.totals.onlinePayments === 1 ? "" : "s"}`}
            accent="text-emerald-300"
            iconClass="border-emerald-400/20 bg-emerald-400/10"
          />
          <Metric
            icon={IndianRupee}
            label="Platform revenue"
            value={formatINR(data.revenue.totals.platformRevenue)}
            hint="₹25 convenience fee per online booking"
            accent="text-cyan-300"
            iconClass="border-cyan-400/20 bg-cyan-400/10"
          />
          <Metric
            icon={Wallet}
            label="Owner payouts"
            value={formatINR(data.revenue.totals.ownerPayout)}
            hint={`${formatINR(data.revenue.totals.directRevenue)} via direct entries`}
            accent="text-amber-300"
            iconClass="border-amber-400/20 bg-amber-400/10"
          />
          <Metric
            icon={ShieldCheck}
            label="Verified venues"
            value={`${data.counts.verifiedVenues}/${data.counts.venues}`}
            hint={
              data.counts.pendingVenues > 0
                ? `${data.counts.pendingVenues} awaiting verification`
                : "Verification queue clear"
            }
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
                Last 7 days
              </p>
              <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-white">
                Revenue pulse
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Verified payment volume and platform fees by booking date.
              </p>
            </div>
            <Link
              href="/admin/payouts"
              className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium text-slate-300 transition hover:border-emerald-400/25 hover:text-emerald-300"
            >
              Full ledger
              <ArrowRight className="size-3" />
            </Link>
          </div>

          <div className="px-5 pb-5 pt-4">
            <div className="flex h-44 items-end gap-2 sm:gap-3">
              {data.dailyRevenue.map((day) => {
                const height = Math.max(
                  4,
                  Math.round((day.gmv / maxDailyGmv) * 100),
                );

                return (
                  <div
                    key={day.dateKey}
                    className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
                  >
                    <span className="text-[9px] font-medium text-slate-500 opacity-0 transition group-hover:opacity-100">
                      {formatINR(day.gmv)}
                    </span>
                    <div className="flex w-full flex-1 items-end">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500/70 via-emerald-400 to-cyan-300 transition group-hover:from-emerald-400 group-hover:to-cyan-200"
                        style={{ height: `${height}%` }}
                        title={`${day.label}: ${formatINR(day.gmv)} GMV · ${formatINR(day.platformRevenue)} platform`}
                      />
                    </div>
                    <div className="text-center">
                      <p className="text-[9px] font-semibold text-slate-400">
                        {day.label}
                      </p>
                      <p className="text-[8px] text-slate-600">
                        {day.bookings} bk
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat
                label="Today GMV"
                value={formatINR(
                  data.dailyRevenue[data.dailyRevenue.length - 1]?.gmv ?? 0,
                )}
              />
              <MiniStat
                label="Today fees"
                value={formatINR(data.today.platformRevenue)}
              />
              <MiniStat
                label="Games today"
                value={String(data.today.confirmedBookings)}
              />
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/8 bg-surface/70">
          <div className="flex items-start justify-between gap-3 border-b border-white/6 px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-300">
                Verification queue
              </p>
              <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-white">
                New venues
              </h2>
            </div>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/[0.08] px-2 py-1 text-[9px] font-semibold text-amber-200">
              {pendingVenues.length} pending
            </span>
          </div>

          {pendingVenues.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] text-emerald-300">
                <ShieldCheck className="size-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">
                Every venue is reviewed.
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                New listings will land here before they appear in player
                discovery.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.045]">
              {pendingVenues.slice(0, 4).map((venue) => (
                <Link
                  key={venue.id}
                  href="/admin/venues?status=PENDING"
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/[0.02] sm:px-5"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-amber-400/15 bg-amber-400/[0.06] text-amber-300">
                    <ShieldCheck className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white">
                      {venue.name}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {venue.city} · {venue.owner.name} · {venue.courts.length}{" "}
                      court{venue.courts.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <ArrowUpRight className="size-3.5 shrink-0 text-slate-600" />
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-white/6 px-5 py-3">
            <Link
              href="/admin/venues"
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-emerald-300 transition hover:text-emerald-200"
            >
              Open venue verification
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="overflow-hidden rounded-3xl border border-white/8 bg-surface/70">
          <div className="flex items-start justify-between gap-3 border-b border-white/6 px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300">
                Player support
              </p>
              <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-white">
                Disputes needing attention
              </h2>
            </div>
            <Link
              href="/admin/disputes"
              className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-medium text-slate-300 transition hover:border-cyan-400/25 hover:text-cyan-300"
            >
              All disputes
              <ArrowRight className="size-3" />
            </Link>
          </div>

          {openDisputes.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-white/8 bg-white/[0.03] text-slate-500">
                <Scale className="size-5" />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">
                No open disputes.
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
                Refund and double-booking cases will appear here for an admin
                override.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.045]">
              {openDisputes.slice(0, 3).map((dispute) => (
                <Link
                  key={dispute.id}
                  href="/admin/disputes"
                  className="block px-4 py-3 transition hover:bg-white/[0.02] sm:px-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-white">
                        {dispute.reason}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-500">
                        {dispute.booking.venueName} ·{" "}
                        {dispute.booking.dateLabel} ·{" "}
                        {dispute.booking.timeLabel}
                      </p>
                    </div>
                    <DisputeBadge status={dispute.status} />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3 text-[9px] text-slate-600">
                    <span>
                      {dispute.player?.name ?? "Unknown player"}
                      {dispute.player?.phone ? ` · ${dispute.player.phone}` : ""}
                    </span>
                    <span>{formatINR(dispute.booking.paidAmount)} paid</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="border-t border-white/6 px-5 py-3">
            <Link
              href="/admin/disputes"
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-cyan-300 transition hover:text-cyan-200"
            >
              Review dispute overrides
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-white/8 bg-surface/70">
          <div className="flex items-start justify-between gap-3 border-b border-white/6 px-5 py-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-300">
                Governance
              </p>
              <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-white">
                Recent admin actions
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/[0.08] px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-violet-200">
              <ClipboardCheck className="size-3" />
              Audit log
            </span>
          </div>

          {data.actions.length === 0 ? (
            <div className="px-5 py-12 text-center text-xs text-slate-500">
              No admin actions recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.045]">
              {data.actions.slice(0, 5).map((action) => (
                <div
                  key={action.id}
                  className="flex items-start gap-3 px-4 py-3 sm:px-5"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg border border-violet-400/15 bg-violet-400/[0.06] text-violet-300">
                    <CalendarCheck2 className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] leading-relaxed text-slate-300">
                      {action.summary}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-600">
                      {action.adminName} · {action.createdAtLabel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-white/6 px-5 py-3">
            <Link
              href="/admin/payouts"
              className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-violet-300 transition hover:text-violet-200"
            >
              Audit revenue & refunds
              <ArrowRight className="size-3" />
            </Link>
          </div>
        </section>
      </div>
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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
