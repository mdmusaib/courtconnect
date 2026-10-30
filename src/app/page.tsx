import { BrandHeader } from "@/components/navigation/PageHeader";
import { NextGameBanner } from "@/components/home/NextGameBanner";
import { VenueDiscovery } from "@/components/home/VenueDiscovery";
import { getCachedPublicVenues, getNextPlayerBooking } from "@/lib/booking-data";
import { getSessionUser } from "@/lib/session";
import { formatDateTimeLong } from "@/lib/format";
import type { VenueCardData } from "@/lib/types";
import {
  Clock3,
  MapPin,
  ShieldCheck,
  Sparkles,
  WifiOff,
  Zap,
} from "lucide-react";

export const revalidate = 10;

export default async function HomePage() {
  const [venues, player] = await Promise.all([
    getCachedPublicVenues(),
    getSessionUser(),
  ]);

  const nextBooking = player
    ? await getNextPlayerBooking(player.phone)
    : null;

  const venueCards: VenueCardData[] = venues.map((venue) => ({
    id: venue.id,
    name: venue.name,
    city: venue.city,
    address: venue.address,
    amenities: venue.amenities,
    courts: venue.courts.map((court) => ({
      id: court.id,
      name: court.name,
      sportType: court.sportType,
      price: court.price,
    })),
    minPrice:
      venue.courts.length > 0
        ? Math.min(...venue.courts.map((court) => court.price))
        : 0,
  }));

  const sports = Array.from(
    new Set(
      venueCards.flatMap((venue) =>
        venue.courts.map((court) => court.sportType),
      ),
    ),
  );

  const courtCount = venueCards.reduce(
    (total, venue) => total + venue.courts.length,
    0,
  );

  const nextGame = nextBooking
    ? {
        href:
          nextBooking.status === "CONFIRMED"
            ? `/booking/success/${nextBooking.id}`
            : `/checkout/${nextBooking.id}`,
        status: nextBooking.status,
        venueName: nextBooking.court.venue.name,
        courtName: nextBooking.court.name,
        dateLabel: formatDateTimeLong(nextBooking.slotStart),
        amount:
          nextBooking.status === "PENDING"
            ? nextBooking.dueAmount
            : nextBooking.paidAmount,
      }
    : null;

  return (
    <div className="min-h-dvh pb-28">
      <BrandHeader />

      <main className="mx-auto max-w-5xl px-4">
        <section className="relative overflow-hidden pt-8 sm:pt-14">
          <div className="pointer-events-none absolute right-0 top-0 -z-10 size-72 rounded-full bg-emerald-400/[0.08] blur-3xl" />

          <div className="max-w-3xl animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/15 bg-emerald-400/[0.07] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
              <MapPin className="size-3.5" />
              Melvisharam · Vellore district
            </div>

            <h1 className="text-balance mt-4 text-4xl font-semibold tracking-[-0.035em] text-white sm:text-6xl">
              Your next game is{" "}
              <span className="text-emerald-400">closer than you think.</span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400 sm:text-base">
              Floodlit football turf, cricket nets, and badminton courts.
              Check live slots, pay by UPI, and walk in with your digital pass.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-300">
                <Zap className="size-3.5 text-emerald-400" />
                Instant confirmation
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-300">
                <ShieldCheck className="size-3.5 text-cyan-400" />
                AI-verified UPI
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-[11px] text-slate-300">
                <WifiOff className="size-3.5 text-slate-400" />
                Offline passes
              </span>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-2 sm:max-w-md">
            <Stat value={String(venueCards.length)} label="Venues" />
            <Stat value={String(courtCount)} label="Courts" />
            <Stat value="₹25" label="Flat fee" />
          </div>
        </section>

        {nextGame && <NextGameBanner {...nextGame} />}

        <VenueDiscovery
          venues={venueCards}
          sports={
            sports.length > 0
              ? sports
              : ["Football", "Cricket", "Badminton"]
          }
        />

        <section className="mt-12 grid gap-3 sm:grid-cols-3">
          <Feature
            icon={<Clock3 className="size-4" />}
            title="Live availability"
            copy="Green means open. Slots lock for 1 minute while you pay."
          />
          <Feature
            icon={<ShieldCheck className="size-4" />}
            title="Pay with UPI"
            copy="GPay or PhonePe. Upload the receipt and Gemini verifies it."
          />
          <Feature
            icon={<WifiOff className="size-4" />}
            title="Pass works offline"
            copy="Your confirmed pass is cached on this device for check-in."
          />
        </section>

        <footer className="mt-12 flex flex-col items-center gap-1 border-t border-white/5 py-8 text-center">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <Sparkles className="size-3.5 text-emerald-400" />
            Built for local sport in Melvisharam
          </div>
          <p className="text-[10px] text-slate-600">
            CourtConnect · Live courts, zero commission, instant passes
          </p>
        </footer>
      </main>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-white/7 bg-surface/60 px-3 py-3 backdrop-blur">
      <p className="text-lg font-semibold tracking-tight text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
    </div>
  );
}

function Feature({
  icon,
  title,
  copy,
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-2xl border border-white/7 bg-surface/55 p-4">
      <div className="grid size-9 place-items-center rounded-xl border border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-white">{title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-slate-400">{copy}</p>
    </div>
  );
}
