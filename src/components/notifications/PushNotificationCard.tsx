"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Loader2,
  Smartphone,
} from "lucide-react";
import {
  isClientPushConfigured,
  registerWebPush,
  subscribeToForegroundPush,
  unregisterWebPush,
} from "@/lib/firebase-client";

const STORAGE_KEY = "courtconnect:push-enabled";

export function PushNotificationCard() {
  const [configured, setConfigured] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foregroundMessage, setForegroundMessage] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const isConfigured = isClientPushConfigured();
    setConfigured(isConfigured);

    if (typeof Notification !== "undefined") {
      setPermission(Notification.permission);
      setEnabled(
        Notification.permission === "granted" &&
          window.localStorage.getItem(STORAGE_KEY) === "1",
      );
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    subscribeToForegroundPush((payload) => {
      const title = payload.notification?.title ?? "CourtConnect alert";
      const body = payload.notification?.body ?? "You have a new update.";
      setForegroundMessage(`${title}: ${body}`);
    })
      .then((cleanup) => {
        if (cancelled) {
          cleanup?.();
        } else {
          unsubscribe = cleanup;
        }
      })
      .catch(() => {
        // Foreground listeners are optional.
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [configured]);

  useEffect(() => {
    if (!foregroundMessage) {
      return;
    }

    const timer = window.setTimeout(() => setForegroundMessage(null), 6000);
    return () => window.clearTimeout(timer);
  }, [foregroundMessage]);

  async function enable() {
    setBusy(true);
    setError(null);

    try {
      const result = await registerWebPush();
      setPermission(result.permission);
      setEnabled(true);
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch (enableError) {
      setError(
        enableError instanceof Error
          ? enableError.message
          : "Could not enable push notifications.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setError(null);

    try {
      await unregisterWebPush();
      setEnabled(false);
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (disableError) {
      setError(
        disableError instanceof Error
          ? disableError.message
          : "Could not disable push notifications.",
      );
    } finally {
      setBusy(false);
    }
  }

  const blocked = permission === "denied";

  return (
    <section
      className={`mt-4 overflow-hidden rounded-2xl border p-4 ${
        enabled
          ? "border-emerald-400/15 bg-emerald-400/[0.045]"
          : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl border ${
            enabled
              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
              : "border-white/8 bg-white/[0.03] text-slate-400"
          }`}
        >
          {enabled ? <Bell className="size-4" /> : <BellOff className="size-4" />}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">Match-day alerts</p>
            {enabled ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-300">
                <CheckCircle2 className="size-2.5" />
                On for this device
              </span>
            ) : (
              <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[9px] uppercase tracking-wide text-slate-500">
                Off
              </span>
            )}
          </div>

          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            {!configured
              ? "Add the Firebase web push environment variables to enable instant booking confirmations and match-day reminders."
              : blocked
                ? "Notifications are blocked in this browser. Allow them in your browser settings, then try again."
                : enabled
                  ? "Booking confirmations and reminders for your upcoming games will arrive on this device."
                  : "Get a push when a booking is confirmed and a reminder before your match starts."}
          </p>

          {foregroundMessage && (
            <div className="mt-2 rounded-lg border border-cyan-400/20 bg-cyan-400/[0.06] px-2.5 py-2 text-[10px] text-cyan-200">
              {foregroundMessage}
            </div>
          )}

          {error && (
            <div className="mt-2 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-2.5 py-2 text-[10px] text-rose-200">
              {error}
            </div>
          )}

          {configured && !blocked && (
            <button
              type="button"
              onClick={enabled ? disable : enable}
              disabled={busy}
              className={`mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70 disabled:opacity-60 ${
                enabled
                  ? "border border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/20 hover:text-white"
                  : "bg-emerald-400 text-oled hover:bg-emerald-300"
              }`}
            >
              {busy ? (
                <Loader2 className="size-3 animate-spin" />
              ) : enabled ? (
                <BellOff className="size-3" />
              ) : (
                <Smartphone className="size-3" />
              )}
              {busy ? "Updating…" : enabled ? "Turn off alerts" : "Enable alerts"}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
