"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  CircleSlash,
  Loader2,
  Scale,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { formatINR } from "@/lib/format";

type Resolution = "FULL_REFUND" | "PARTIAL_REFUND" | "REJECTED";

const OPTIONS: Array<{
  value: Resolution;
  title: string;
  description: string;
  icon: typeof Wallet;
}> = [
  {
    value: "FULL_REFUND",
    title: "Full refund",
    description: "Refund the full eligible court fee and mark it processed.",
    icon: Wallet,
  },
  {
    value: "PARTIAL_REFUND",
    title: "Partial refund",
    description: "Choose a custom amount up to the eligible court fee.",
    icon: Scale,
  },
  {
    value: "REJECTED",
    title: "Reject dispute",
    description: "Close the case without a platform refund.",
    icon: CircleSlash,
  },
];

export function DisputeResolutionForm({
  disputeId,
  maxRefund,
  existingRefundAmount,
}: {
  disputeId: string;
  maxRefund: number;
  existingRefundAmount: number;
}) {
  const router = useRouter();
  const [resolution, setResolution] = useState<Resolution>("FULL_REFUND");
  const [amount, setAmount] = useState(() =>
    String(Math.max(1, Math.round(maxRefund / 2))),
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    if (busy) {
      return;
    }

    if (resolution === "REJECTED" && note.trim().length < 5) {
      setError("Add a short note explaining the rejection.");
      return;
    }

    const refundAmount =
      resolution === "FULL_REFUND"
        ? maxRefund
        : resolution === "PARTIAL_REFUND"
          ? Number(amount)
          : 0;

    if (
      resolution === "PARTIAL_REFUND" &&
      (!Number.isFinite(refundAmount) ||
        refundAmount <= 0 ||
        refundAmount > maxRefund)
    ) {
      setError(`Enter a partial refund between ₹1 and ${formatINR(maxRefund)}.`);
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, refundAmount, note }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Could not save the dispute outcome.");
      }

      setDone(
        refundAmount > 0
          ? `${formatINR(refundAmount)} override approved and marked processed.`
          : "Dispute closed without a refund.",
      );
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save the dispute outcome.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-primary-soft px-3 py-2.5 text-[11px] leading-relaxed text-emerald-700">
        <CheckCircle2 className="size-4 shrink-0" />
        {done}
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-line bg-slate-50 p-3.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-700">
        Admin override
      </p>

      <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const active = resolution === option.value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setResolution(option.value)}
              aria-pressed={active}
              className={`rounded-xl border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/50 ${
                active
                  ? "border-cyan-300 bg-cyan-50 text-cyan-800"
                  : "border-line bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
              }`}
            >
              <Icon
                className={`size-3.5 ${active ? "text-cyan-700" : "text-slate-500"}`}
              />
              <p className="mt-1.5 text-[11px] font-semibold">{option.title}</p>
              <p className="mt-0.5 text-[9px] leading-relaxed opacity-75">
                {option.description}
              </p>
            </button>
          );
        })}
      </div>

      {resolution === "PARTIAL_REFUND" && (
        <label className="mt-3 block">
          <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-500">
            Refund amount (max {formatINR(maxRefund)})
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-xs text-slate-500">₹</span>
            <input
              type="number"
              min={1}
              max={maxRefund}
              step={1}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-9 w-32 rounded-lg border border-line bg-white px-2.5 text-xs text-slate-900 outline-none transition focus:border-cyan-600/40 focus:ring-2 focus:ring-cyan-600/15"
            />
            <span className="text-[9px] text-slate-400">
              Convenience fee stays non-refundable.
            </span>
          </div>
        </label>
      )}

      <label className="mt-3 block">
        <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-slate-500">
          Resolution note{" "}
          {resolution === "REJECTED" ? (
            <span className="text-rose-600">required</span>
          ) : (
            <span className="text-slate-400">optional</span>
          )}
        </span>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          maxLength={600}
          placeholder="What did you verify, and what is the outcome?"
          className="mt-1 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[11px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600/40 focus:ring-2 focus:ring-cyan-600/15"
        />
      </label>

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy || (resolution !== "REJECTED" && maxRefund <= 0)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-cyan-600 px-3.5 text-[11px] font-semibold text-white transition hover:bg-cyan-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-600/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="size-3.5" />
          )}
          {busy ? "Saving override…" : "Apply resolution"}
        </button>

        {existingRefundAmount > 0 && (
          <span className="text-[9px] text-slate-500">
            Booking already reflects {formatINR(existingRefundAmount)} refund
          </span>
        )}
      </div>

      {error && (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] text-rose-700">
          {error}
        </p>
      )}
    </div>
  );
}
