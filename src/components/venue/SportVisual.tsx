import {
  CircleDot,
  Dumbbell,
  Feather,
  Goal,
  type LucideIcon,
} from "lucide-react";

interface SportTheme {
  icon: LucideIcon;
  gradient: string;
  accent: string;
  chip: string;
  label: string;
}

const themes: Record<string, SportTheme> = {
  Football: {
    icon: Goal,
    gradient: "from-emerald-500 via-emerald-700 to-emerald-950",
    accent: "text-emerald-200",
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    label: "Football",
  },
  Cricket: {
    icon: CircleDot,
    gradient: "from-cyan-500 via-cyan-700 to-slate-950",
    accent: "text-cyan-200",
    chip: "border-cyan-200 bg-cyan-50 text-cyan-700",
    label: "Cricket",
  },
  Badminton: {
    icon: Feather,
    gradient: "from-fuchsia-500 via-purple-700 to-purple-950",
    accent: "text-fuchsia-200",
    chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    label: "Badminton",
  },
};

const fallback = themes.Football;

export function getSportTheme(sport: string | null | undefined): SportTheme {
  if (!sport) return fallback;
  return themes[sport] ?? fallback;
}

export function SportIcon({
  sport,
  className = "size-5",
}: {
  sport: string | null | undefined;
  className?: string;
}) {
  const theme = getSportTheme(sport);
  const Icon = theme.icon ?? Dumbbell;
  return <Icon className={className} />;
}
