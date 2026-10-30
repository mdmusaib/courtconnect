"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { formatINR } from "@/lib/format";

type RefundAction = "PROCESS" | "FAIL";

export function RefundProcessButton({
  bookingId,
  amount,
}: {
  bookingId: string;
  amount: number;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<RefundAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit(action: RefundAction) {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/refunds/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, action }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Could not update the refund.");
      }

      setDone(action === "PROCESS" ? "Refund marked paid" : "Refund marked failed");
      setPending(null);
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not update the refund.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-300">
        <CheckCircle2 className="size-3" />
        {done}
      </span>
    );
  }

  if (!pending) {
    return (
      <button
        type="button"
        onClick={() => {
          setPending("PROCESS");
          setError(null);
        }}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-amber-400/20 bg-amber-400/[0.08] px-2 text-[9px] font-semibold text-amber-200 transition hover:border-amber-400/40 hover:bg-amber-400/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
      >
        Mark paid
      </button>
    );
  }

  return (
    <div className="min-w-[9.5rem] rounded-lg border border-amber-400/15 bg-amber-400/[0.04] p-2">
      <p className="text-[9px] leading-relaxed text-amber-100">
        {pending === "PROCESS"
          ? `Confirm ${formatINR(amount)} reached the player?`
          : `Mark ${formatINR(amount)} as failed?`}
      </p>
      {error && (
        <p className="mt-1 text-[9px] text-rose-300">{error}</p>
      )}
      <div className="mt-1.5 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => submit(pending)}
          disabled={busy}
          className="inline-flex h-6 items-center gap-1 rounded-md bg-amber-300 px-1.5 text-[9px] font-semibold text-oled transition hover:bg-amber-200 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-2.5 animate-spin" />
          ) : (
            <CheckCircle2 className="size-2.5" />
          )}
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setPending(pending === "PROCESS" ? "FAIL" : null)}
          disabled={busy}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-rose-400/20 px-1.5 text-[9px] font-medium text-rose-200 transition hover:bg-rose-400/[0.08] disabled:opacity-60"
        >
          <XCircle className="size-2.5" />
          {pending === "PROCESS" ? "Mark failed" : "Cancel"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPending(null);
            setError(null);
          }}
          disabled={busy}
          className="h-6 px-1 text-[9px] text-slate-500 transition hover:text-white disabled:opacity-60"
        >
          Close
        </button>
      </div>
    </div>
  );
}
