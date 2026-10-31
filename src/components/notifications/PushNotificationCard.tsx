import { BellOff, FlaskConical } from "lucide-react";

/**
 * Push notifications are intentionally disabled while Firebase is removed for
 * feature testing. In-app confirmations and passes still work normally.
 */
export function PushNotificationCard() {
  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/8 bg-white/[0.03] text-slate-400">
          <BellOff className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">Match-day alerts</p>
            <span className="rounded-full border border-white/8 bg-white/[0.03] px-2 py-0.5 text-[9px] uppercase tracking-wide text-slate-500">
              Disabled in test mode
            </span>
          </div>

          <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
            Firebase push delivery has been removed for this build. Booking
            confirmations, passes, and match details remain available in the app
            and work offline once cached.
          </p>

          <p className="mt-2 flex items-center gap-1.5 text-[10px] text-cyan-300/80">
            <FlaskConical className="size-3" />
            No phone verification or notification permission is required.
          </p>
        </div>
      </div>
    </section>
  );
}
