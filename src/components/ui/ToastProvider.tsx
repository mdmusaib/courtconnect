"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "info";

interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
}

interface ToastItem extends Required<Omit<ToastInput, "description">> {
  id: number;
  description?: string;
}

interface ToastContextValue {
  toast: (input: ToastInput | string) => void;
  dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_STYLES: Record<
  ToastVariant,
  { icon: typeof CheckCircle2; accent: string; ring: string }
> = {
  success: {
    icon: CheckCircle2,
    accent: "text-emerald-600",
    ring: "border-emerald-200 bg-emerald-50",
  },
  error: {
    icon: AlertCircle,
    accent: "text-rose-600",
    ring: "border-rose-200 bg-rose-50",
  },
  info: {
    icon: Info,
    accent: "text-cyan-700",
    ring: "border-cyan-200 bg-cyan-50",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismissToast = useCallback((id: number) => {
    const timer = timers.current.get(id);

    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }

    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput | string) => {
      const normalized: ToastInput =
        typeof input === "string" ? { title: input } : input;
      const id = nextId.current++;
      const item: ToastItem = {
        id,
        title: normalized.title,
        description: normalized.description,
        variant: normalized.variant ?? "info",
        durationMs: normalized.durationMs ?? 5200,
      };

      setItems((current) => [...current.slice(-3), item]);

      const timer = setTimeout(() => {
        timers.current.delete(id);
        setItems((current) => current.filter((entry) => entry.id !== id));
      }, item.durationMs);

      timers.current.set(id, timer);
      return id;
    },
    [],
  );

  const value = useMemo(
    () => ({ toast, dismissToast }),
    [toast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex flex-col items-center gap-2 px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:items-end sm:pr-5"
      >
        {items.map((item) => {
          const style = VARIANT_STYLES[item.variant];
          const Icon = style.icon;

          return (
            <div
              key={item.id}
              role={item.variant === "error" ? "alert" : "status"}
              className={`pointer-events-auto flex w-full max-w-sm animate-pop items-start gap-3 rounded-2xl border bg-card p-3.5 shadow-lift backdrop-blur-xl ${style.ring}`}
            >
              <Icon className={`mt-0.5 size-4 shrink-0 ${style.accent}`} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold leading-snug text-slate-900">
                  {item.title}
                </p>
                {item.description && (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
                    {item.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(item.id)}
                className="-mr-1 -mt-1 grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                aria-label="Dismiss notification"
              >
                <X className="size-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider.");
  }

  return context;
}
