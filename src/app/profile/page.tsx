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
        <section className="animate-fade-up overflow-hidden rounded-3xl border border-line bg-gradient-to-br from-white via-white to-primary-soft p-5 shadow-card sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid size-16 place-items-center rounded-2xl border border-emerald-200 bg-primary-soft text-xl font-semibold text-emerald-700">
                {initialsForName(user.name) || "P"}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-2xl font-semibold tracking-tight text-slate-900">
                    {user.name}
                  </h1>
                  <RoleBadge role={user.role} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                  <Phone className="size-3.5 text-emerald-600" />
                  {displayPhone(user.phone)}
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                  <BadgeCheck className="size-3 text-cyan-700" />
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
            className="group rounded-3xl border border-line bg-card p-5 transition hover:border-emerald-300"
          >
            <div className="flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-2xl border border-emerald-200 bg-primary-soft text-emerald-600">
                <Ticket className="size-4" />
              </span>
              <ArrowUpRight className="size-4 text-slate-400 transition group-hover:text-emerald-600" />
            </div>
            <h2 className="mt-4 text-sm font-semibold text-slate-900">
              My bookings
            </h2>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
              Upcoming passes, payment status, and past games.
            </p>
          </Link>

          {canUseOwnerDashboard ? (
            <Link
              href="/owner"
              className="group rounded-3xl border border-line bg-card p-5 transition hover:border-amber-300"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                  <LayoutDashboard className="size-4" />
                </span>
                <ArrowUpRight className="size-4 text-slate-400 transition group-hover:text-amber-600" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-900">
                Turf Owner Dashboard
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                Calendar, quick entry, direct bookings, and settlements.
              </p>
            </Link>
          ) : (
            <div className="rounded-3xl border border-line bg-card p-5">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-2xl border border-line bg-slate-900/[0.03] text-slate-500">
                  <LayoutDashboard className="size-4" />
                </span>
                <span className="text-[9px] uppercase tracking-[0.14em] text-slate-400">
                  Player
                </span>
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-600">
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
              className="group rounded-3xl border border-line bg-card p-5 transition hover:border-cyan-300 sm:col-span-2"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-700">
                  <ShieldEllipsis className="size-4" />
                </span>
                <ArrowUpRight className="size-4 text-slate-400 transition group-hover:text-cyan-600" />
              </div>
              <h2 className="mt-4 text-sm font-semibold text-slate-900">
                Super Admin Console
              </h2>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
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
    <div className="rounded-2xl border border-line bg-slate-900/[0.03] px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-slate-500">
        <span className="text-emerald-600">{icon}</span>
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-semibold text-slate-900">{value}</p>
    </div>
  );
}
