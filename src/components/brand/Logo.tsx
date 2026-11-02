import Link from "next/link";
import { Zap } from "lucide-react";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      aria-label="CourtConnect home"
    >
      <span className="relative grid size-9 place-items-center rounded-xl bg-primary text-white shadow-primary transition group-hover:bg-primary-deep">
        <Zap className="size-5" fill="currentColor" strokeWidth={0} />
      </span>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-slate-900">
          Court<span className="text-primary">Connect</span>
        </span>
      )}
    </Link>
  );
}
