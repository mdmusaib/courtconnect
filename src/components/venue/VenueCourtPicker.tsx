"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Clock3,
  Lightbulb,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { SportIcon, getSportTheme } from "@/components/venue/SportVisual";
import { formatINR } from "@/lib/format";
import { useBookingSession } from "@/lib/booking-store";
import type { CourtSummary } from "@/lib/types";

export function VenueCourtPicker({
  venueId,
  courts,
}: {
  venueId: string;
  courts: CourtSummary[];
}) {
  const session = useBookingSession();
  const initialCourtId =
    session.venueId === venueId && session.courtId && courts.some((c) => c.id === session.courtId)
      ? session.courtId
      : (courts[0]?.id ?? "");

  const [selectedId, setSelectedId] = useState(initialCourtId);

  useEffect(() => {
    if (selectedId) {
      session.setSession({ venueId, courtId: selectedId });
    }
  }, [selectedId, venueId]);

  const selected = courts.find((court) => court.id === selectedId) ?? courts[0];

  if (!selected) {
    return (
      <div className="mt-8 rounded-3xl border border-white/8 bg-surface/60 p-6 text-sm text-slate-400">
        This venue has no bookable courts yet.
      </div>
    );
  }

  const theme = getSportTheme(selected.sportType);

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Pick your surface
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
            Courts at this venue
          </h2>
        </div>
        <span className="hidden text-xs text-slate-500 sm:block">
          Live availability
        </span>
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {courts.map((court) => {
          const active = court.id === selected.id;
          const courtTheme = getSportTheme(court.sportType);

          return (
            <button
              key={court.id}
              type="button"
              onClick={() => {
                setSelectedId(court.id);
                session.setSession({ venueId, courtId: court.id });
              }}
              aria-pressed={active}
              className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2.5 text-left text-xs font-medium transition-all duration-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                active
                  ? "border-emerald-400/40 bg-emerald-400/10 text-white"
                  : "border-white/8 bg-white/[0.03] text-slate-400 hover:border-white/15 hover:text-slate-200"
              }`}
            >
              <courtTheme.icon
                className={`size-4 ${active ? "text-emerald-300" : "text-slate-500"}`}
              />
              <span>
                {court.name}
                <span className="ml-2 text-[10px] text-slate-500">
                  {formatINR(court.price)}/hr
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="relative mt-4 overflow-hidden rounded-3xl border border-white/8 bg-surface/80 p-5 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.95)]">
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-emerald-400/[0.06] blur-2xl" />

        <div className="relative flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/8 bg-white/[0.03]">
              <SportIcon sport={selected.sportType} className={`size-5 ${theme.accent}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
                {selected.sportType}
              </p>
              <h3 className="mt-0.5 truncate text-base font-semibold text-white">
                {selected.name}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold tracking-tight text-white">
              {formatINR(selected.price)}
            </p>
            <p className="text-[10px] text-slate-500">per hour</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Feature icon={<Clock3 className="size-3.5" />} label="60 min" />
          <Feature icon={<Lightbulb className="size-3.5" />} label="Floodlit" />
          <Feature icon={<ShieldCheck className="size-3.5" />} label="Instant pass" />
        </div>

        <div className="mt-5 flex items-center gap-1.5 rounded-2xl border border-cyan-400/10 bg-cyan-400/[0.05] px-3 py-2.5 text-[11px] text-cyan-200/80">
          <Zap className="size-3.5 shrink-0 text-cyan-300" />
          Slots are held for 1 minute while you complete UPI payment.
        </div>

        <Link
          href={`/venue/${venueId}/book?courtId=${selected.id}`}
          prefetch={true}
          className="mt-4 hidden h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-semibold text-oled transition-all duration-100 active:scale-95 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface sm:flex"
        >
          Check availability
          <ArrowRight className="size-4" />
        </Link>
      </div>

      <div className="fixed inset-x-0 z-30 safe-nav border-t border-white/8 bg-oled/90 px-4 py-3 backdrop-blur-xl sm:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[10px] uppercase tracking-[0.16em] text-slate-500">
              {selected.sportType}
            </p>
            <p className="truncate text-sm font-semibold text-white">
              {selected.name}
              <span className="ml-2 text-xs font-normal text-slate-400">
                {formatINR(selected.price)}/hr
              </span>
            </p>
          </div>
          <Link
            href={`/venue/${venueId}/book?courtId=${selected.id}`}
            prefetch={true}
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-400 px-4 text-xs font-semibold text-oled transition-all duration-100 active:scale-95 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
          >
            Book slot
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function Feature({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-white/6 bg-white/[0.02] px-2.5 py-2 text-[10px] text-slate-400">
      <span className="text-emerald-400">{icon}</span>
      {label}
    </div>
  );
}
