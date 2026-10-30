import { ShimmerBox, SkeletonHeader } from "@/components/ui/Skeleton";

export default function BookingSuccessLoading() {
  return (
    <div className="min-h-dvh pb-28">
      <SkeletonHeader />

      <main className="mx-auto max-w-lg px-4 pt-8">
        <section className="rounded-3xl border border-white/8 bg-surface/85 p-6">
          <div className="flex flex-col items-center">
            <ShimmerBox className="size-16 rounded-full" />
            <ShimmerBox className="mt-4 h-6 w-40" />
            <ShimmerBox className="mt-2 h-3.5 w-56" />
          </div>

          <div className="mt-6 flex justify-center">
            <ShimmerBox className="size-52 rounded-2xl" />
          </div>

          <div className="mt-6 space-y-3">
            <ShimmerBox className="h-4 w-full" />
            <ShimmerBox className="h-4 w-2/3" />
          </div>

          <div className="mt-6 grid gap-2">
            <ShimmerBox className="h-12 w-full" />
            <ShimmerBox className="h-10 w-full" />
          </div>
        </section>
      </main>
    </div>
  );
}
