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
      className={`inline-flex items-center gap-0.5 rounded-full border border-line bg-slate-900/[0.03] p-0.5 ${className}`}
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
            className={`inline-flex h-7 items-center gap-1.5 rounded-full px-2 text-[9px] font-semibold uppercase tracking-[0.08em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 ${
              active
                ? "bg-primary-soft text-emerald-700"
                : "text-slate-500 hover:bg-slate-900/[0.05] hover:text-slate-700"
            }`}
          >
            {busy ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <span
                className={`size-1.5 rounded-full ${
                  active ? "bg-emerald-600" : "bg-slate-400"
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
