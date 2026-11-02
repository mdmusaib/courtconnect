import Link from "next/link";
import { ArrowRight, SearchX, Ticket } from "lucide-react";

export function EmptyState({
  title,
  description,
  actionLabel = "Find a venue",
  actionHref = "/#venues",
  variant = "search",
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  variant?: "search" | "bookings";
}) {
  const Icon = variant === "bookings" ? Ticket : SearchX;

  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-line bg-card text-slate-400">
        <Icon className="size-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500">
        {description}
      </p>
      <Link
        href={actionHref}
        className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        {actionLabel}
        <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
