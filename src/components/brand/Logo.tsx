import Link from "next/link";
import { Zap } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
      aria-label="CourtConnect home"
    >
      <span className="relative grid size-9 place-items-center rounded-xl bg-emerald-400 text-oled shadow-[0_0_28px_-8px_#10B981] transition group-hover:bg-emerald-300">
        <Zap className="size-5" fill="currentColor" strokeWidth={0} />
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-white">
          Court<span className="text-emerald-400">Connect</span>
        </span>
      )}
    </Link>
  );
}
