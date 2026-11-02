import { ShimmerBox, SkeletonHeader } from "@/components/ui/Skeleton";

export default function BookingSuccessLoading() {
  return (
    <div className="min-h-dvh pb-28">
      <SkeletonHeader />

      <main className="mx-auto max-w-lg px-4 pt-8">
        <div className="flex flex-col items-center">
          <ShimmerBox className="size-20 rounded-full" />
          <ShimmerBox className="mt-4 h-6 w-48 rounded-full" />
          <ShimmerBox className="mt-3 h-8 w-64" />
          <ShimmerBox className="mt-2 h-3.5 w-72" />
        </div>

        <section className="mt-8 rounded-[2rem] border border-line bg-card p-6 shadow-lift">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <ShimmerBox className="h-2.5 w-32" />
              <ShimmerBox className="h-6 w-44" />
              <ShimmerBox className="h-3 w-28" />
            </div>
            <ShimmerBox className="size-11 rounded-2xl" />
          </div>

          <div className="mt-6 flex flex-col items-center gap-5 sm:flex-row sm:items-center">
            <div className="rounded-2xl border border-line bg-white p-2.5 shadow-card">
              <ShimmerBox className="size-48 rounded-lg" />
            </div>
            <div className="grid w-full grid-cols-2 gap-3">
              <ShimmerBox className="h-14 rounded-xl" />
              <ShimmerBox className="h-14 rounded-xl" />
              <ShimmerBox className="h-14 rounded-xl" />
              <ShimmerBox className="h-14 rounded-xl" />
              <ShimmerBox className="h-14 rounded-xl" />
              <ShimmerBox className="h-14 rounded-xl" />
            </div>
          </div>

          <ShimmerBox className="mt-5 h-px w-full" />

          <div className="mt-4 flex justify-between gap-4">
            <div className="flex-1 space-y-2">
              <ShimmerBox className="h-2.5 w-20" />
              <ShimmerBox className="h-3.5 w-40" />
            </div>
            <div className="flex-1 space-y-2">
              <ShimmerBox className="h-2.5 w-20" />
              <ShimmerBox className="h-3.5 w-32" />
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <ShimmerBox className="h-11 w-full" />
          <ShimmerBox className="h-11 w-full" />
          <ShimmerBox className="h-11 w-full" />
        </div>
      </main>
    </div>
  );
}
