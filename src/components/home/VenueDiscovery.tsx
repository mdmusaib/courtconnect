"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  MapPin,
  Search,
  Sparkles,
} from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { VenueCover } from "@/components/venue/VenueCover";
import { formatINR } from "@/lib/format";
import type { VenueCardData } from "@/lib/types";
import { useMemo, useState } from "react";

export function VenueDiscovery({
  venues,
  sports,
}: {
  venues: VenueCardData[];
  sports: string[];
}) {
  const [query, setQuery] = useState("");
  const [sport, setSport] = useState("All");

  const filteredVenues = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return venues.filter((venue) => {
      const matchesSport =
        sport === "All" ||
        venue.courts.some((court) => court.sportType === sport);
      const searchable = [
        venue.name,
        venue.address,
        venue.city,
        ...venue.courts.map((court) => `${court.name} ${court.sportType}`),
      ]
        .join(" ")
        .toLowerCase();

      return matchesSport && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [query, sport, venues]);

  return (
    <section id="venues" className="scroll-mt-24 pt-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
            <Sparkles className="size-3.5" />
            Handpicked courts
          </div>
          <h2 className="mt-1.5 text-2xl font-semibold tracking-tight text-white">
            Venues near you
          </h2>
        </div>
        <span className="shrink-0 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] font-medium text-slate-400">
          {filteredVenues.length} {filteredVenues.length === 1 ? "venue" : "venues"}
        </span>
      </div>

      <div className="relative mt-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search venue, sport, or area"
          aria-label="Search venues"
          className="h-12 w-full rounded-2xl border border-white/8 bg-surface/70 pl-11 pr-4 text-sm text-white outline-none backdrop-blur transition placeholder:text-slate-500 focus:border-emerald-400/40 focus:ring-4 focus:ring-emerald-400/10"
        />
      </div>

      <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {["All", ...sports].map((item) => {
          const active = sport === item;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setSport(item)}
              aria-pressed={active}
              className={`shrink-0 rounded-full border px-4 py-2 text-xs font-semibold transition-all duration-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
                active
                  ? "border-emerald-400 bg-emerald-400 text-oled"
                  : "border-white/8 bg-white/[0.03] text-slate-300 hover:border-white/15 hover:text-white"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>

      {filteredVenues.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No courts match that search"
            description="Try a different sport or search term. New Melvisharam venues are added regularly."
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {filteredVenues.map((venue) => {
            const primaryCourt = venue.courts[0];
            const sportTypes = Array.from(
              new Set(venue.courts.map((court) => court.sportType)),
            );

            return (
              <Link
                key={venue.id}
                href={`/venue/${venue.id}`}
                prefetch={true}
                className="group overflow-hidden rounded-3xl border border-white/[0.07] bg-surface/85 shadow-[0_20px_60px_-35px_rgba(0,0,0,0.9)] transition-all duration-200 active:scale-[0.98] hover:-translate-y-1 hover:border-emerald-400/25 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
              >
                <VenueCover
                  sport={primaryCourt?.sportType}
                  name={venue.name}
                  city={venue.city}
                  className="h-44"
                />

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-white">
                        {venue.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-400">
                        <MapPin className="size-3 shrink-0" />
                        {venue.address}
                      </p>
                    </div>
                    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/8 bg-white/[0.03] text-slate-400 transition group-hover:border-emerald-400/30 group-hover:text-emerald-300">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {venue.amenities.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="rounded-full border border-white/6 bg-white/[0.03] px-2 py-1 text-[10px] text-slate-400"
                      >
                        {amenity}
                      </span>
                    ))}
                    {venue.courts.length > 0 && (
                      <span className="rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-2 py-1 text-[10px] text-emerald-300">
                        {venue.courts.length} court{venue.courts.length === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3">
                    <div>
                      <span className="text-lg font-semibold tracking-tight text-white">
                        {formatINR(venue.minPrice)}
                      </span>
                      <span className="text-xs text-slate-500">/hr</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Clock3 className="size-3.5 text-emerald-400" />
                      Instant booking
                      <ArrowRight className="size-3.5 text-emerald-400 transition group-hover:translate-x-0.5" />
                    </div>
                  </div>

                  <div className="mt-2 flex gap-1.5">
                    {sportTypes.map((sportType) => (
                      <span key={sportType} className="text-[10px] text-slate-500">
                        {sportType}
                        {sportTypes.indexOf(sportType) < sportTypes.length - 1
                          ? " ·"
                          : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
