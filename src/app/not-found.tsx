import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-4 pb-28">
      <div className="w-full max-w-md rounded-3xl border border-line bg-card p-7 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl border border-emerald-200 bg-primary-soft text-emerald-600">
          <Compass className="size-6" />
        </div>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
          404 · Off the pitch
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          This page isn&apos;t on the map.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          The venue or booking you&apos;re looking for may have moved. Head back
          to discovery and pick a court.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link
            href="/"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary text-xs font-semibold text-white shadow-primary transition hover:bg-primary-deep"
          >
            <Home className="size-3.5" />
            Home
          </Link>
          <Link
            href="/#venues"
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-line bg-white text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-slate-900"
          >
            <Compass className="size-3.5 text-emerald-600" />
            Explore venues
          </Link>
        </div>
      </div>
    </div>
  );
}
