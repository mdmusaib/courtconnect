import type { UserRole } from "@/lib/auth-types";
import { roleLabel } from "@/lib/auth-types";

const STYLES: Record<UserRole, string> = {
  PLAYER: "border-emerald-200 bg-primary-soft text-emerald-700",
  OWNER: "border-amber-200 bg-amber-50 text-amber-700",
  ADMIN: "border-cyan-200 bg-cyan-50 text-cyan-700",
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
