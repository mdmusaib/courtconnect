"use client";

import { LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

export function SignOutButton({
  className = "",
  label = "Sign out",
}: {
  className?: string;
  label?: string;
}) {
  const { signOut } = useAuth();
  const [working, setWorking] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        if (working) return;
        setWorking(true);

        try {
          await signOut();
        } finally {
          setWorking(false);
        }
      }}
      disabled={working}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-white px-3 py-2.5 text-xs font-medium text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/50 ${className}`}
    >
      <LogOut className="size-3.5" />
      {working ? "Signing out…" : label}
    </button>
  );
}
