import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CircleDollarSign,
  Filter,
  Landmark,
  RefreshCcw,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import {
  PaymentModeBadge,
  RefundBadge,
  VerificationBadge,
} from "@/components/admin/AdminBadges";
import { RefundProcessButton } from "@/components/admin/RefundProcessButton";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ADMIN_REVENUE_STATUSES,
  getAdminRevenueData,
  getAdminVenueRows,
  parseRevenueFilters,
} from "@/lib/admin-data";
import { formatINR } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Revenue & payouts",
};

export default async function AdminPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; range?: string; q?: string }>;
}) {
  const params = await searchParams;
  const filters = parseRevenueFilters(params);
  const [revenue, venues] = await Promise.all([
    getAdminRevenueData(filters),
    getAdminVenueRows("ALL"),
  ]);

  const filteredLabel =
    filters.status === "ALL"
      ? "All booking statuses"
      : filters.status.toLowerCase();
  const rangeLabel =
    filters.range === "all"
      ? "Lifetime"
      : filters.range === "30"
        ? "Last 30 days"
        : "Last 7 days";

  return (
    <div className="animate-fade-up">
      <AdminPageIntro
        eyebrow="Global ledger"
        title="Revenue & payouts"
        description="Every online payment, convenience fee, owner payout, and refund across Melvisharam and Vellore. Filters update the ledger and totals together."
      >
        <Link
          href="/admin/disputes"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          Dispute overrides
          <ArrowRight className="size-3.5" />
        </Link>
        <Link
          href="/admin/venues"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-white px-3 text-[11px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        >
          Venue queue
          <ArrowRight className="size-3.5" />
        </Link>
      </AdminPageIntro>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={TrendingUp}
          label="GMV collected"
          value={formatINR(revenue.totals.gmv)}
          hint={`${revenue.totals.bookings} matching booking${revenue.totals.bookings === 1 ? "" : "s"}`}
          accent="text-primary"
          iconClass="border-emerald-200 bg-primary-soft"
        />
        <Metric
          icon={CircleDollarSign}
          label="Platform fee revenue"
          value={formatINR(revenue.totals.platformRevenue)}
          hint={`${revenue.totals.onlinePayments} online payment${revenue.totals.onlinePayments === 1 ? "" : "s"}`}
          accent="text-cyan-600"
          iconClass="border-cyan-200 bg-cyan-50"
        />
        <Metric
          icon={Wallet}
          label="Owner payouts"
          value={formatINR(revenue.totals.ownerPayout)}
          hint={`${revenue.totals.directBookings} direct entr${revenue.totals.directBookings === 1 ? "y" : "ies"}`}
          accent="text-amber-600"
          iconClass="border-amber-200 bg-amber-50"
        />
        <Metric
          icon={RefreshCcw}
          label="Pending refunds"
          value={formatINR(revenue.totals.pendingRefunds)}
          hint={`${formatINR(revenue.totals.processedRefunds)} already processed`}
          accent="text-violet-600"
          iconClass="border-violet-200 bg-violet-50"
        />
      </div>

      <form
        action="/admin/payouts"
        method="get"
        className="mt-5 rounded-2xl border border-line bg-card p-3.5"
      >
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">Search the revenue ledger</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              name="q"
              defaultValue={filters.query}
              placeholder="Search player, phone, venue, court, UTR, or booking ID"
              className="h-10 w-full rounded-xl border border-line bg-white pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
            />
          </label>

          <div className="flex flex-wrap items-center gap-2">
            <label className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-2.5">
              <Filter className="size-3 text-slate-500" />
              <span className="sr-only">Booking status</span>
              <select
                name="status"
                defaultValue={filters.status}
                className="h-10 bg-transparent text-[11px] text-slate-700 outline-none"
              >
                {ADMIN_REVENUE_STATUSES.map((option) => (
                  <option key={option} value={option} className="bg-white">
                    {option === "ALL" ? "All statuses" : option}
                  </option>
                ))}
              </select>
            </label>

            <label className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-2.5">
              <Landmark className="size-3 text-slate-500" />
              <span className="sr-only">Date range</span>
              <select
                name="range"
                defaultValue={filters.range}
                className="h-10 bg-transparent text-[11px] text-slate-700 outline-none"
              >
                <option value="7" className="bg-white">
                  Last 7 days
                </option>
                <option value="30" className="bg-white">
                  Last 30 days
                </option>
                <option value="all" className="bg-white">
                  Lifetime
                </option>
              </select>
            </label>

            <button
              type="submit"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-[11px] font-semibold text-white shadow-primary transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <Filter className="size-3" />
              Apply
            </button>
            <Link
              href="/admin/payouts"
              className="inline-flex h-10 items-center rounded-xl border border-line bg-white px-3 text-[11px] font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
            >
              Reset
            </Link>
          </div>
        </div>

        <p className="mt-2 text-[9px] text-slate-500">
          Showing {filteredLabel} · {rangeLabel}
          {filters.query ? ` · matching “${filters.query}”` : ""}
        </p>
      </form>

      <section className="mt-4 overflow-hidden rounded-3xl border border-line bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              Booking ledger
            </p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
              Global revenue logs
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Latest 100 matching bookings. Totals above aggregate every match.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-slate-50 px-2.5 py-1 text-[9px] text-slate-500">
            <Banknote className="size-3 text-primary" />
            {revenue.totals.bookings} bookings · {revenue.totals.cancellations}{" "}
            cancelled
          </span>
        </div>

        {revenue.rows.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl border border-line bg-slate-50 text-slate-500">
              <Search className="size-5" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-900">
              No bookings match this filter.
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
              Try a wider date range or clear the search to see the full revenue
              ledger.
            </p>
            <Link
              href="/admin/payouts"
              className="mt-4 inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-3 text-[10px] font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
            >
              Reset filters
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-left">
              <thead>
                <tr className="border-b border-line text-[9px] uppercase tracking-[0.14em] text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Booking</th>
                  <th className="px-3 py-2.5 font-medium">Player</th>
                  <th className="px-3 py-2.5 font-medium">Slot</th>
                  <th className="px-3 py-2.5 font-medium">Payment</th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Court payout
                  </th>
                  <th className="px-3 py-2.5 text-right font-medium">
                    Platform fee
                  </th>
                  <th className="px-3 py-2.5 font-medium">Refund</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {revenue.rows.map((row) => (
                  <tr
                    key={row.id}
                    className="align-top transition hover:bg-slate-50"
                  >
                    <td className="px-5 py-3">
                      <p className="text-xs font-semibold text-slate-900">
                        {row.venueName}
                      </p>
                      <p className="mt-0.5 text-[9px] text-slate-500">
                        {row.courtName} · {row.id.slice(0, 8)}
                      </p>
                      <p className="mt-0.5 text-[9px] text-slate-400">
                        {row.createdLabel}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[11px] text-slate-700">
                        {row.playerName}
                      </p>
                      <p className="mt-0.5 text-[9px] text-slate-500">
                        {row.playerPhone ?? "Direct entry"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-[11px] text-slate-600">
                        {row.dateLabel}
                      </p>
                      <p className="mt-0.5 text-[9px] text-slate-500">
                        {row.timeLabel}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <PaymentModeBadge mode={row.paymentMode} />
                      <p className="mt-1 text-[10px] font-semibold text-slate-900">
                        {formatINR(row.paidAmount)}
                      </p>
                      <p className="text-[9px] text-slate-500">
                        {row.dueAmount > 0
                          ? `${formatINR(row.dueAmount)} due`
                          : row.utrNumber
                            ? `UTR ${row.utrNumber}`
                            : "No balance"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="text-[11px] font-semibold text-slate-900">
                        {formatINR(row.ownerPayout)}
                      </p>
                      <p className="mt-0.5 text-[9px] text-slate-500">
                        100% court rate
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <p className="text-[11px] font-semibold text-cyan-700">
                        {formatINR(row.convenienceFee)}
                      </p>
                      <p className="mt-0.5 text-[9px] text-slate-500">
                        {row.isOnline ? "Online" : "Direct · ₹0"}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <RefundBadge status={row.refundStatus} />
                        {row.refundAmount > 0 && (
                          <span className="text-[10px] font-semibold text-amber-700">
                            {formatINR(row.refundAmount)}
                          </span>
                        )}
                      </div>
                      {row.refundStatus === "PENDING" &&
                        row.refundAmount > 0 && (
                          <div className="mt-1.5">
                            <RefundProcessButton
                              bookingId={row.id}
                              amount={row.refundAmount}
                            />
                          </div>
                        )}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-4 overflow-hidden rounded-3xl border border-line bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-700">
              Settlement snapshot
            </p>
            <h2 className="mt-0.5 text-lg font-semibold tracking-tight text-slate-900">
              Payouts by venue
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              Lifetime confirmed court revenue and platform fees per venue.
            </p>
          </div>
          <Link
            href="/admin/venues"
            className="inline-flex items-center gap-1 rounded-full border border-line bg-slate-50 px-2.5 py-1.5 text-[10px] font-medium text-slate-600 transition hover:border-amber-300 hover:text-amber-700"
          >
            Manage venues
            <ArrowRight className="size-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-line text-[9px] uppercase tracking-[0.14em] text-slate-500">
                <th className="px-5 py-2.5 font-medium">Venue</th>
                <th className="px-3 py-2.5 font-medium">Verification</th>
                <th className="px-3 py-2.5 text-right font-medium">Bookings</th>
                <th className="px-3 py-2.5 text-right font-medium">
                  Owner payout
                </th>
                <th className="px-5 py-2.5 text-right font-medium">
                  Platform fees
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {venues.map((venue) => (
                <tr
                  key={venue.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-3">
                    <p className="text-xs font-semibold text-slate-900">
                      {venue.name}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-500">
                      {venue.city} · {venue.owner.name}
                    </p>
                  </td>
                  <td className="px-3 py-3">
                    <VerificationBadge status={venue.verificationStatus} />
                  </td>
                  <td className="px-3 py-3 text-right text-[11px] text-slate-600">
                    {venue.bookingCount}
                  </td>
                  <td className="px-3 py-3 text-right text-[11px] font-semibold text-slate-900">
                    {formatINR(venue.confirmedRevenue)}
                  </td>
                  <td className="px-5 py-3 text-right text-[11px] font-semibold text-cyan-700">
                    {formatINR(venue.platformFees)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
  icon: typeof Wallet;
  label: string;
  value: string;
  hint: string;
  accent: string;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-3.5">
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
      <p className="mt-2.5 text-xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9px] text-slate-500">{hint}</p>
    </div>
  );
}
