import { notFound } from "next/navigation";
import { PageHeader } from "@/components/navigation/PageHeader";
import { SlotRangeSelector } from "@/components/SlotRangeSelector";
import {
  buildDaySchedules,
  getVenueBookingData,
  getWeekDays,
} from "@/lib/booking-data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose your hours",
};

export default async function BookVenuePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ courtId?: string; date?: string }>;
}) {
  const { id } = await params;
  const { courtId, date } = await searchParams;
  const days = getWeekDays(7);
  const data = await getVenueBookingData(id, days);

  if (!data) {
    notFound();
  }

  return (
    <div className="min-h-dvh pb-80">
      <PageHeader
        backHref={`/venue/${data.venue.id}`}
        backLabel="Venue"
        title="Choose your hours"
        subtitle={data.venue.name}
        right={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.06] px-2.5 py-1 text-[10px] font-medium text-emerald-300">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            Live
          </span>
        }
      />

      <main className="mx-auto max-w-5xl px-4 pt-4">
        {data.venue.courts.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-5 py-12 text-center">
            <p className="text-sm font-semibold text-white">
              No courts are open for booking yet.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Check back soon or explore another venue.
            </p>
          </div>
        ) : (
          <SlotRangeSelector
            venue={data.venue}
            days={buildDaySchedules(days)}
            bookings={data.bookings}
            initialCourtId={courtId}
            initialDateKey={date}
            nowIso={new Date().toISOString()}
          />
        )}
      </main>
    </div>
  );
}
