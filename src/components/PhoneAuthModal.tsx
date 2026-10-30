"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  LockKeyhole,
  Phone,
  ShieldCheck,
  Smartphone,
  X,
} from "lucide-react";
import {
  DEMO_ACCOUNT_LIST,
  MOCK_OTP,
  MOCK_OTP_LENGTH,
  MockAuthError,
  normalizeMockPhone,
  requestMockOtp,
  signInWithMockOtp,
} from "@/lib/auth-mock";
import { displayPhone } from "@/lib/auth-types";
import type { SessionUser } from "@/lib/auth-types";

const RESEND_SECONDS = 30;

type Step = "phone" | "code";

export function PhoneAuthModal({
  open,
  onClose,
  onSuccess,
  next,
  title = "Sign in to CourtConnect",
  message,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: (user: SessionUser) => void;
  next?: string;
  title?: string;
  message?: string;
}) {
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  const phoneRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) {
      return;
    }

    setStep("phone");
    setPhone("");
    setCode("");
    setError(null);
    setSending(false);
    setVerifying(false);
    setResendIn(0);

    const timer = window.setTimeout(() => phoneRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !sending && !verifying) {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, sending, verifying]);

  useEffect(() => {
    if (resendIn <= 0) {
      return;
    }

    const timer = window.setTimeout(
      () => setResendIn((value) => Math.max(0, value - 1)),
      1000,
    );

    return () => window.clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    if (step === "code") {
      const timer = window.setTimeout(() => codeRef.current?.focus(), 80);
      return () => window.clearTimeout(timer);
    }
  }, [step]);

  function changeNumber() {
    setStep("phone");
    setCode("");
    setError(null);
    setResendIn(0);
    window.setTimeout(() => phoneRef.current?.focus(), 40);
  }

  async function requestCode() {
    if (sending || verifying) {
      return;
    }

    setError(null);

    const normalized = normalizeMockPhone(phone);

    if (!normalized) {
      setError("Enter any 10-digit mobile number.");
      phoneRef.current?.focus();
      return;
    }

    setSending(true);

    try {
      const receipt = await requestMockOtp(normalized);
      setPhone(receipt.phone);
      setCode("");
      setStep("code");
      setResendIn(RESEND_SECONDS);
    } catch (caught) {
      setError(
        caught instanceof MockAuthError
          ? caught.message
          : "Could not prepare your sign-in. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  async function verifyCode() {
    if (sending || verifying) {
      return;
    }

    setError(null);

    if (code.length !== MOCK_OTP_LENGTH) {
      setError(`Enter the ${MOCK_OTP_LENGTH}-digit test OTP.`);
      codeRef.current?.focus();
      return;
    }

    setVerifying(true);

    try {
      const user = await signInWithMockOtp(phone, code);
      onSuccess?.(user);
      onClose();
    } catch (caught) {
      setError(
        caught instanceof MockAuthError
          ? caught.message
          : "Phone verification failed. Please try again.",
      );
      setCode("");
      codeRef.current?.focus();
    } finally {
      setVerifying(false);
    }
  }

  function onCodeChange(value: string) {
    setCode(value.replace(/\D/g, "").slice(0, MOCK_OTP_LENGTH));
    setError(null);
  }

  if (!open) {
    return null;
  }

  const busy = sending || verifying;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center bg-oled/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md animate-pop overflow-hidden rounded-t-3xl border border-white/10 bg-surface shadow-[0_40px_120px_-30px_rgba(0,0,0,1)] sm:rounded-3xl"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-emerald-400/[0.08] blur-3xl" />

        <div className="relative flex items-start justify-between gap-3 border-b border-white/6 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h2
                id={titleId}
                className="text-sm font-semibold tracking-tight text-white"
              >
                {step === "phone"
                  ? title
                  : `Enter the ${MOCK_OTP_LENGTH}-digit test OTP`}
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">
                {step === "phone"
                  ? "Demo phone sign-in — no SMS is sent."
                  : `Demo code for ${displayPhone(phone)}.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="grid size-8 shrink-0 place-items-center rounded-full border border-white/8 bg-white/[0.03] text-slate-400 transition hover:text-white disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
            aria-label="Close sign-in"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="relative px-5 py-5">
          {message && step === "phone" && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.055] px-3 py-2.5 text-[11px] leading-relaxed text-cyan-100/90">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
              {message}
            </div>
          )}

          {step === "phone" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void requestCode();
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="phone-auth-phone"
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                >
                  Mobile number
                </label>
                <div className="mt-1.5 flex h-12 items-center rounded-2xl border border-white/10 bg-white/[0.03] pl-3 transition focus-within:border-emerald-400/50 focus-within:bg-white/[0.05]">
                  <Phone className="size-4 shrink-0 text-slate-500" />
                  <span className="ml-2 border-r border-white/10 pr-2 text-sm font-medium text-slate-400">
                    +91
                  </span>
                  <input
                    id="phone-auth-phone"
                    ref={phoneRef}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={phone}
                    onChange={(event) => {
                      setPhone(
                        event.target.value.replace(/\D/g, "").slice(0, 10),
                      );
                      setError(null);
                    }}
                    placeholder="98765 43210"
                    maxLength={10}
                    disabled={sending}
                    className="h-full min-w-0 flex-1 bg-transparent px-3 text-sm font-medium tracking-wide text-white outline-none placeholder:text-slate-600 disabled:opacity-60"
                  />
                </div>
                <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">
                  Any 10-digit number works in this demo. No SMS is sent.
                </p>
              </div>

              <div>
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Demo accounts
                </p>
                <div className="grid grid-cols-3 gap-1.5">
                  {DEMO_ACCOUNT_LIST.map((account) => (
                    <button
                      key={account.key}
                      type="button"
                      onClick={() => {
                        setPhone(account.phone);
                        setError(null);
                        phoneRef.current?.focus();
                      }}
                      className="rounded-xl border border-white/8 bg-white/[0.025] px-2 py-2 text-left transition hover:border-emerald-400/25 hover:bg-emerald-400/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/70"
                    >
                      <span className="block text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                        {account.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[10px] font-medium text-slate-300">
                        •{account.phone.slice(-4)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] px-3 py-2.5 text-[11px] leading-relaxed text-emerald-100/90">
                <Smartphone className="mt-0.5 size-3.5 shrink-0 text-emerald-300" />
                Use the shared test OTP{" "}
                <strong className="font-semibold text-emerald-200">
                  {MOCK_OTP}
                </strong>{" "}
                to verify any number.
              </div>

              {error && <ErrorNote message={error} />}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-semibold text-oled transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                {sending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Preparing demo code…
                  </>
                ) : (
                  <>
                    Send test OTP
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void verifyCode();
              }}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="phone-auth-code"
                  className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                >
                  Verification code
                </label>
                <input
                  id="phone-auth-code"
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => onCodeChange(event.target.value)}
                  placeholder="••••"
                  maxLength={MOCK_OTP_LENGTH}
                  disabled={verifying}
                  aria-invalid={Boolean(error)}
                  className="mt-1.5 h-14 w-full rounded-2xl border border-white/10 bg-white/[0.03] text-center text-2xl font-semibold tracking-[0.55em] text-white outline-none transition placeholder:text-slate-600 focus:border-emerald-400/50 focus:bg-white/[0.05] disabled:opacity-60"
                />
                <p className="mt-2 text-center text-[10px] text-slate-500">
                  Test OTP:{" "}
                  <span className="font-semibold tracking-[0.2em] text-emerald-300">
                    {MOCK_OTP}
                  </span>
                </p>
              </div>

              {error && <ErrorNote message={error} />}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-semibold text-oled transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                {verifying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Verifying…
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-4" />
                    Verify & sign in
                  </>
                )}
              </button>

              <div className="flex items-center justify-between gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={changeNumber}
                  disabled={busy}
                  className="font-medium text-slate-400 transition hover:text-white disabled:opacity-50"
                >
                  Change number
                </button>

                <button
                  type="button"
                  onClick={() => void requestCode()}
                  disabled={busy || resendIn > 0}
                  className="font-semibold text-emerald-300 transition hover:text-emerald-200 disabled:cursor-not-allowed disabled:text-slate-600"
                >
                  {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                </button>
              </div>
            </form>
          )}

          <p className="mt-5 border-t border-white/6 pt-3 text-center text-[9px] leading-relaxed text-slate-600">
            Demo authentication only. Replace the mock OTP provider with a real
            SMS service before going live. Your number is never shown publicly.
            {next ? " You will return to your original page after sign-in." : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2.5 text-[11px] leading-relaxed text-rose-100"
    >
      <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
      {message}
    </div>
  );
}
