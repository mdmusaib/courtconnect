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
    gradient:
      "from-emerald-500/30 via-emerald-900/25 to-[#0b0f17]",
    accent: "text-emerald-300",
    chip: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    label: "Football",
  },
  Cricket: {
    icon: CircleDot,
    gradient: "from-cyan-500/30 via-cyan-900/25 to-[#0b0f17]",
    accent: "text-cyan-300",
    chip: "border-cyan-400/20 bg-cyan-400/10 text-cyan-300",
    label: "Cricket",
  },
  Badminton: {
    icon: Feather,
    gradient: "from-fuchsia-500/25 via-purple-900/25 to-[#0b0f17]",
    accent: "text-fuchsia-300",
    chip: "border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-300",
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
