import { AdminShell } from "@/components/admin/AdminShell";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const admin = await requireRole(["ADMIN"], "admin");

  return (
    <AdminShell
      adminName={admin.name}
      adminPhone={admin.phone}
      adminRole={admin.role}
    >
      {children}
    </AdminShell>
  );
}
