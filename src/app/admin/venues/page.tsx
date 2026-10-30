import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Building2,
  ClipboardCheck,
  MapPin,
  ShieldCheck,
  ShieldX,
  Ticket,
  Users,
} from "lucide-react";
import { AdminPageIntro } from "@/components/admin/AdminPageIntro";
import { VerificationBadge } from "@/components/admin/AdminBadges";
import { VenueVerificationActions } from "@/components/admin/VenueVerificationActions";
import {
  ADMIN_VERIFICATION_STATUSES,
  getAdminVenueRows,
} from "@/lib/admin-data";
import {
  formatDateKey,
  formatDateKeyLong,
  formatINR,
} from "@/lib/format";
import type { VerificationStatusValue } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Venue verification",
};

function parseStatus(value: string | undefined): VerificationStatusValue | "ALL" {
  return ADMIN_VERIFICATION_STATUSES.includes(
    value as VerificationStatusValue | "ALL",
  )
    ? (value as VerificationStatusValue | "ALL")
    : "ALL";
}

export default async function AdminVenuesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const allVenues = await getAdminVenueRows("ALL");
  const venues =
    status === "ALL"
      ? allVenues
      : allVenues.filter((venue) => venue.verificationStatus === status);

  const counts = {
    ALL: allVenues.length,
    PENDING: allVenues.filter((venue) => venue.verificationStatus === "PENDING")
      .length,
    VERIFIED: allVenues.filter(
      (venue) => venue.verificationStatus === "VERIFIED",
    ).length,
    REJECTED: allVenues.filter(
      (venue) => venue.verificationStatus === "REJECTED",
    ).length,
  };
  const totalPayout = allVenues.reduce(
    (total, venue) => total + venue.confirmedRevenue,
    0,
  );
  const totalPlatformFees = allVenues.reduce(
    (total, venue) => total + venue.platformFees,
    0,
  );

  return (
    <div className="animate-fade-up">
      <AdminPageIntro
        eyebrow="Trust & supply"
        title="Venue verification"
        description="Only verified venues appear in player discovery. Review owner details, courts, and notes before approving a listing."
      >
        <Link
          href="/admin/disputes"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-[11px] font-semibold text-slate-200 transition hover:border-white/20 hover:text-white"
        >
          Dispute queue
          <ArrowRight className="size-3.5" />
        </Link>
      </AdminPageIntro>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary
          icon={Building2}
          label="Venues"
          value={String(counts.ALL)}
          hint={`${counts.VERIFIED} live · ${counts.PENDING} pending`}
          accent="text-emerald-300"
          iconClass="border-emerald-400/20 bg-emerald-400/10"
        />
        <Summary
          icon={ShieldCheck}
          label="Verified"
          value={String(counts.VERIFIED)}
          hint="Visible to players"
          accent="text-cyan-300"
          iconClass="border-cyan-400/20 bg-cyan-400/10"
        />
        <Summary
          icon={Banknote}
          label="Lifetime court revenue"
          value={formatINR(totalPayout)}
          hint="Owner payouts across all venues"
          accent="text-amber-300"
          iconClass="border-amber-400/20 bg-amber-400/10"
        />
        <Summary
          icon={ClipboardCheck}
          label="Platform fees"
          value={formatINR(totalPlatformFees)}
          hint="Online convenience fees"
          accent="text-violet-300"
          iconClass="border-violet-400/20 bg-violet-400/10"
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {ADMIN_VERIFICATION_STATUSES.map((option) => {
          const active = option === status;
          const label =
            option === "ALL" ? "All venues" : option.toLowerCase();

          return (
            <Link
              key={option}
              href={
                option === "ALL"
                  ? "/admin/venues"
                  : `/admin/venues?status=${option}`
              }
              aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] transition ${
                active
                  ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                  : "border-white/8 bg-white/[0.02] text-slate-400 hover:border-white/15 hover:text-white"
              }`}
            >
              {label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                  active
                    ? "bg-emerald-400/15 text-emerald-200"
                    : "bg-white/[0.05] text-slate-500"
                }`}
              >
                {counts[option]}
              </span>
            </Link>
          );
        })}
      </div>

      {venues.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-14 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-white/8 bg-surface text-slate-400">
            <ShieldCheck className="size-6" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-white">
            No venues in this queue.
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-400">
            {status === "PENDING"
              ? "Every listing has been reviewed. New submissions will appear here automatically."
              : "Try another verification filter to see the full venue list."}
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {venues.map((venue) => (
            <article
              key={venue.id}
              className="overflow-hidden rounded-3xl border border-white/8 bg-surface/70"
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/6 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold tracking-tight text-white">
                      {venue.name}
                    </h2>
                    <VerificationBadge status={venue.verificationStatus} />
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <MapPin className="size-3 text-emerald-400" />
                    {venue.city} · {venue.address}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                    <Users className="size-3" />
                    {venue.owner.name} · {venue.owner.phone}
                  </p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/[0.03] text-slate-400">
                  <Building2 className="size-4" />
                </span>
              </div>

              <div className="px-5 py-4">
                <div className="flex flex-wrap gap-1.5">
                  {venue.courts.length === 0 ? (
                    <span className="text-[10px] text-slate-500">
                      No courts added
                    </span>
                  ) : (
                    venue.courts.map((court) => (
                      <span
                        key={court.id}
                        className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.025] px-2 py-1 text-[9px] text-slate-300"
                      >
                        <span className="font-semibold text-white">
                          {court.name}
                        </span>
                        <span className="text-slate-500">
                          {court.sportType} · {formatINR(court.price)}/hr
                        </span>
                      </span>
                    ))
                  )}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <Stat
                    icon={Ticket}
                    label="Bookings"
                    value={String(venue.bookingCount)}
                  />
                  <Stat
                    icon={Banknote}
                    label="Owner payout"
                    value={formatINR(venue.confirmedRevenue)}
                  />
                  <Stat
                    icon={ClipboardCheck}
                    label="Platform fees"
                    value={formatINR(venue.platformFees)}
                  />
                </div>

                <div className="mt-3 rounded-xl border border-white/6 bg-black/10 px-3 py-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Verification notes
                  </p>
                  <p className="mt-1 text-[10px] leading-relaxed text-slate-400">
                    {venue.verificationNotes ||
                      "No review notes yet. Add context when approving or rejecting this venue."}
                  </p>
                  <p className="mt-1.5 text-[9px] text-slate-600">
                    Added{" "}
                    {formatDateKeyLong(formatDateKey(new Date(venue.createdAt)))}
                    {venue.verifiedAt
                      ? ` · verified ${formatDateKeyLong(formatDateKey(new Date(venue.verifiedAt)))}`
                      : ""}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/6 px-5 py-3.5">
                <VenueVerificationActions
                  venueId={venue.id}
                  venueName={venue.name}
                  status={venue.verificationStatus}
                />
              </div>
            </article>
          ))}
        </div>
      )}

      {status === "PENDING" && venues.length > 0 && (
        <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-amber-400/15 bg-amber-400/[0.045] p-3.5">
          <ShieldX className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <p className="text-[11px] leading-relaxed text-slate-400">
            Rejecting a venue removes it from player discovery and records the
            reason in the audit log. The owner can fix the listing and resubmit
            for review.
          </p>
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
  icon: typeof Building2;
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

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Ticket;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/6 bg-white/[0.02] px-2.5 py-2">
      <p className="flex items-center gap-1 text-[8px] uppercase tracking-[0.12em] text-slate-500">
        <Icon className="size-2.5" />
        {label}
      </p>
      <p className="mt-0.5 text-[11px] font-semibold text-white">{value}</p>
    </div>
  );
}
