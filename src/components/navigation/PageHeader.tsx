import Link from "next/link";
import { ChevronLeft, MapPin, Ticket } from "lucide-react";
import { AuthMenu } from "@/components/auth/AuthMenu";
import { DevRoleSwitcher } from "@/components/auth/DevRoleSwitcher";
import { Logo } from "@/components/brand/Logo";

export function BrandHeader({
  location = "Melvisharam",
}: {
  location?: string;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-oled/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <Logo />
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-slate-300 sm:inline-flex">
            <MapPin className="size-3.5 text-emerald-400" />
            {location}
          </span>
          <Link
            href="/my-bookings"
            prefetch={true}
            className="hidden size-9 place-items-center rounded-full border border-white/8 bg-white/[0.03] text-slate-300 transition hover:border-emerald-400/30 hover:text-emerald-300 sm:grid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
            aria-label="My bookings"
          >
            <Ticket className="size-4" />
          </Link>
          <DevRoleSwitcher />
          <AuthMenu />
        </div>
      </div>
    </header>
  );
}

export function PageHeader({
  backHref,
  backLabel = "Back",
  title,
  subtitle,
  right,
}: {
  backHref?: string;
  backLabel?: string;
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-oled/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        {backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.03] py-1.5 pl-1.5 pr-3 text-xs font-medium text-slate-300 transition hover:border-emerald-400/30 hover:text-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
          >
            <ChevronLeft className="size-4" />
            {backLabel}
          </Link>
        ) : (
          <Logo />
        )}

        <div className="min-w-0 flex-1">
          {title && (
            <h1 className="truncate text-sm font-semibold text-white">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="truncate text-[11px] text-slate-400">{subtitle}</p>
          )}
        </div>

        {right}
      </div>
    </header>
  );
}
