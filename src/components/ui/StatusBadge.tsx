import type { BookingStatusValue } from "@/lib/types";

const styles: Record<
  BookingStatusValue,
  { label: string; className: string; dot: string }
> = {
  PENDING: {
    label: "Payment pending",
    className: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    dot: "bg-amber-400",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    dot: "bg-emerald-400",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "border-rose-400/20 bg-rose-400/10 text-rose-300",
    dot: "bg-rose-400",
  },
  EXPIRED: {
    label: "Expired",
    className: "border-slate-500/30 bg-slate-500/10 text-slate-400",
    dot: "bg-slate-500",
  },
  MAINTENANCE: {
    label: "Maintenance",
    className: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    dot: "bg-cyan-400",
  },
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: BookingStatusValue;
  className?: string;
}) {
  const style = styles[status] ?? styles.EXPIRED;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${style.className} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
