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
        className="h-9 w-24 animate-pulse rounded-full border border-line bg-slate-900/[0.03]"
      />
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openLogin()}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-emerald-200 bg-primary-soft px-3 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
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
        className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white pl-1.5 pr-2 text-slate-600 transition hover:border-emerald-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <span className="grid size-6 place-items-center rounded-full border border-emerald-200 bg-primary-soft text-[9px] font-semibold text-emerald-700">
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
          className="absolute right-0 top-11 z-50 w-72 animate-pop overflow-hidden rounded-2xl border border-line bg-card/95 shadow-lift backdrop-blur-xl"
        >
          <div className="border-b border-line px-4 py-3.5">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-slate-900">
                {user.name}
              </p>
              <RoleBadge role={user.role} />
            </div>
            <p className="mt-1 text-xs font-medium text-slate-500">
              {displayPhone(user.phone)}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-400">
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

          <div className="border-t border-line p-1.5">
            <button
              type="button"
              onClick={() => void handleSignOut()}
              disabled={signingOut}
              role="menuitem"
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50"
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
      className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        accent
          ? "border border-emerald-200 bg-primary-soft text-emerald-700 hover:bg-emerald-100/70"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <span className={accent ? "text-emerald-600" : "text-slate-500"}>
        {icon}
      </span>
      <span className="flex-1">{label}</span>
      {hint && (
        <span className="text-[9px] uppercase tracking-[0.1em] text-slate-400">
          {hint}
        </span>
      )}
    </Link>
  );
}
