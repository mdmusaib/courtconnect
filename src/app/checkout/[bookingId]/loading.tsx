import { ShimmerBox, SkeletonHeader } from "@/components/ui/Skeleton";

export default function CheckoutLoading() {
  return (
    <div className="min-h-dvh pb-32">
      <SkeletonHeader />

      <main className="mx-auto max-w-lg px-4 pt-5">
        <div className="mb-5 flex gap-2">
          <ShimmerBox className="h-6 w-28 rounded-full" />
          <ShimmerBox className="h-6 w-32 rounded-full" />
          <ShimmerBox className="h-6 w-20 rounded-full" />
        </div>

        <div className="space-y-4">
          <section className="rounded-3xl border border-line bg-card p-5 shadow-card">
            <div className="flex items-center gap-3">
              <ShimmerBox className="size-11 rounded-2xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <ShimmerBox className="h-3.5 w-40" />
                <ShimmerBox className="h-2.5 w-24" />
              </div>
              <div className="space-y-2">
                <ShimmerBox className="h-2.5 w-10" />
                <ShimmerBox className="h-5 w-14" />
              </div>
            </div>
            <ShimmerBox className="mt-4 h-20 w-full rounded-2xl" />
            <div className="mt-4 space-y-3">
              <ShimmerBox className="h-4 w-full" />
              <ShimmerBox className="h-4 w-full" />
              <ShimmerBox className="h-5 w-2/3" />
            </div>
          </section>

          <section className="rounded-3xl border border-line bg-card p-5 shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <ShimmerBox className="h-2.5 w-24" />
                <ShimmerBox className="h-7 w-28" />
                <ShimmerBox className="h-3.5 w-44" />
              </div>
              <ShimmerBox className="size-11 rounded-2xl" />
            </div>
            <ShimmerBox className="mt-5 h-13 w-full" />
            <div className="mt-2 grid grid-cols-2 gap-2">
              <ShimmerBox className="h-10" />
              <ShimmerBox className="h-10" />
              <ShimmerBox className="h-10" />
              <ShimmerBox className="h-10" />
            </div>
            <ShimmerBox className="mt-4 h-16 w-full rounded-xl" />
          </section>

          <section className="rounded-3xl border border-line bg-card p-5 shadow-card">
            <div className="flex items-start gap-3">
              <ShimmerBox className="size-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <ShimmerBox className="h-4 w-52" />
                <ShimmerBox className="h-3 w-full max-w-xs" />
              </div>
            </div>
            <ShimmerBox className="mt-4 h-52 w-full rounded-2xl" />
          </section>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-nav">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <div className="space-y-2">
            <ShimmerBox className="h-2.5 w-20" />
            <ShimmerBox className="h-5 w-14" />
          </div>
          <ShimmerBox className="h-6 w-14 rounded-full" />
          <ShimmerBox className="ml-auto h-11 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
