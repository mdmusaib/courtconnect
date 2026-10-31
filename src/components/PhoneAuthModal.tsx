"use client";

import { useEffect, useId, useState } from "react";
import { AlertCircle, LockKeyhole, ShieldCheck, X } from "lucide-react";
import { DemoRoleButtons } from "@/components/auth/DemoRoleButtons";
import type { SessionUser } from "@/lib/auth-types";
import {
  DemoAuthError,
  switchDemoRole,
  type DemoRole,
} from "@/lib/demo-auth";

export function PhoneAuthModal({
  open,
  onClose,
  onSuccess,
  next,
  title = "Choose a demo role",
  message,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: (user: SessionUser) => void;
  next?: string;
  title?: string;
  message?: string;
}) {
  const [busyRole, setBusyRole] = useState<DemoRole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    setBusyRole(null);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busyRole) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, busyRole]);

  async function chooseRole(role: DemoRole) {
    if (busyRole) {
      return;
    }

    setBusyRole(role);
    setError(null);

    try {
      const user = await switchDemoRole(role);
      onSuccess?.(user);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof DemoAuthError
          ? caught.message
          : "Could not create the demo session. Please try again.",
      );
    } finally {
      setBusyRole(null);
    }
  }

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-oled/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busyRole) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md animate-pop overflow-hidden rounded-t-3xl border border-white/10 bg-surface shadow-[0_40px_120px_-30px_rgba(0,0,0,1)] sm:rounded-3xl"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-emerald-400/[0.08] blur-3xl" />

        <div className="relative flex items-start justify-between gap-3 border-b border-white/6 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h2
                id={titleId}
                className="text-sm font-semibold tracking-tight text-white"
              >
                {title}
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Instant dev sign-in — no OTP, SMS, or Firebase.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={Boolean(busyRole)}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-white/8 bg-white/[0.03] text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
            aria-label="Close sign-in"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="relative px-5 py-5">
          {message && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.055] px-3 py-2.5 text-[11px] leading-relaxed text-cyan-100/90">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
              {message}
            </div>
          )}

          <DemoRoleButtons
            onSelect={chooseRole}
            busyRole={busyRole}
            disabled={Boolean(busyRole)}
          />

          {error && (
            <div
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-rose-100"
            >
              <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              {error}
            </div>
          )}

          <p className="mt-5 border-t border-white/6 pt-3 text-center text-[9px] leading-relaxed text-slate-600">
            Each button writes a signed HTTP-only{" "}
            <code className="text-slate-500">courtconnect_session</code> JWT for
            the selected role. Role checks and phone verification are disabled
            for feature testing.
            {next ? " You will return to your original page after switching." : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
