"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  LayoutDashboard,
  LogIn,
  LogOut,
  ShieldEllipsis,
  Ticket,
  UserRound,
} from "lucide-react";
import { RoleBadge } from "@/components/auth/RoleBadge";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  displayPhone,
  initialsForName,
  roleLabel,
} from "@/lib/auth-types";

export function AuthMenu() {
  const { user, loading, openLogin, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (loading) {
    return (
      <span
        aria-label="Loading account"
        className="h-9 w-24 animate-pulse rounded-full border border-white/8 bg-white/[0.03]"
      />
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openLogin()}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 text-xs font-semibold text-emerald-200 transition hover:border-emerald-400/40 hover:bg-emerald-400/[0.12] hover:text-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
      >
        <LogIn className="size-3.5" />
        Sign in
      </button>
    );
  }

  const canUseOwnerDashboard = user.role === "OWNER" || user.role === "ADMIN";
  const canUseAdminDashboard = user.role === "ADMIN";

  async function handleSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);

    try {
      await signOut();
      setOpen(false);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] pl-1.5 pr-2 text-slate-300 transition hover:border-emerald-400/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
      >
        <span className="grid size-6 place-items-center rounded-full border border-emerald-400/20 bg-emerald-400/10 text-[9px] font-semibold text-emerald-200">
          {initialsForName(user.name) || "P"}
        </span>
        <span className="hidden max-w-[7.5rem] truncate text-[11px] font-medium sm:inline">
          {displayPhone(user.phone)}
        </span>
        <span className="text-[10px] font-medium text-slate-500 sm:hidden">
          •{user.phone.slice(-4)}
        </span>
        <RoleBadge role={user.role} />
        <ChevronDown
          className={`size-3 text-slate-500 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-11 z-50 w-72 animate-pop overflow-hidden rounded-2xl border border-white/10 bg-surface/95 shadow-[0_30px_90px_-25px_rgba(0,0,0,0.95)] backdrop-blur-xl"
        >
          <div className="border-b border-white/6 px-4 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-white">
                {user.name}
              </p>
              <RoleBadge role={user.role} />
            </div>
            <p className="mt-1 text-xs font-medium text-slate-400">
              {displayPhone(user.phone)}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-600">
              Signed in · {roleLabel(user.role)}
            </p>
          </div>

          <div className="p-1.5">
            <MenuLink
              href="/profile"
              icon={<UserRound className="size-4" />}
              label="Profile & settings"
              onNavigate={() => setOpen(false)}
            />
            <MenuLink
              href="/my-bookings"
              icon={<Ticket className="size-4" />}
              label="My bookings"
              onNavigate={() => setOpen(false)}
            />

            {canUseOwnerDashboard && (
              <MenuLink
                href="/owner"
                icon={<LayoutDashboard className="size-4" />}
                label="Turf Owner Dashboard"
                hint="Owner console"
                accent
                onNavigate={() => setOpen(false)}
              />
            )}

            {canUseAdminDashboard && (
              <MenuLink
                href="/admin"
                icon={<ShieldEllipsis className="size-4" />}
                label="Super Admin Console"
                hint="Platform control"
                onNavigate={() => setOpen(false)}
              />
            )}
          </div>

          <div className="border-t border-white/6 p-1.5">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-400 transition hover:bg-rose-400/[0.06] hover:text-rose-200 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/60"
            >
              <LogOut className="size-4" />
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  label,
  hint,
  accent = false,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint?: string;
  accent?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 ${
        accent
          ? "border border-emerald-400/15 bg-emerald-400/[0.05] text-emerald-200 hover:bg-emerald-400/10"
          : "text-slate-300 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      <span className={accent ? "text-emerald-300" : "text-slate-500"}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {hint && (
        <span className="text-[9px] uppercase tracking-[0.1em] text-slate-600">
          {hint}
        </span>
      )}
    </Link>
  );
}
