import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Phone,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { OwnerQuickEntryModal } from "@/components/OwnerQuickEntryModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateKey } from "@/lib/format";
import { getOwnerCourtOptions } from "@/lib/owner-data";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quick entry",
};

const SOURCES = [
  {
    icon: Banknote,
    label: "Walk-in cash",
    description:
      "Staff collects cash at the counter. The full court rate is recorded as collected.",
    className: "border-amber-400/20 bg-amber-400/[0.07] text-amber-200",
  },
  {
    icon: Phone,
    label: "Phone booking",
    description:
      "The slot is confirmed over a call. The court rate stays due at the venue.",
    className: "border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-200",
  },
  {
    icon: QrCode,
    label: "Ground QR",
    description:
      "A player pays the venue's own UPI QR. The amount is recorded as collected.",
    className: "border-violet-400/20 bg-violet-400/[0.07] text-violet-200",
  },
];

export default async function OwnerQuickEntryPage() {
  const owner = await requireRole(["OWNER", "ADMIN"], "owner");
  const courts = await getOwnerCourtOptions(owner.id);

  if (courts.length === 0) {
    return (
      <EmptyState
        title="No courts on this account"
        description="Add a venue and court before logging direct entries."
        actionLabel="Back to overview"
        actionHref="/owner"
        variant="bookings"
      />
    );
  }

  return (
    <div className="animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/owner"
            className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 transition hover:text-emerald-300"
          >
            <ArrowLeft className="size-3" />
            Owner overview
          </Link>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Quick entry desk
          </h1>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-400">
            Log a direct booking for the counter, phone, or ground QR in one
            flow. No receipt upload, no AI check, and no platform fee.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1.5 text-[10px] font-semibold text-emerald-200">
            <ShieldCheck className="size-3" />
            ₹0 platform fee
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[10px] font-medium text-slate-300">
            <Sparkles className="size-3 text-cyan-300" />
            Instant confirmation
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <section className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-[#17243a] via-surface to-oled p-5 sm:p-6">
          <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-emerald-400/[0.1] blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              <Zap className="size-3" />
              Counter mode
            </span>
            <h2 className="mt-4 text-xl font-semibold tracking-tight text-white">
              One tap to open. Seconds to confirm.
            </h2>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-400">
              Pick the court, date, and start time. The modal already defaults to
              the next hour and the seeded court rate. Choose a source and save.
            </p>

            <div className="mt-5">
              <OwnerQuickEntryModal
                courts={courts}
                todayKey={formatDateKey(new Date())}
                defaultOpen
              />
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                href="/owner/calendar"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                <CalendarDays className="size-3.5" />
                Open calendar
              </Link>
              <Link
                href="/owner"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-medium text-slate-300 transition hover:border-white/20 hover:text-white"
              >
                <ArrowLeft className="size-3.5" />
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/8 bg-surface/70 p-5 sm:p-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Three direct sources
          </p>
          <div className="mt-3 space-y-2.5">
            {SOURCES.map((source) => {
              const Icon = source.icon;

              return (
                <div
                  key={source.label}
                  className={`rounded-2xl border p-3.5 ${source.className}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="grid size-8 place-items-center rounded-xl border border-white/10 bg-black/10">
                      <Icon className="size-4" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        {source.label}
                      </p>
                      <p className="text-[9px] uppercase tracking-[0.12em] opacity-70">
                        ₹0 platform fee
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed opacity-80">
                    {source.description}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="mt-4 rounded-2xl border border-white/8 bg-white/[0.025] p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              No AI verification
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">
              Direct entries are confirmed immediately. Receipt upload and Gemini
              receipt checks only apply to online player payments.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
