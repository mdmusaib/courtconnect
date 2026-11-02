"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Plus, Ticket } from "lucide-react";

const items = [
  {
    href: "/",
    label: "Home",
    icon: House,
    isActive: (pathname: string) => pathname === "/",
  },
  {
    href: "/my-bookings",
    label: "Bookings",
    icon: Ticket,
    isActive: (pathname: string) => pathname.startsWith("/my-bookings"),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/checkout/") ||
    pathname.startsWith("/owner") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/booking/cancel/")
  ) {
    return null;
  }

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-white/90 shadow-nav backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-md grid-cols-[1fr_auto_1fr] items-center px-6 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        {items.slice(0, 1).map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={item.isActive(pathname)}
          />
        ))}

        <Link
          href="/#venues"
          prefetch={true}
          className="-mt-6 grid size-14 place-items-center rounded-2xl bg-primary text-white shadow-primary transition-all duration-100 active:scale-90 hover:bg-primary-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          aria-label="Find a venue"
        >
          <Plus className="size-7" strokeWidth={2.4} />
        </Link>

        {items.slice(1).map((item) => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            icon={item.icon}
            active={item.isActive(pathname)}
          />
        ))}
      </div>
    </nav>
  );
}

function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      prefetch={true}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 rounded-xl py-1 text-[10px] font-medium transition-all duration-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
        active ? "text-primary" : "text-slate-500 hover:text-slate-800"
      }`}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
      {label}
    </Link>
  );
}
