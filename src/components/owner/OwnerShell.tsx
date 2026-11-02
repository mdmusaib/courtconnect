"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  CalendarDays,
  LayoutDashboard,
  Plus,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { DevRoleSwitcher } from "@/components/auth/DevRoleSwitcher";
import { RoleBadge } from "@/components/auth/RoleBadge";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { displayPhone, type UserRole } from "@/lib/auth-types";

const navItems = [
  {
    href: "/owner",
    label: "Overview",
    icon: LayoutDashboard,
    isActive: (pathname: string) => pathname === "/owner",
  },
  {
    href: "/owner/calendar",
    label: "Calendar",
    icon: CalendarDays,
    isActive: (pathname: string) => pathname.startsWith("/owner/calendar"),
  },
  {
    href: "/owner/quick-entry",
    label: "Quick entry",
    icon: Plus,
    isActive: (pathname: string) => pathname.startsWith("/owner/quick-entry"),
  },
];

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function OwnerShell({
  ownerName,
  ownerPhone,
  ownerRole,
  children,
}: {
  ownerName: string;
  ownerPhone?: string;
  ownerRole?: UserRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentTitle =
    pathname.startsWith("/owner/calendar") ? "Calendar" : "Owner console";

  return (
    <div className="min-h-dvh">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[17rem] flex-col border-r border-line bg-white/95 backdrop-blur-xl lg:flex">
        <div className="flex h-full flex-col px-5 py-6">
          <Link
            href="/owner"
            className="group flex items-center gap-3 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-primary text-white shadow-primary transition group-hover:bg-primary-deep">
              <Zap className="size-5" fill="currentColor" strokeWidth={0} />
            </span>
            <span>
              <span className="block text-[15px] font-semibold tracking-tight text-slate-900">
                Court<span className="text-primary">Connect</span>
              </span>
              <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Owner console
              </span>
            </span>
          </Link>

          <div className="mt-8 rounded-2xl border border-line bg-slate-50 p-3">
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 place-items-center rounded-full border border-emerald-200 bg-primary-soft text-xs font-semibold text-primary">
                {initialsFor(ownerName) || "O"}
              </span>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-slate-900">
                  {ownerName}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">
                  {ownerPhone ? displayPhone(ownerPhone) : "Turf owner"}
                </p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {ownerRole && <RoleBadge role={ownerRole} />}
            </div>
            <DevRoleSwitcher className="mt-2 w-full justify-center" />
            <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-primary-soft px-2 py-1.5 text-[9px] font-medium text-emerald-700">
              <ShieldCheck className="size-3" />
              Direct entries · ₹0 fee
            </div>
          </div>

          <nav className="mt-6 flex flex-col gap-1" aria-label="Owner navigation">
            {navItems.map((item) => {
              const active = item.isActive(pathname);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                    active
                      ? "border-emerald-200 bg-primary-soft text-primary"
                      : "border-transparent text-slate-500 hover:border-line hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto space-y-2">
            <Link
              href="/"
              className="flex items-center justify-between gap-2 rounded-xl border border-line bg-slate-50 px-3 py-2.5 text-xs font-medium text-slate-500 transition hover:border-slate-900/15 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Open player app
              <ArrowUpRight className="size-3.5" />
            </Link>
            <SignOutButton className="w-full" />
            <p className="px-1 text-[9px] leading-relaxed text-slate-400">
              Owner direct bookings bypass AI verification and carry no platform
              fee.
            </p>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link
            href="/owner"
            className="flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-primary text-white">
              <Zap className="size-4" fill="currentColor" strokeWidth={0} />
            </span>
            <span>
              <span className="block text-[13px] font-semibold tracking-tight text-slate-900">
                Court<span className="text-primary">Connect</span>
              </span>
              <span className="block text-[8px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {currentTitle}
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <DevRoleSwitcher />
            <span className="hidden items-center gap-1.5 rounded-full border border-emerald-200 bg-primary-soft px-2.5 py-1 text-[9px] font-medium text-emerald-700 sm:inline-flex">
              <ShieldCheck className="size-3" />
              ₹0 fee
            </span>
            <Link
              href="/"
              className="grid size-8 place-items-center rounded-full border border-line bg-slate-50 text-slate-500 transition hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              aria-label="Open player app"
            >
              <ArrowUpRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <div className="lg:pl-[17rem]">
        <main className="mx-auto max-w-7xl px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-8">
          {children}
        </main>
      </div>

      <nav
        aria-label="Owner mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/90 shadow-nav backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid max-w-md grid-cols-3 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {navItems.map((item) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                  active ? "text-primary" : "text-slate-500 hover:text-slate-600"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
