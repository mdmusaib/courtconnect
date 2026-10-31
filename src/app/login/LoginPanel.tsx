"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { DemoRoleButtons } from "@/components/auth/DemoRoleButtons";
import { RoleBadge } from "@/components/auth/RoleBadge";
import { displayPhone } from "@/lib/auth-types";
import {
  DEMO_ACCOUNTS,
  DemoAuthError,
  type DemoRole,
} from "@/lib/demo-auth";

export function LoginPanel({
  next,
  reason,
}: {
  next?: string;
  reason?: string;
}) {
  const { user, loading, signInAs } = useAuth();
  const [busyRole, setBusyRole] = useState<DemoRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function chooseRole(role: DemoRole) {
    if (busyRole) {
      return;
    }

    setBusyRole(role);
    setError(null);

    try {
      await signInAs(role, next);
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

  return (
    <section className="mt-5 animate-fade-up overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-surface via-surface to-oled p-6 shadow-[0_30px_90px_-55px_rgba(0,0,0,1)]">
      <div className="grid size-12 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
        <ShieldCheck className="size-5" />
      </div>

      <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">
        {user
          ? `Signed in as ${DEMO_ACCOUNTS[user.role].label}.`
          : "One tap. Any role."}
      </h1>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-400">
        {reason ??
          "Choose a role to write a signed session cookie instantly. Phone verification, OTP screens, and login walls are disabled for feature testing."}
      </p>

      {loading ? (
        <div className="mt-6 grid gap-2">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className="h-[4.25rem] w-full animate-pulse rounded-2xl border border-white/8 bg-white/[0.03]"
            />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <DemoRoleButtons
            onSelect={chooseRole}
            busyRole={busyRole}
            currentRole={user?.role ?? null}
            disabled={Boolean(busyRole)}
          />
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-rose-100"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </div>
      )}

      {user && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-white">
              {user.name}
              <RoleBadge role={user.role} />
            </p>
            <p className="mt-0.5 text-xs text-slate-400">
              {displayPhone(user.phone)}
            </p>
          </div>
          <Link
            href={next ?? DEMO_ACCOUNTS[user.role].destination}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-400 px-3 text-[11px] font-semibold text-oled transition hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          >
            Continue
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-2 border-t border-white/6 pt-5 text-[11px] text-slate-400">
        <p className="flex items-center gap-2">
          <LayoutDashboard className="size-3.5 text-emerald-400" />
          Player, owner, and admin dashboards open directly.
        </p>
        <p className="flex items-center gap-2">
          <Sparkles className="size-3.5 text-cyan-300" />
          Each switch sets an HTTP-only HS256 JWT signed with AUTH_SECRET.
        </p>
      </div>
    </section>
  );
}
