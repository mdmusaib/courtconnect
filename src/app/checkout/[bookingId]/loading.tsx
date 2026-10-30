import { ShimmerBox, SkeletonHeader } from "@/components/ui/Skeleton";

export default function CheckoutLoading() {
  return (
    <div className="min-h-dvh pb-28">
      <SkeletonHeader />

      <main className="mx-auto max-w-5xl px-4 pt-5">
        <div className="mb-5 flex gap-2">
          <ShimmerBox className="h-6 w-28 rounded-full" />
          <ShimmerBox className="h-6 w-32 rounded-full" />
          <ShimmerBox className="h-6 w-20 rounded-full" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-4">
            <section className="rounded-3xl border border-white/8 bg-surface/80 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <ShimmerBox className="h-2.5 w-24" />
                  <ShimmerBox className="h-7 w-28" />
                  <ShimmerBox className="h-3.5 w-44" />
                </div>
                <ShimmerBox className="size-11 rounded-2xl" />
              </div>
              <ShimmerBox className="mt-5 h-12 w-full" />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <ShimmerBox className="h-10" />
                <ShimmerBox className="h-10" />
              </div>
            </section>

            <section className="rounded-3xl border border-white/8 bg-surface/80 p-5">
              <div className="flex items-start gap-3">
                <ShimmerBox className="size-10" />
                <div className="flex-1 space-y-2">
                  <ShimmerBox className="h-4 w-52" />
                  <ShimmerBox className="h-3 w-full max-w-xs" />
                </div>
              </div>
              <ShimmerBox className="mt-4 h-52 w-full" />
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-3xl border border-white/8 bg-surface/85 p-5">
              <div className="flex items-center gap-3">
                <ShimmerBox className="size-11" />
                <div className="min-w-0 flex-1 space-y-2">
                  <ShimmerBox className="h-3.5 w-40" />
                  <ShimmerBox className="h-2.5 w-24" />
                </div>
              </div>
              <div className="mt-4 space-y-3 pt-2">
                <ShimmerBox className="h-4 w-full" />
                <ShimmerBox className="h-4 w-full" />
                <ShimmerBox className="h-4 w-2/3" />
              </div>
            </section>
            <ShimmerBox className="h-28 w-full rounded-3xl" />
          </aside>
        </div>
      </main>
    </div>
  );
}
