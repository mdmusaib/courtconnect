import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CheckCircle2,
  Clock3,
  MessageSquareText,
  Scale,
  ShieldAlert,
  UserRound,
  Wallet,
} from "lucide-react";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import {
  DisputeBadge,
  PaymentModeBadge,
  RefundBadge,
  ResolutionBadge,
} from "@/components/admin/AdminBadges";
import { DisputeResolutionForm } from "@/components/admin/DisputeResolutionForm";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  ADMIN_DISPUTE_STATUSES,
  getAdminDisputeRows,
} from "@/lib/admin-data";
import {
  formatDateKey,
  formatDateKeyLong,
  formatINR,
} from "@/lib/format";
import type { DisputeStatusValue } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Dispute overrides",
};

function parseStatus(value: string | undefined): DisputeStatusValue | "ALL" {
  return ADMIN_DISPUTE_STATUSES.includes(value as DisputeStatusValue | "ALL")
    ? (value as DisputeStatusValue | "ALL")
    : "ALL";
}

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const allDisputes = await getAdminDisputeRows("ALL");
  const disputes =
    status === "ALL"
      ? allDisputes
      : allDisputes.filter((dispute) => dispute.status === status);

  const counts = {
    ALL: allDisputes.length,
    OPEN: allDisputes.filter((dispute) => dispute.status === "OPEN").length,
    UNDER_REVIEW: allDisputes.filter(
      (dispute) => dispute.status === "UNDER_REVIEW",
    ).length,
    RESOLVED: allDisputes.filter(
      (dispute) => dispute.status === "RESOLVED",
    ).length,
    REJECTED: allDisputes.filter(
      (dispute) => dispute.status === "REJECTED",
    ).length,
  };
  const overriddenRefunds = allDisputes.reduce(
    (total, dispute) => total + dispute.refundAmount,
    0,
  );

  return (
    <div className="animate-fade-up">
      <AdminPageIntro
        eyebrow="Player support"
        title="Dispute overrides"
        description="Review double bookings and missing refunds. A full or partial override is marked processed immediately and written to the audit trail."
      >
        <Link
          href="/admin/payouts"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
        >
          Revenue ledger
          <ArrowRight className="size-3.5" />
        </Link>
        <Link
          href="/admin/venues"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
        >
          Venue queue
          <ArrowRight className="size-3.5" />
        </Link>
      </AdminPageIntro>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary
          icon={ShieldAlert}
          label="Open cases"
          value={String(counts.OPEN)}
          hint="Awaiting first review"
          accent="text-amber-300"
          iconClass="border-amber-400/20 bg-amber-400/10"
        />
        <Summary
          icon={Clock3}
          label="Under review"
          value={String(counts.UNDER_REVIEW)}
          hint="Venue or payment evidence pending"
          accent="text-cyan-300"
          iconClass="border-cyan-400/20 bg-cyan-400/10"
        />
        <Summary
          icon={CheckCircle2}
          label="Resolved"
          value={String(counts.RESOLVED)}
          hint={`${counts.REJECTED} rejected without refund`}
          accent="text-emerald-300"
          iconClass="border-emerald-400/20 bg-emerald-400/10"
        />
        <Summary
          icon={Wallet}
          label="Override refunds"
          value={formatINR(overriddenRefunds)}
          hint="Approved through dispute review"
          accent="text-violet-300"
          iconClass="border-violet-400/20 bg-violet-400/10"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {ADMIN_DISPUTE_STATUSES.map((option) => {
          const active = option === status;
          const label =
            option === "ALL" ? "All disputes" : option.replace("_", " ").toLowerCase();

          return (
            <Link
              key={option}
              href={
                option === "ALL"
                  ? "/admin/disputes"
                  : `/admin/disputes?status=${option}`
              }
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${
                active
                  ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-200"
                  : "border-white/8 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-white"
              }`}
            >
              {label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                  active
                    ? "bg-cyan-400/15 text-cyan-100"
                    : "bg-white/[0.05] text-slate-500"
                }`}
              >
                {counts[option]}
              </span>
            </Link>
          );
        })}
      </div>

      {disputes.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/8 bg-surface text-slate-400">
            <Scale className="size-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-white">
            No disputes in this queue.
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-400">
            {status === "OPEN"
              ? "No open cases right now. The support queue is clear."
              : "Try another status filter to see the full dispute history."}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {disputes.map((dispute) => {
            const maxRefund = Math.max(
              0,
              Math.round(
                dispute.booking.paidAmount - dispute.booking.convenienceFee,
              ),
            );
            const closed =
              dispute.status === "RESOLVED" ||
              dispute.status === "REJECTED";

            return (
              <article
                key={dispute.id}
                className="overflow-hidden rounded-3xl border border-white/8 bg-surface/70"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/6 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-semibold tracking-tight text-white">
                        {dispute.reason}
                      </h2>
                      <DisputeBadge status={dispute.status} />
                      <ResolutionBadge resolution={dispute.resolution} />
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
                      <span>
                        Opened{" "}
                        {formatDateKeyLong(
                          formatDateKey(new Date(dispute.createdAt)),
                        )}
                      </span>
                      <span className="text-slate-700">·</span>
                      <span>Case {dispute.id.slice(0, 8)}</span>
                      <span className="text-slate-700">·</span>
                      <span>Booking {dispute.booking.id.slice(0, 8)}</span>
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] uppercase tracking-[0.14em] text-slate-500">
                      Player paid
                    </p>
                    <p className="mt-0.5 text-lg font-semibold text-white">
                      {formatINR(dispute.booking.paidAmount)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 px-5 py-4 xl:grid-cols-[1.35fr_1fr]">
                  <div>
                    <div className="rounded-2xl border border-white/6 bg-black/10 p-3.5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {dispute.booking.venueName}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {dispute.booking.courtName} ·{" "}
                            {dispute.booking.dateLabel} ·{" "}
                            {dispute.booking.timeLabel}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={dispute.booking.status} />
                          <PaymentModeBadge
                            mode={dispute.booking.paymentMode}
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <Money
                          label="Court fee"
                          value={formatINR(maxRefund)}
                        />
                        <Money
                          label="Convenience fee"
                          value={formatINR(dispute.booking.convenienceFee)}
                          accent="text-amber-200"
                        />
                        <Money
                          label="Owner payout"
                          value={formatINR(dispute.booking.ownerPayout)}
                        />
                        <Money
                          label="Booking refund"
                          value={formatINR(dispute.booking.refundAmount)}
                          accent="text-cyan-200"
                        />
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <RefundBadge
                          status={dispute.booking.refundStatus}
                        />
                        <span className="text-[9px] text-slate-600">
                          Eligible override cap: {formatINR(maxRefund)} (court
                          fee only)
                        </span>
                      </div>
                    </div>

                    {dispute.details && (
                      <div className="mt-3 rounded-2xl border border-white/6 bg-white/[0.02] p-3.5">
                        <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          <MessageSquareText className="size-3" />
                          Player report
                        </p>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
                          {dispute.details}
                        </p>
                      </div>
                    )}

                    {closed && (
                      <div className="mt-3 rounded-2xl border border-white/6 bg-black/10 p-3.5">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                          Resolution
                        </p>
                        <p className="mt-1.5 text-[11px] leading-relaxed text-slate-300">
                          {dispute.resolutionNote ?? "No resolution note."}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] text-slate-600">
                          <span>
                            {dispute.resolvedBy?.name ?? "Platform admin"}
                          </span>
                          {dispute.resolvedAt && (
                            <>
                              <span className="text-slate-700">·</span>
                              <span>
                                {formatDateKeyLong(
                                  formatDateKey(new Date(dispute.resolvedAt)),
                                )}
                              </span>
                            </>
                          )}
                          {dispute.refundAmount > 0 && (
                            <>
                              <span className="text-slate-700">·</span>
                              <span className="font-semibold text-emerald-300">
                                {formatINR(dispute.refundAmount)} overridden
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="rounded-2xl border border-white/6 bg-white/[0.02] p-3.5">
                      <p className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                        <UserRound className="size-3" />
                        Player
                      </p>
                      {dispute.player ? (
                        <>
                          <p className="mt-1.5 text-xs font-semibold text-white">
                            {dispute.player.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {dispute.player.phone}
                          </p>
                        </>
                      ) : (
                        <p className="mt-1.5 text-[11px] text-slate-500">
                          No player account linked.
                        </p>
                      )}

                      <div className="mt-3 space-y-1.5 border-t border-white/6 pt-2.5">
                        <div className="flex items-center justify-between gap-3 text-[10px]">
                          <span className="text-slate-500">Booking paid</span>
                          <span className="font-medium text-white">
                            {formatINR(dispute.booking.paidAmount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-[10px]">
                          <span className="text-slate-500">
                            Eligible court refund
                          </span>
                          <span className="font-medium text-emerald-300">
                            {formatINR(maxRefund)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-[10px]">
                          <span className="text-slate-500">Case age</span>
                          <span className="font-medium text-slate-200">
                            {formatDateKeyLong(
                              formatDateKey(new Date(dispute.createdAt)),
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {!closed ? (
                      <DisputeResolutionForm
                        disputeId={dispute.id}
                        maxRefund={maxRefund}
                        existingRefundAmount={dispute.booking.refundAmount}
                      />
                    ) : (
                      <div className="mt-4 flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2.5">
                        <Banknote className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
                        <p className="text-[10px] leading-relaxed text-slate-500">
                          This case is closed. Refund overrides are locked to
                          protect the ledger from duplicate payouts.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  hint,
  accent,
  iconClass,
}: {
  icon: typeof Scale;
  label: string;
  value: string;
  hint: string;
  accent: string;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-surface/70 p-3.5">
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
      <p className="mt-2.5 text-xl font-semibold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-0.5 truncate text-[9px] text-slate-500">{hint}</p>
    </div>
  );
}

function Money({
  label,
  value,
  accent = "text-white",
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-2.5 py-2">
      <p className="text-[8px] uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-[11px] font-semibold ${accent}`}>{value}</p>
    </div>
  );
}
