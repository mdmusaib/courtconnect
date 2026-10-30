"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

const MESSAGES: Record<string, { title: string; description: string }> = {
  owner: {
    title: "Turf owner access required",
    description:
      "Only turf owner and platform admin accounts can open the owner dashboard.",
  },
  admin: {
    title: "Platform admin access required",
    description:
      "Only platform admin accounts can open the super admin console.",
  },
  checkout: {
    title: "Sign in to continue",
    description: "Your slot can only be held for a signed-in player.",
  },
  player: {
    title: "Sign in required",
    description: "Sign in with your phone number to view your bookings.",
  },
};

/**
 * Converts a middleware redirect (?auth=forbidden&area=admin) into a clean
 * toast, then removes the one-time query parameters from the URL.
 */
export function AuthNotice() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const shown = useRef(false);
  const auth = searchParams.get("auth");
  const area = searchParams.get("area") ?? "";

  useEffect(() => {
    if (auth !== "forbidden" || shown.current) {
      return;
    }

    shown.current = true;
    const message = MESSAGES[area] ?? MESSAGES.admin;

    toast({
      title: message.title,
      description: message.description,
      variant: "error",
    });

    const next = new URLSearchParams(searchParams.toString());
    next.delete("auth");
    next.delete("area");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false,
    });
  }, [auth, area, pathname, router, searchParams, toast]);

  return null;
}
