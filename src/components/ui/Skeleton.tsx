/**
 * Shimmering skeleton primitives shared by every route-level `loading.tsx`.
 * They render the same layout rhythm as each destination screen so the
 * skeleton-to-content swap does not jump.
 */

export function ShimmerBox({
  className = "",
  variant = "emerald",
}: {
  className?: string;
  /** "emerald" for section-level placeholders, "neutral" for chrome/text. */
  variant?: "emerald" | "neutral";
}) {
  const gradient =
    variant === "emerald"
      ? "bg-[linear-gradient(100deg,rgba(15,23,42,0.05)_40%,rgba(5,150,105,0.12)_50%,rgba(15,23,42,0.05)_60%)]"
      : "bg-[linear-gradient(100deg,rgba(15,23,42,0.04)_40%,rgba(15,23,42,0.08)_50%,rgba(15,23,42,0.04)_60%)]";

  return (
    <div
      aria-hidden
      className={`animate-shimmer rounded-2xl bg-[length:200%_100%] ${gradient} ${className}`}
    />
  );
}

export function SkeletonHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <ShimmerBox variant="neutral" className="size-9 rounded-full" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <ShimmerBox variant="neutral" className="h-3.5 w-40" />
          <ShimmerBox variant="neutral" className="h-2.5 w-24" />
        </div>
      </div>
    </header>
  );
}

export function SkeletonSlotGrid({ blocks = 2 }: { blocks?: number }) {
  return (
    <section className="rounded-3xl border border-line bg-card p-4">
      <div className="flex items-center justify-between">
        <ShimmerBox className="h-3.5 w-32" />
        <ShimmerBox className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: blocks * 4 }, (_, index) => (
          <ShimmerBox key={index} className="h-[84px]" />
        ))}
      </div>
    </section>
  );
}

export function SkeletonTimeline({ blocks = 10 }: { blocks?: number }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {Array.from({ length: blocks }, (_, index) => (
        <ShimmerBox key={index} className="h-20 w-[76px] shrink-0" />
      ))}
    </div>
  );
}
