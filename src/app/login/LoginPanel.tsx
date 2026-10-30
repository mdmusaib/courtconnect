"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight, LogIn, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { RoleBadge } from "@/components/auth/RoleBadge";
import { displayPhone } from "@/lib/auth-types";

export function LoginPanel({
  next,
  reason,
}: {
  next?: string;
  reason?: string;
}) {
  const { user, loading, openLogin } = useAuth();
  const opened = useRef(false);

  useEffect(() => {
    if (loading || user || opened.current) {
      return;
    }

    opened.current = true;
    openLogin({
      next,
      title: next?.startsWith("/owner") || next?.startsWith("/admin")
        ? "Staff sign-in"
        : "Sign in to continue",
      message: reason,
    });
  }, [loading, user, next, reason, openLogin]);

  return (
    <section className="mt-5 animate-fade-up overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-surface via-surface to-oled p-6 shadow-[0_30px_90px_-55px_rgba(0,0,0,1)]">
      <div className="grid size-12 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
        <Phone className="size-5" />
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {user ? "You are signed in." : "One phone number. Every pass."}
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
        {reason ??
          "Sign in with any 10-digit mobile number and the shared demo OTP 1234 to book slots, keep digital passes, and manage your venues."}
      </p>

      {loading ? (
        <div className="mt-6 h-12 w-full animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]" />
      ) : user ? (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {displayPhone(user.phone)}
              </p>
            </div>
            <RoleBadge role={user.role} />
          </div>
          <Link
            href={next ?? "/"}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-semibold text-oled transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Continue
            <ArrowRight className="size-4" />
          </Link>
        </div>
      ) : (
        <button
          type="button"
          onClick={() =>
            openLogin({
              next,
              title: "Sign in to continue",
              message: reason,
            })
          }
          className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-semibold text-oled transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
        >
          <LogIn className="size-4" />
          Sign in with phone
        </button>
      )}

      <div className="mt-6 grid gap-2 border-t border-white/6 pt-5 text-[11px] text-slate-400">
        <p className="flex items-center gap-2">
          <ShieldCheck className="size-3.5 text-emerald-400" />
          Demo mode verifies the shared test OTP 1234 — no SMS is sent.
        </p>
        <p className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-cyan-300" />
          Your role decides whether the owner or admin console appears.
        </p>
      </div>
    </section>
  );
}
