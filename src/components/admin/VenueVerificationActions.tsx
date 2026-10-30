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
      <div className="flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2 text-[10px] leading-relaxed text-emerald-200">
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
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-400 px-3 text-[10px] font-semibold text-oled transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
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
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-3 text-[10px] font-semibold text-rose-200 transition hover:border-rose-400/40 hover:bg-rose-400/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
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
    <div className="rounded-xl border border-white/8 bg-oled/60 p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          {mode === "VERIFY" ? "Approve listing" : "Reject listing"}
        </p>
        <button
          type="button"
          onClick={() => {
            setMode(null);
            setNotes("");
            setError(null);
          }}
          className="grid size-6 place-items-center rounded-full border border-white/8 text-slate-500 transition hover:text-white"
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
        className="mt-2 w-full rounded-lg border border-white/10 bg-oled/80 px-2.5 py-2 text-[11px] text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-400/15"
      />

      {error && (
        <p className="mt-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-2.5 py-1.5 text-[10px] text-rose-200">
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
              ? "bg-emerald-400 text-oled hover:bg-emerald-300 focus-visible:ring-emerald-300"
              : "bg-rose-400 text-oled hover:bg-rose-300 focus-visible:ring-rose-300"
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
        <span className="text-[9px] text-slate-600">
          Written to the admin audit log
        </span>
      </div>
    </div>
  );
}
