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
      className="group animate-fade-up mt-8 block overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-primary-soft via-white to-white p-4 shadow-card transition hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-200 bg-white text-primary shadow-card">
          <CalendarDays className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Next game
          </p>
          <h2 className="mt-1 truncate text-base font-semibold text-slate-900 sm:text-lg">
            {venueName}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
            <MapPin className="size-3" />
            {courtName}
            <span className="text-slate-300">·</span>
            <Clock3 className="size-3" />
            {dateLabel}
          </p>
        </div>
        <ArrowRight className="mt-3 size-4 shrink-0 text-primary transition group-hover:translate-x-1" />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <StatusBadge status={status} />
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700">
          {status === "PENDING" ? (
            <>
              <Wallet className="size-3.5 text-amber-600" />
              Complete payment · {formatINR(amount)}
            </>
          ) : (
            <>
              <ShieldCheck className="size-3.5 text-emerald-600" />
              Digital pass ready
            </>
          )}
        </span>
      </div>
    </Link>
  );
}
