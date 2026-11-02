import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  Armchair,
  Bath,
  Car,
  Clock3,
  DoorOpen,
  Droplets,
  Lightbulb,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/navigation/PageHeader";
import { VenueCourtPicker } from "@/components/venue/VenueCourtPicker";
import { VenueCover } from "@/components/venue/VenueCover";
import { getVenueDetails } from "@/lib/booking-data";
import { formatINR } from "@/lib/format";

const amenityIcons: Record<string, LucideIcon> = {
  Parking: Car,
  Floodlights: Lightbulb,
  "Changing Room": DoorOpen,
  "Drinking Water": Droplets,
  Washroom: Bath,
  "Seating Area": Armchair,
};

export const revalidate = 10;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const venue = await getVenueDetails(id);

  if (!venue) {
    return { title: "Venue not found" };
  }

  return {
    title: venue.name,
    description: `${venue.name} in ${venue.city}. ${venue.address}. Check live slots and book on CourtConnect.`,
  };
}

export default async function VenuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const venue = await getVenueDetails(id);

  if (!venue) {
    notFound();
  }

  const primarySport = venue.courts[0]?.sportType ?? "Football";
  const secondarySport = venue.courts[1]?.sportType ?? primarySport;
  const minPrice =
    venue.courts.length > 0
      ? Math.min(...venue.courts.map((court) => court.price))
      : 0;
  const directionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${venue.name}, ${venue.address}`,
  )}`;

  return (
    <div className="min-h-dvh pb-44 sm:pb-16">
      <PageHeader
        backHref="/"
        backLabel="Venues"
        title={venue.name}
        subtitle={`${venue.city} · ${venue.courts.length} courts`}
        right={
          <a
            href={directionsUrl}
            target="_blank"
            rel="noreferrer"
            className="grid size-9 place-items-center rounded-full border border-line bg-white text-slate-600 transition hover:border-primary/40 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Get directions"
          >
            <Navigation className="size-4" />
          </a>
        }
      />

      <main className="mx-auto max-w-5xl px-4">
        <section className="mt-4 grid gap-2 sm:grid-cols-[1.55fr_1fr]">
          <VenueCover
            sport={primarySport}
            name={venue.name}
            city={venue.city}
            className="h-64 rounded-3xl sm:h-[350px]"
            showCaption={false}
          />

          <div className="hidden grid-rows-[1fr_auto] gap-2 sm:grid">
            <VenueCover
              sport={secondarySport}
              name={venue.name}
              city={venue.city}
              className="h-full rounded-3xl"
              showCaption={false}
            />
            <div className="rounded-3xl border border-line bg-card p-4 shadow-card">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                <MapPin className="size-3.5 text-primary" />
                Find us here
              </p>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
                {venue.address}
              </p>
              <a
                href={directionsUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:text-primary-deep"
              >
                Open in Maps
                <Navigation className="size-3" />
              </a>
            </div>
          </div>
        </section>

        <section className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-primary-soft px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              <ShieldCheck className="size-3.5" />
              Verified venue
            </span>
            <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[10px] text-slate-500 shadow-card">
              {venue.courts.length} court{venue.courts.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[10px] text-slate-500 shadow-card">
              From {formatINR(minPrice)}/hr
            </span>
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-slate-900 sm:text-4xl">
            {venue.name}
          </h1>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-500">
            <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
            {venue.address}
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {venue.amenities.map((amenity) => {
              const Icon = amenityIcons[amenity] ?? Sparkles;
              return (
                <span
                  key={amenity}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-white px-2.5 py-1.5 text-[11px] text-slate-600 shadow-card"
                >
                  <Icon className="size-3.5 text-primary" />
                  {amenity}
                </span>
              );
            })}
          </div>
        </section>

        <VenueCourtPicker
          venueId={venue.id}
          courts={venue.courts.map((court) => ({
            id: court.id,
            name: court.name,
            sportType: court.sportType,
            price: court.price,
          }))}
        />

        <section className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
            Good to know
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <InfoCard
              icon={<Clock3 className="size-4" />}
              title="Open daily"
              copy="Slots run from 6:00 AM to 11:00 PM IST."
            />
            <InfoCard
              icon={<UserRound className="size-4" />}
              title="Managed locally"
              copy={`Hosted by ${venue.owner.name} in ${venue.city}.`}
            />
            <InfoCard
              icon={<ShieldCheck className="size-4" />}
              title="Zero owner commission"
              copy="100% of the court rate goes to the venue."
            />
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-line bg-card shadow-card">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Getting there
              </p>
              <p className="mt-1.5 max-w-xl text-sm text-slate-600">
                {venue.address}
              </p>
            </div>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-primary-soft px-4 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
            >
              <Navigation className="size-3.5" />
              Directions
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}

function InfoCard({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-card">
      <div className="grid size-9 place-items-center rounded-xl border border-emerald-200 bg-primary-soft text-primary">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{copy}</p>
    </div>
  );
}
