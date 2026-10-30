import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 pb-28">
      <div className="w-full max-w-md rounded-3xl border border-white/8 bg-surface/80 p-7 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300">
          <Compass className="size-6" />
        </div>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
          404 · Off the pitch
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
          This page isn&apos;t on the map.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          The venue or booking you&apos;re looking for may have moved. Head back
          to discovery and pick a court.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-400 text-xs font-semibold text-oled transition hover:bg-emerald-300"
          >
            <Home className="size-3.5" />
            Home
          </Link>
          <Link
            href="/#venues"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] text-xs font-semibold text-slate-200 transition hover:border-emerald-400/25 hover:text-white"
          >
            <Compass className="size-3.5 text-emerald-400" />
            Explore venues
          </Link>
        </div>
      </div>
    </div>
  );
}
