import type { UserRole } from "@/lib/auth-types";
import { roleLabel } from "@/lib/auth-types";

const STYLES: Record<UserRole, string> = {
  PLAYER: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-200",
  OWNER: "border-amber-400/20 bg-amber-400/[0.08] text-amber-200",
  ADMIN: "border-cyan-400/20 bg-cyan-400/[0.08] text-cyan-200",
};

export function RoleBadge({
  role,
  className = "",
}: {
  role: UserRole;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${STYLES[role]} ${className}`}
    >
      {roleLabel(role)}
    </span>
  );
}
