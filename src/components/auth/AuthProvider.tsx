"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { PhoneAuthModal } from "@/components/PhoneAuthModal";
import { useToast } from "@/components/ui/ToastProvider";
import { signOutMockClient } from "@/lib/auth-mock";
import type { SessionUser } from "@/lib/auth-types";
import { displayPhone } from "@/lib/auth-types";

interface LoginOptions {
  next?: string;
  title?: string;
  message?: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<SessionUser | null>;
  signOut: () => Promise<void>;
  openLogin: (options?: LoginOptions) => void;
  closeLogin: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function safeNext(value: string | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginOptions, setLoginOptions] = useState<LoginOptions | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async (): Promise<SessionUser | null> => {
    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        user?: SessionUser | null;
      };
      const nextUser = response.ok ? (payload.user ?? null) : null;

      if (mounted.current) {
        setUser(nextUser);
      }

      return nextUser;
    } catch {
      if (mounted.current) {
        setUser(null);
      }

      return null;
    } finally {
      if (mounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openLogin = useCallback((options?: LoginOptions) => {
    setLoginOptions(options ?? {});
  }, []);

  const closeLogin = useCallback(() => {
    setLoginOptions(null);
  }, []);

  const handleSuccess = useCallback(
    (signedInUser: SessionUser) => {
      setUser(signedInUser);
      toast({
        title: `Signed in as ${displayPhone(signedInUser.phone)}`,
        description:
          signedInUser.role === "ADMIN"
            ? "Platform admin console unlocked."
            : signedInUser.role === "OWNER"
              ? "Turf owner dashboard unlocked."
              : "Your bookings and passes are ready.",
        variant: "success",
      });

      const destination = safeNext(loginOptions?.next);
      setLoginOptions(null);
      router.refresh();

      if (destination) {
        router.push(destination);
      }
    },
    [loginOptions?.next, router, toast],
  );

  const signOut = useCallback(async () => {
    await signOutMockClient();
    setUser(null);
    toast({
      title: "Signed out",
      description: "Your session cookie has been cleared from this device.",
      variant: "success",
    });

    const pathname = window.location.pathname;

    if (
      pathname === "/owner" ||
      pathname.startsWith("/owner/") ||
      pathname === "/admin" ||
      pathname.startsWith("/admin/") ||
      pathname === "/checkout" ||
      pathname.startsWith("/checkout/") ||
      pathname === "/my-bookings" ||
      pathname === "/profile"
    ) {
      router.replace("/");
    } else {
      router.refresh();
    }
  }, [router, toast]);

  const value = useMemo(
    () => ({ user, loading, refresh, signOut, openLogin, closeLogin }),
    [user, loading, refresh, signOut, openLogin, closeLogin],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}

      <PhoneAuthModal
        open={Boolean(loginOptions)}
        onClose={closeLogin}
        onSuccess={handleSuccess}
        next={loginOptions?.next}
        title={loginOptions?.title}
        message={loginOptions?.message}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }

  return context;
}
