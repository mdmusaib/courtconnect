export const USER_ROLES = ["PLAYER", "OWNER", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface SessionUser {
  id: string;
  firebaseUid: string | null;
  name: string;
  phone: string;
  role: UserRole;
}

export function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === "string" &&
    (USER_ROLES as readonly string[]).includes(value)
  );
}

export function displayPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  return phone.startsWith("+") ? phone : `+${digits}`;
}

export function initialsForName(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function roleLabel(role: UserRole): string {
  if (role === "OWNER") return "Turf owner";
  if (role === "ADMIN") return "Platform admin";
  return "Player";
}
