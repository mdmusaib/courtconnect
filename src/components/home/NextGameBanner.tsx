import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Clock3,
  MapPin,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatINR } from "@/lib/format";
import type { BookingStatusValue } from "@/lib/types";

export function NextGameBanner({
  href,
  status,
  venueName,
  courtName,
  dateLabel,
  amount,
}: {
  href: string;
  status: BookingStatusValue;
  venueName: string;
  courtName: string;
  dateLabel: string;
  amount: number;
}) {
  return (
    <Link
      href={href}
      className="group animate-fade-up mt-8 block overflow-hidden rounded-3xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/[0.09] via-surface to-surface p-4 shadow-[0_24px_70px_-40px_rgba(16,185,129,0.55)] transition hover:border-emerald-400/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
          <CalendarDays className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Next game
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-white sm:text-lg">
            {venueName}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-400">
            <MapPin className="size-3" />
            {courtName}
            <span className="text-slate-600">·</span>
            <Clock3 className="size-3" />
            {dateLabel}
          </p>
        </div>
        <ArrowRight className="mt-3 size-4 shrink-0 text-emerald-400 transition group-hover:translate-x-1" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3">
        <StatusBadge status={status} />
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-300">
          {status === "PENDING" ? (
            <>
              <Wallet className="size-3.5 text-amber-300" />
              Complete payment · {formatINR(amount)}
            </>
          ) : (
            <>
              <ShieldCheck className="size-3.5 text-emerald-400" />
              Digital pass ready
            </>
          )}
        </span>
      </div>
    </Link>
  );
}
