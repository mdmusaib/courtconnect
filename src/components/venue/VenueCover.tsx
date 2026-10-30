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
      <div className="pitch-grid absolute inset-0 opacity-60" />
      <div className="absolute -right-16 -top-20 size-64 rounded-full bg-white/[0.045] blur-2xl" />
      <div className="absolute -bottom-10 -left-16 size-52 rounded-full bg-black/20 blur-2xl" />
      <Icon
        aria-hidden
        className={`absolute -bottom-8 -right-3 size-56 ${theme.accent} opacity-[0.13]`}
        strokeWidth={0.75}
      />
      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-oled/95 via-oled/50 to-transparent" />

      <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-oled/45 px-2.5 py-1 text-[10px] font-medium text-slate-200 backdrop-blur-md">
        <ShieldCheck className="size-3.5 text-emerald-400" />
        Verified venue
      </div>

      {showCaption && (
        <div className="absolute inset-x-4 bottom-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300/80">
            {theme.label}
          </p>
          <p className="mt-0.5 truncate text-lg font-semibold text-white">
            {name}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-300">
            <MapPin className="size-3" />
            {city}
          </p>
        </div>
      )}
    </div>
  );
}
