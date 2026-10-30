import { ShimmerBox, SkeletonHeader } from "@/components/ui/Skeleton";

export default function MyBookingsLoading() {
  return (
    <div className="min-h-dvh pb-28">
      <SkeletonHeader />

      <main className="mx-auto max-w-4xl px-4 pt-6">
        <section className="rounded-3xl border border-white/8 bg-gradient-to-br from-surface via-surface to-oled p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <ShimmerBox className="h-2.5 w-28" />
              <ShimmerBox className="h-7 w-56" />
              <ShimmerBox className="h-3.5 w-40" />
            </div>
            <ShimmerBox className="hidden h-14 w-24 rounded-2xl sm:block" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <ShimmerBox className="h-14" />
            <ShimmerBox className="h-14" />
            <ShimmerBox className="h-14" />
          </div>
        </section>

        <div className="mt-6 rounded-2xl border border-white/8 bg-surface/60 p-1">
          <div className="flex gap-1">
            <ShimmerBox className="h-10 flex-1 rounded-xl" />
            <ShimmerBox className="h-10 flex-1 rounded-xl" />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {[0, 1, 2].map((card) => (
            <section
              key={card}
              className="rounded-3xl border border-white/8 bg-surface/80 p-4"
            >
              <div className="flex items-start gap-3">
                <ShimmerBox className="size-12" />
                <div className="min-w-0 flex-1 space-y-2">
                  <ShimmerBox className="h-4 w-36" />
                  <ShimmerBox className="h-2.5 w-24" />
                </div>
                <ShimmerBox className="h-7 w-16" />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ShimmerBox className="h-9" />
                <ShimmerBox className="h-9" />
              </div>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
