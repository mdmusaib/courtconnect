import type { BookingStatusValue } from "@/lib/types";

const styles: Record<
  BookingStatusValue,
  { label: string; className: string; dot: string }
> = {
  PENDING: {
    label: "Payment pending",
    className: "border-amber-200 bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  CONFIRMED: {
    label: "Confirmed",
    className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-600",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "border-rose-200 bg-rose-50 text-rose-600",
    dot: "bg-rose-500",
  },
  EXPIRED: {
    label: "Expired",
    className: "border-slate-200 bg-slate-100 text-slate-500",
    dot: "bg-slate-400",
  },
  MAINTENANCE: {
    label: "Maintenance",
    className: "border-cyan-200 bg-cyan-50 text-cyan-700",
    dot: "bg-cyan-600",
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
