import { ShimmerBox, SkeletonHeader } from "@/components/ui/Skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-dvh pb-28">
      <SkeletonHeader />

      <main className="mx-auto max-w-5xl px-4">
        <section className="pt-8 sm:pt-14">
          <ShimmerBox className="h-6 w-52 rounded-full" />
          <ShimmerBox className="mt-4 h-12 w-full max-w-2xl" />
          <ShimmerBox className="mt-3 h-12 w-full max-w-xl" />
          <ShimmerBox className="mt-4 h-4 w-full max-w-md" />
          <div className="mt-6 flex flex-wrap gap-2">
            <ShimmerBox className="h-8 w-40 rounded-full" />
            <ShimmerBox className="h-8 w-36 rounded-full" />
            <ShimmerBox className="h-8 w-32 rounded-full" />
          </div>
          <div className="mt-8 grid grid-cols-3 gap-2 sm:max-w-md">
            <ShimmerBox className="h-[68px]" />
            <ShimmerBox className="h-[68px]" />
            <ShimmerBox className="h-[68px]" />
          </div>
        </section>

        {[0, 1, 2, 3].map((block) => (
          <section
            key={block}
            className="mt-8 overflow-hidden rounded-3xl border border-white/[0.07] bg-surface/85"
          >
            <ShimmerBox className="h-44 rounded-none" />
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <ShimmerBox className="h-4 w-36" />
                <ShimmerBox className="size-8 rounded-full" />
              </div>
              <div className="mt-3 flex gap-1.5">
                <ShimmerBox className="h-6 w-20 rounded-full" />
                <ShimmerBox className="h-6 w-24 rounded-full" />
                <ShimmerBox className="h-6 w-16 rounded-full" />
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3">
                <ShimmerBox className="h-5 w-20" />
                <ShimmerBox className="h-4 w-28" />
              </div>
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
