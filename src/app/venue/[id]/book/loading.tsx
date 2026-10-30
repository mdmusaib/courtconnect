import { ShimmerBox, SkeletonHeader, SkeletonSlotGrid } from "@/components/ui/Skeleton";

export default function BookVenueLoading() {
  return (
    <div className="min-h-dvh pb-80">
      <SkeletonHeader />

      <main className="mx-auto max-w-5xl px-4 pt-4">
        <section className="rounded-3xl border border-white/[0.07] bg-surface/70 p-5 backdrop-blur-md">
          <ShimmerBox className="h-2.5 w-32" />
          <ShimmerBox className="mt-2 h-7 w-52" />
          <ShimmerBox className="mt-2 h-3.5 w-full max-w-sm" />
        </section>

        <section className="mt-4 rounded-3xl border border-white/[0.07] bg-surface/70 p-4 backdrop-blur-md">
          <ShimmerBox className="h-2.5 w-24" />
          <div className="no-scrollbar mt-3 flex gap-2 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map((day) => (
              <ShimmerBox key={day} className="h-[74px] w-[68px] shrink-0" />
            ))}
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-white/[0.07] bg-surface/70 p-4 backdrop-blur-md">
          <ShimmerBox className="h-2.5 w-16" />
          <div className="mt-3 flex gap-2 overflow-hidden">
            <ShimmerBox className="h-11 w-44 shrink-0" />
            <ShimmerBox className="h-11 w-44 shrink-0" />
          </div>
        </section>

        <div className="mt-4 space-y-4">
          <SkeletonSlotGrid blocks={3} />
          <SkeletonSlotGrid blocks={2} />
        </div>
      </main>
    </div>
  );
}
