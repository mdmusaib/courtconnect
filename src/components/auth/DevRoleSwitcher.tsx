"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/ToastProvider";
import {
  DEMO_ACCOUNT_LIST,
  DemoAuthError,
  type DemoRole,
} from "@/lib/demo-auth";

/**
 * Compact header control for instant role switching. Selecting a role writes
 * the HTTP-only session cookie and opens that role's landing page.
 */
export function DevRoleSwitcher({ className = "" }: { className?: string }) {
  const { user, signInAs } = useAuth();
  const { toast } = useToast();
  const [busyRole, setBusyRole] = useState<DemoRole | null>(null);

  async function chooseRole(role: DemoRole) {
    if (busyRole) {
      return;
    }

    setBusyRole(role);

    try {
      await signInAs(role);
    } catch (caught) {
      toast({
        title: "Role switch failed",
        description:
          caught instanceof DemoAuthError
            ? caught.message
            : "Could not create the demo session.",
        variant: "error",
      });
    } finally {
      setBusyRole(null);
    }
  }

  return (
    <div
      role="group"
      aria-label="Switch demo role"
      className={`inline-flex items-center gap-0.5 rounded-full border border-white/8 bg-white/[0.03] p-0.5 ${className}`}
    >
      {DEMO_ACCOUNT_LIST.map((account) => {
        const active = user?.role === account.role;
        const busy = busyRole === account.role;

        return (
          <button
            key={account.role}
            type="button"
            onClick={() => void chooseRole(account.role)}
            disabled={Boolean(busyRole)}
            aria-label={`Continue as ${account.label}`}
            aria-pressed={active}
            title={`Continue as ${account.label}`}
            className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2 text-[9px] font-semibold uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 disabled:cursor-not-allowed disabled:opacity-50 ${
              active
                ? "bg-emerald-400/15 text-emerald-200"
                : "text-slate-500 hover:bg-white/[0.05] hover:text-slate-200"
            }`}
          >
            {busy ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <span
                className={`size-1.5 rounded-full ${
                  active ? "bg-emerald-300" : "bg-slate-600"
                }`}
              />
            )}
            <span className="hidden sm:inline">{account.label}</span>
            <span className="sm:hidden">{account.role[0]}</span>
          </button>
        );
      })}
    </div>
  );
}
