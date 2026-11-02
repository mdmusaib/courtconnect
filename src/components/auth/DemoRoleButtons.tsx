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
            className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-55 ${
              isActive
                ? "border-emerald-300 bg-primary-soft"
                : "border-line bg-white hover:border-emerald-300 hover:bg-primary-soft"
            }`}
          >
            <span
              className={`grid size-10 shrink-0 place-items-center rounded-xl border ${
                isActive
                  ? "border-emerald-200 bg-emerald-100/70 text-emerald-700"
                  : "border-line bg-slate-900/[0.03] text-slate-500 group-hover:text-emerald-600"
              }`}
            >
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Icon className="size-4" />
              )}
            </span>

            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                Continue as {account.label}
                {isActive && (
                  <span className="rounded-full border border-emerald-200 bg-primary-soft px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    Active
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-[11px] leading-relaxed text-slate-500">
                {account.description}
              </span>
            </span>

            <ArrowRight className="size-4 shrink-0 text-slate-400 transition group-hover:text-emerald-600" />
          </button>
        );
      })}
    </div>
  );
}
