import { OwnerShell } from "@/components/owner/OwnerShell";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const owner = await requireRole(["OWNER", "ADMIN"], "owner");

  return (
    <OwnerShell
      ownerName={owner.name}
      ownerPhone={owner.phone}
      ownerRole={owner.role}
    >
      {children}
    </OwnerShell>
  );
}
