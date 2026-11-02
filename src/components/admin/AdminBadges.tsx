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
      ? "border-emerald-200 bg-primary-soft text-emerald-700"
      : status === "REJECTED"
        ? "border-rose-200 bg-rose-50 text-rose-700"
        : "border-amber-200 bg-amber-50 text-amber-700";

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
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : status === "UNDER_REVIEW"
        ? "border-cyan-200 bg-cyan-50 text-cyan-700"
        : status === "RESOLVED"
          ? "border-emerald-200 bg-primary-soft text-emerald-700"
          : "border-rose-200 bg-rose-50 text-rose-700";

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
      ? "border-emerald-200 bg-primary-soft text-emerald-700"
      : status === "PENDING"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : status === "FAILED"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-line bg-slate-50 text-slate-500";

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
      ? "border-emerald-200 bg-primary-soft text-emerald-700"
      : resolution === "PARTIAL_REFUND"
        ? "border-cyan-200 bg-cyan-50 text-cyan-700"
        : "border-rose-200 bg-rose-50 text-rose-700";

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
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : "border-line bg-slate-50 text-slate-500"
      }`}
    >
      {label}
    </span>
  );
}
