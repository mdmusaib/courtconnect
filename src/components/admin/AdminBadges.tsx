import type {
  DisputeResolutionValue,
  DisputeStatusValue,
  RefundStatusValue,
  VerificationStatusValue,
} from "@/lib/types";

export function VerificationBadge({
  status,
}: {
  status: VerificationStatusValue;
}) {
  const style =
    status === "VERIFIED"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : status === "REJECTED"
        ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
        : "border-amber-400/20 bg-amber-400/10 text-amber-300";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${style}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function DisputeBadge({ status }: { status: DisputeStatusValue }) {
  const style =
    status === "OPEN"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
      : status === "UNDER_REVIEW"
        ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
        : status === "RESOLVED"
          ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
          : "border-rose-400/20 bg-rose-400/10 text-rose-300";

  const label = status.replace("_", " ");

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] ${style}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function RefundBadge({ status }: { status: RefundStatusValue }) {
  const style =
    status === "PROCESSED"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : status === "PENDING"
        ? "border-amber-400/20 bg-amber-400/10 text-amber-300"
        : status === "FAILED"
          ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
          : "border-white/8 bg-white/[0.03] text-slate-500";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${style}`}
    >
      {status === "NONE" ? "No refund" : status}
    </span>
  );
}

export function ResolutionBadge({
  resolution,
}: {
  resolution: DisputeResolutionValue;
}) {
  if (resolution === "NONE") {
    return null;
  }

  const style =
    resolution === "FULL_REFUND"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
      : resolution === "PARTIAL_REFUND"
        ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-300"
        : "border-rose-400/20 bg-rose-400/10 text-rose-300";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${style}`}
    >
      {resolution.replace("_", " ")}
    </span>
  );
}

export function PaymentModeBadge({ mode }: { mode: string }) {
  const label = mode.replaceAll("_", " ").toLowerCase();
  const direct = ["OFFLINE_CASH", "PHONE_BOOKING", "MANUAL_EXTERNAL"].includes(
    mode,
  );

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-medium capitalize ${
        direct
          ? "border-violet-400/20 bg-violet-400/[0.08] text-violet-200"
          : "border-white/8 bg-white/[0.03] text-slate-400"
      }`}
    >
      {label}
    </span>
  );
}
