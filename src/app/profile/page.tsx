import Link from "next/link";
import {
  ArrowUpRight,
  BadgeCheck,
  LayoutDashboard,
  Mail,
  Phone,
  ShieldEllipsis,
  Ticket,
  UserRound,
} from "lucide-react";
import { RoleBadge } from "@/components/auth/RoleBadge";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { PageHeader } from "@/components/navigation/PageHeader";
import { PushNotificationCard } from "@/components/notifications/PushNotificationCard";
import {
  displayPhone,
  initialsForName,
  roleLabel,
} from "@/lib/auth-types";
import { requireSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const user = await requireSessionUser();
  const canUseOwnerDashboard = user.role === "OWNER" || user.role === "ADMIN";
  const canUseAdminDashboard = user.role === "ADMIN";

  return (
    <div className="min-h-dvh pb-28">
      <PageHeader
        backHref="/"
        backLabel="Home"
        title="Profile"
        subtitle="Phone, role, and account access"
      />

      <main className="mx-auto max-w-3xl px-4 pt-6">
        <section className="animate-fade-up overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-[#17243a] via-surface to-oled p-5 shadow-[0_30px_90px_-55px_rgba(0,0,0,1)] sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid size-16 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-xl font-semibold text-emerald-200">
                {initialsForName(user.name) || "P"}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-white">
                    {user.name}
                  </h1>
                  <RoleBadge role={user.role} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                  <Phone className="size-3.5 text-emerald-400" />
                  {displayPhone(user.phone)}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <BadgeCheck className="size-3 text-cyan-300" />
                  Demo role session · {roleLabel(user.role)}
                </p>
              </div>
            </div>

            <SignOutButton label="Sign out of this device" />
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-3">
            <Fact
              icon={<Mail className="size-3.5" />}
              label="Account ID"
              value={`${user.id.slice(0, 8)}…`}
            />
            <Fact
              icon={<UserRound className="size-3.5" />}
              label="Role"
              value={roleLabel(user.role)}
            />
            <Fact
              icon={<Phone className="size-3.5" />}
              label="Sign-in"
              value="Role switcher"
            />
          </div>
        </section>

        <section className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link
            href="/my-bookings"
            className="group rounded-3xl border border-white/8 bg-surface/70 p-5 transition hover:border-emerald-400/25"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.07] text-emerald-300">
                <Ticket className="size-4" />
              </span>
              <ArrowUpRight className="size-4 text-slate-600 transition group-hover:text-emerald-300" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-white">
              My bookings
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
              Upcoming passes, payment status, and past games.
            </p>
          </Link>

          {canUseOwnerDashboard ? (
            <Link
              href="/owner"
              className="group rounded-3xl border border-white/8 bg-surface/70 p-5 transition hover:border-amber-400/25"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-2xl border border-amber-400/15 bg-amber-400/[0.07] text-amber-300">
                  <LayoutDashboard className="size-4" />
                </span>
                <ArrowUpRight className="size-4 text-slate-600 transition group-hover:text-amber-300" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-white">
                Turf Owner Dashboard
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Calendar, quick entry, direct bookings, and settlements.
              </p>
            </Link>
          ) : (
            <div className="rounded-3xl border border-white/8 bg-surface/40 p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-2xl border border-white/8 bg-white/[0.03] text-slate-500">
                  <LayoutDashboard className="size-4" />
                </span>
                <span className="text-[9px] uppercase tracking-[0.14em] text-slate-600">
                  Player
                </span>
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-300">
                Owner tools
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Owner access is granted from the platform admin console after
                venue verification.
              </p>
            </div>
          )}

          {canUseAdminDashboard && (
            <Link
              href="/admin"
              className="group rounded-3xl border border-white/8 bg-surface/70 p-5 transition hover:border-cyan-400/25 sm:col-span-2"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.07] text-cyan-300">
                  <ShieldEllipsis className="size-4" />
                </span>
                <ArrowUpRight className="size-4 text-slate-600 transition group-hover:text-cyan-300" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-white">
                Super Admin Console
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                Verify venues, audit revenue, process refunds, and resolve
                disputes.
              </p>
            </Link>
          )}
        </section>

        <PushNotificationCard />
      </main>
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/[0.025] px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-slate-500">
        <span className="text-emerald-400">{icon}</span>
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-white">{value}</p>
    </div>
  );
}
