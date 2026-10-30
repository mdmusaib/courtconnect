import { ShimmerBox, SkeletonHeader } from "@/components/ui/Skeleton";

export default function VenueLoading() {
  return (
    <div className="min-h-dvh pb-44 sm:pb-16">
      <SkeletonHeader />

      <main className="mx-auto max-w-5xl px-4">
        <section className="mt-4 grid gap-2 sm:grid-cols-[1.55fr_1fr]">
          <ShimmerBox className="h-64 rounded-3xl sm:h-[350px]" />
          <div className="hidden gap-2 sm:grid sm:grid-rows-[1fr_auto]">
            <ShimmerBox className="h-full rounded-3xl" />
            <ShimmerBox className="h-36 rounded-3xl" />
          </div>
        </section>

        <section className="mt-5">
          <div className="flex flex-wrap gap-2">
            <ShimmerBox className="h-6 w-32 rounded-full" />
            <ShimmerBox className="h-6 w-20 rounded-full" />
            <ShimmerBox className="h-6 w-28 rounded-full" />
          </div>
          <ShimmerBox className="mt-3 h-9 w-full max-w-sm" />
          <div className="mt-4 flex flex-wrap gap-2">
            {[0, 1, 2, 3, 4].map((pill) => (
              <ShimmerBox key={pill} className="h-8 w-24 rounded-xl" />
            ))}
          </div>
        </section>

        <section className="mt-8">
          <div className="flex gap-2 overflow-hidden">
            <ShimmerBox className="h-11 w-36" />
            <ShimmerBox className="h-11 w-36" />
          </div>
          <div className="mt-4 rounded-3xl border border-white/8 bg-surface/80 p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <ShimmerBox className="size-11" />
                <div className="space-y-2">
                  <ShimmerBox className="h-2.5 w-20" />
                  <ShimmerBox className="h-4 w-32" />
                </div>
              </div>
              <ShimmerBox className="h-7 w-16" />
            </div>
            <ShimmerBox className="mt-5 h-12 w-full" />
          </div>
        </section>
      </main>
    </div>
  );
}
