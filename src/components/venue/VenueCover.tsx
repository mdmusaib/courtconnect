import { MapPin, ShieldCheck } from "lucide-react";
import { getSportTheme } from "@/components/venue/SportVisual";

export function VenueCover({
  sport,
  name,
  city,
  className = "h-40",
  showCaption = true,
}: {
  sport: string | null | undefined;
  name: string;
  city: string;
  className?: string;
  showCaption?: boolean;
}) {
  const theme = getSportTheme(sport);
  const Icon = theme.icon;

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${theme.gradient} ${className}`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:34px_34px] opacity-60" />
      <div className="absolute -right-16 -top-20 size-64 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-10 -left-16 size-52 rounded-full bg-black/30 blur-2xl" />

      <div
        aria-hidden
        className="absolute -top-1/4 left-1/4 h-[150%] w-24 rotate-[24deg] bg-gradient-to-t from-transparent via-white/10 to-transparent"
      />
      <div
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-px bg-white/10"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 size-40 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/10"
      />

      <Icon
        aria-hidden
        className={`absolute -bottom-8 -right-3 size-56 ${theme.accent} opacity-20`}
        strokeWidth={0.75}
      />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 via-black/20 to-transparent" />

      <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/85 px-2.5 py-1 text-[10px] font-medium text-slate-800 backdrop-blur-md">
        <ShieldCheck className="size-3.5 text-primary" />
        Verified venue
      </div>

      {showCaption && (
        <div className="absolute inset-x-4 bottom-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-white/80">
            {theme.label}
          </p>
          <p className="mt-0.5 truncate text-lg font-semibold text-white">
            {name}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-white/85">
            <MapPin className="size-3" />
            {city}
          </p>
        </div>
      )}
    </div>
  );
}
