"use client";

import {
  ArrowRight,
  LayoutDashboard,
  Loader2,
  ShieldEllipsis,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import {
  DEMO_ACCOUNT_LIST,
  type DemoRole,
} from "@/lib/demo-auth";

const ICONS: Record<DemoRole, LucideIcon> = {
  PLAYER: UserRound,
  OWNER: LayoutDashboard,
  ADMIN: ShieldEllipsis,
};

export function DemoRoleButtons({
  onSelect,
  busyRole = null,
  currentRole = null,
  disabled = false,
}: {
  onSelect: (role: DemoRole) => void | Promise<void>;
  busyRole?: DemoRole | null;
  currentRole?: DemoRole | null;
  disabled?: boolean;
}) {
  const busy = Boolean(busyRole);

  return (
    <div className="grid gap-2">
      {DEMO_ACCOUNT_LIST.map((account) => {
        const Icon = ICONS[account.role];
        const isBusy = busyRole === account.role;
        const isActive = currentRole === account.role;

        return (
          <button
            key={account.role}
            type="button"
            onClick={() => void onSelect(account.role)}
            disabled={disabled || busy}
            aria-label={`Continue as ${account.label}`}
            className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 disabled:cursor-not-allowed disabled:opacity-55 ${
              isActive
                ? "border-emerald-400/35 bg-emerald-400/[0.09]"
                : "border-white/8 bg-white/[0.025] hover:border-emerald-400/30 hover:bg-emerald-400/[0.05]"
            }`}
          >
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-xl border ${
                isActive
                  ? "border-emerald-400/25 bg-emerald-400/15 text-emerald-200"
                  : "border-white/8 bg-white/[0.03] text-slate-400 group-hover:text-emerald-300"
              }`}
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Icon className="size-4" />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-white">
                Continue as {account.label}
                {isActive && (
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-emerald-300">
                    Active
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                {account.description}
              </span>
            </span>

            <ArrowRight className="size-4 shrink-0 text-slate-600 transition group-hover:text-emerald-300" />
          </button>
        );
      })}
    </div>
  );
}
