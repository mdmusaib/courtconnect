"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  ShieldX,
  X,
} from "lucide-react";
import type { VerificationStatusValue } from "@/lib/types";

type ActionMode = "VERIFY" | "REJECT" | null;

export function VenueVerificationActions({
  venueId,
  venueName,
  status,
}: {
  venueId: string;
  venueName: string;
  status: VerificationStatusValue;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<ActionMode>(null);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function submit() {
    if (!mode || busy) {
      return;
    }

    if (mode === "REJECT" && notes.trim().length < 5) {
      setError("Add a short reason so the owner knows what to fix.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch(`/api/admin/venues/${venueId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: mode, notes }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || "Could not update this venue.");
      }

      setDone(
        mode === "VERIFY"
          ? `${venueName} is now live for players.`
          : `${venueName} was rejected. The owner can fix the listing and resubmit.`,
      );
      setMode(null);
      setNotes("");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not update this venue.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-primary-soft px-3 py-2 text-[10px] leading-relaxed text-emerald-700">
        <CheckCircle2 className="size-3.5 shrink-0" />
        {done}
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        {status !== "VERIFIED" && (
          <button
            type="button"
            onClick={() => {
              setMode("VERIFY");
              setDone(null);
              setError(null);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-[10px] font-semibold text-white shadow-primary transition hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <ShieldCheck className="size-3.5" />
            {status === "REJECTED" ? "Re-verify venue" : "Verify venue"}
          </button>
        )}
        {status !== "REJECTED" && (
          <button
            type="button"
            onClick={() => {
              setMode("REJECT");
              setDone(null);
              setError(null);
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 text-[10px] font-semibold text-rose-600 transition hover:border-rose-300 hover:bg-rose-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
          >
            <ShieldX className="size-3.5" />
            Reject
          </button>
        )}
        {status === "VERIFIED" && (
          <span className="text-[10px] text-slate-500">
            Live in player discovery
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {mode === "VERIFY" ? "Approve listing" : "Reject listing"}
        </p>
        <button
          type="button"
          onClick={() => {
            setMode(null);
            setNotes("");
            setError(null);
          }}
          className="grid size-6 place-items-center rounded-full border border-line text-slate-500 transition hover:text-slate-900"
          aria-label="Cancel"
        >
          <X className="size-3" />
        </button>
      </div>

      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        rows={2}
        maxLength={500}
        placeholder={
          mode === "VERIFY"
            ? "Optional review note for the audit trail"
            : "What should the owner fix before resubmitting?"
        }
        className="mt-2 w-full rounded-lg border border-line bg-white px-2.5 py-2 text-[11px] text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
      />

      {error && (
        <p className="mt-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[10px] text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60 ${
            mode === "VERIFY"
              ? "bg-primary text-white hover:bg-primary-deep focus-visible:ring-primary/50"
              : "bg-rose-500 text-white hover:bg-rose-600 focus-visible:ring-rose-500/50"
          }`}
        >
          {busy ? (
            <Loader2 className="size-3 animate-spin" />
          ) : mode === "VERIFY" ? (
            <ShieldCheck className="size-3" />
          ) : (
            <ShieldX className="size-3" />
          )}
          {busy
            ? "Saving…"
            : mode === "VERIFY"
              ? "Confirm verification"
              : "Confirm rejection"}
        </button>
        <span className="text-[9px] text-slate-400">
          Written to the admin audit log
        </span>
      </div>
    </div>
  );
}
