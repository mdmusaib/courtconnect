"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  ImageIcon,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  UploadCloud,
  Wallet,
  Zap,
} from "lucide-react";
import { SportIcon } from "@/components/venue/SportVisual";
import { formatINR } from "@/lib/format";
import type { CheckoutBookingData } from "@/lib/types";

type UploadState = "idle" | "uploading" | "success" | "error";

interface ReceiptVerification {
  model?: string | null;
  status?: string | null;
  utr?: string | null;
  amount?: number | null;
  app?: string | null;
  payee?: string | null;
  confidence?: number | null;
  transactionDate?: string | null;
  verifiedAt?: string | null;
}

interface VerifyReceiptResponse {
  success?: boolean;
  alreadyConfirmed?: boolean;
  error?: string;
  expectedAmount?: number;
  detectedAmount?: number;
  booking?: { id: string; status: string; utrNumber: string | null };
  verification?: ReceiptVerification | null;
}

const MAX_RECEIPT_BYTES = 10 * 1024 * 1024;

export function CheckoutPanel({
  booking,
  upiId,
  serverNow,
}: {
  booking: CheckoutBookingData;
  upiId: string;
  serverNow: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(() => new Date(serverNow).getTime());
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const unlockPayload = {
        bookingId: booking.id,
        userId: booking.userId,
        courtId: booking.court.id,
        slotStart: booking.slotStart,
        slotEnd: booking.slotEnd,
      };
      // Use sendBeacon for instant unlock on tab close/navigation (fire and forget)
      navigator.sendBeacon("/api/bookings/unlock", JSON.stringify(unlockPayload));
      // Also try fetch with keepalive as fallback
      fetch("/api/bookings/unlock", {
        method: "POST",
        keepalive: true,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(unlockPayload),
      });
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [booking.id, booking.userId]);

  const expiresAt = new Date(booking.createdAt).getTime() + 1 * 60 * 1000;
  const remainingSeconds = Math.max(
    0,
    Math.floor((expiresAt - now) / 1000),
  );
  const holdExpired = remainingSeconds === 0;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const countdown = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const courtRate = booking.ownerPayout;
  const convenienceFee = booking.convenienceFee;
  const totalPayable = courtRate + convenienceFee;
  const isTestCourt =
    booking.court.name.includes("Test Court") || booking.court.price <= 1;

  const upiParams = new URLSearchParams({
    pa: upiId,
    pn: "CourtConnect",
    am: totalPayable.toFixed(2),
    cu: "INR",
    tn: `CourtConnect ${booking.id.slice(0, 8)}`,
  });
  const upiUrl = `upi://pay?${upiParams.toString()}`;
  const gpayUrl = `${upiUrl}&package=com.google.android.apps.nbu.paisa.user`;
  const phonepeUrl = `${upiUrl}&package=com.phonepe.app`;

  async function submitReceipt(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Upload a screenshot image (JPEG, PNG, WebP, HEIC, or HEIF).");
      setUploadState("error");
      return;
    }

    if (file.size > MAX_RECEIPT_BYTES) {
      setError("That screenshot is larger than 10 MB. Please upload a smaller file.");
      setUploadState("error");
      return;
    }

    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    setUploadState("uploading");
    setError(null);

    const body = new FormData();
    body.append("bookingId", booking.id);
    body.append("receipt", file);

    try {
      const response = await fetch("/api/payments/verify-receipt", {
        method: "POST",
        body,
      });
      const payload = (await response.json()) as VerifyReceiptResponse;

      if (!response.ok) {
        const amountHint =
          payload.expectedAmount !== undefined &&
          payload.detectedAmount !== undefined
            ? ` Expected ${formatINR(payload.expectedAmount)}, found ${formatINR(payload.detectedAmount)}.`
            : "";

        setError(
          `${payload.error ?? "We could not verify that receipt."}${amountHint}`,
        );
        setUploadState("error");
        return;
      }

      if (payload.verification) {
        console.info("[CourtConnect] Gemini payment verification", {
          status: payload.verification.status,
          utr: payload.verification.utr,
          amount: payload.verification.amount,
          app: payload.verification.app,
          payee: payload.verification.payee,
          model: payload.verification.model,
          confidence: payload.verification.confidence,
          verifiedAt: payload.verification.verifiedAt,
          bookingId: booking.id,
        });
      } else {
        console.info("[CourtConnect] Booking already verified", {
          status: payload.booking?.status,
          utr: payload.booking?.utrNumber,
          bookingId: booking.id,
        });
      }

      setUploadState("success");
      window.setTimeout(() => {
        router.push(`/booking/success/${booking.id}`);
      }, 700);
    } catch {
      setError("Network error while uploading the receipt. Please retry.");
      setUploadState("error");
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (file) {
      void submitReceipt(file);
    }
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];

    if (file) {
      void submitReceipt(file);
    }
  }

  return (
    <div className="animate-fade-up">
      <div className="mb-5 flex flex-wrap items-center gap-2 text-[10px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.07] px-2.5 py-1 text-emerald-300">
          <Check className="size-3" />
          Slot selected
        </span>
        <span className="text-slate-700">/</span>
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 ${
          holdExpired
            ? "border-rose-400/20 bg-rose-400/10 text-rose-300"
            : "border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-200"
        }`}
        >
          <Clock3 className="size-3" />
          {holdExpired ? "Hold expired" : `Pay within ${countdown}`}
        </span>
        <span className="text-slate-700">/</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[0.025] px-2.5 py-1 text-slate-400">
          <ShieldCheck className="size-3" />
          AI check
        </span>
      </div>

      {isTestCourt && (
        <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-3.5 text-[11px] leading-relaxed text-amber-100">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-amber-300" />
          <p>
            <span className="font-semibold">₹1 mobile test court.</span> Pay
            exactly {formatINR(totalPayable)} ({formatINR(courtRate)} court rate
            + {formatINR(convenienceFee)} fee) using the UPI buttons below. After
            uploading the GPay/PhonePe screenshot, Gemini&apos;s extracted UTR,
            amount, and status appear in the browser console and on your success
            pass.
          </p>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <section className="rounded-3xl border border-white/8 bg-surface/80 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Pay with UPI
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight text-white">
                  {formatINR(totalPayable)}
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Use GPay, PhonePe, or any UPI app.
                </p>
              </div>
              <div className="grid size-11 place-items-center rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.08] text-emerald-300">
                <Smartphone className="size-5" />
              </div>
            </div>

            <a
              href={upiUrl}
              className="mt-5 flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 text-sm font-semibold text-oled transition-all duration-100 active:scale-95 ease-out hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              <Zap className="size-4" />
              Open UPI app
              <ArrowRight className="size-4" />
            </a>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <a
                href={gpayUrl}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.025] text-[11px] font-semibold text-slate-300 transition-all duration-100 active:scale-95 ease-out hover:border-emerald-400/25 hover:text-white"
              >
                <span className="size-2 rounded-full bg-sky-400" />
                Google Pay
              </a>
              <a
                href={phonepeUrl}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl border border-white/8 bg-white/[0.025] text-[11px] font-semibold text-slate-300 transition-all duration-100 active:scale-95 ease-out hover:border-emerald-400/25 hover:text-white"
              >
                <span className="size-2 rounded-full bg-violet-400" />
                PhonePe
              </a>
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-slate-500">
              <Wallet className="mt-0.5 size-3.5 shrink-0 text-slate-500" />
              UPI links work best on mobile. Pay exactly {formatINR(totalPayable)} so
              the receipt matches automatically.
            </p>
          </section>

          <section className="rounded-3xl border border-white/8 bg-surface/80 p-5">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-cyan-400/15 bg-cyan-400/[0.07] text-cyan-300">
                <UploadCloud className="size-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  Upload payment screenshot
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Drop the GPay or PhonePe confirmation screen. We extract the
                  amount and 12-digit UTR instantly.
                </p>
              </div>
            </div>

            <div
              onDragOver={(event) => event.preventDefault()}
              onDrop={handleDrop}
              className={`relative mt-4 overflow-hidden rounded-2xl border border-dashed transition ${
                uploadState === "error"
                  ? "border-rose-400/30 bg-rose-400/[0.035]"
                  : uploadState === "success"
                    ? "border-emerald-400/30 bg-emerald-400/[0.035]"
                    : "border-white/12 bg-white/[0.018] hover:border-cyan-400/30 hover:bg-cyan-400/[0.025]"
              }`}
            >
              <input
                ref={fileInputRef}
                id="receipt-upload"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handleFileChange}
                className="sr-only"
              />

              {previewUrl ? (
                <div className="relative h-52 w-full">
                  <Image
                    src={previewUrl}
                    alt="Uploaded payment receipt preview"
                    fill
                    unoptimized
                    className="object-contain p-3"
                  />
                  {uploadState === "uploading" && (
                    <div className="absolute inset-0 grid place-items-center bg-oled/65 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="size-6 animate-spin text-emerald-400" />
                        <p className="text-[11px] font-medium text-white">
                          Reading payment details...
                        </p>
                        <p className="text-[10px] text-slate-400">
                          Gemini is verifying amount + UTR
                        </p>
                      </div>
                    </div>
                  )}
                  {uploadState === "success" && (
                    <div className="absolute inset-0 grid place-items-center bg-emerald-950/60 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2">
                        <CheckCircle2 className="size-8 text-emerald-400" />
                        <p className="text-xs font-semibold text-emerald-200">
                          Payment verified
                        </p>
                        <p className="text-[10px] text-emerald-200/70">
                          Opening your digital pass...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <label
                  htmlFor="receipt-upload"
                  className="flex cursor-pointer flex-col items-center px-5 py-9 text-center"
                >
                  <div className="grid size-12 place-items-center rounded-2xl border border-white/8 bg-surface text-slate-300">
                    <ImageIcon className="size-5" />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-white">
                    Tap to upload, or drop a screenshot
                  </p>
                  <p className="mt-1 text-[10px] text-slate-500">
                    PNG, JPG, WebP, HEIC · up to 10 MB · auto-verifies
                  </p>
                </label>
              )}
            </div>

            {error && (
              <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-3 py-2.5 text-[11px] leading-relaxed text-rose-200">
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
                <span className="flex-1">{error}</span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setUploadState("idle");
                    setPreviewUrl(null);
                    fileInputRef.current?.click();
                  }}
                  className="shrink-0 font-semibold text-rose-100 underline-offset-2 hover:underline"
                >
                  Retry
                </button>
              </div>
            )}

            {uploadState === "idle" && !error && (
              <p className="mt-3 flex items-center gap-1.5 text-[10px] text-slate-500">
                <LockKeyhole className="size-3 text-emerald-400" />
                Your screenshot is read by Gemini and never shown publicly.
              </p>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-3xl border border-white/8 bg-surface/85 p-5 shadow-[0_24px_70px_-45px_rgba(0,0,0,0.95)]">
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/8 bg-white/[0.03]">
                <SportIcon
                  sport={booking.court.sportType}
                  className="size-5 text-emerald-300"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">
                  {booking.court.venue.name}
                </p>
                <p className="truncate text-[11px] text-slate-400">
                  {booking.court.name}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/6 bg-white/[0.02] p-3.5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">
                {booking.dateLabel}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-white">
                <Clock3 className="size-3.5 text-emerald-400" />
                {booking.timeLabel}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                Booking ID ·{" "}
                <span className="font-mono text-slate-400">
                  {booking.id.slice(0, 8).toUpperCase()}
                </span>
              </p>
            </div>

            <div className="mt-5 space-y-3 border-t border-white/8 pt-4 text-xs">
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Court Rate</span>
                <span className="font-medium text-slate-200">
                  {formatINR(courtRate)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-slate-400">Convenience Fee</span>
                <span className="font-medium text-slate-200">
                  {formatINR(convenienceFee)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 border-t border-white/8 pt-3">
                <span className="text-sm font-semibold text-white">Total</span>
                <span className="text-xl font-semibold tracking-tight text-emerald-400">
                  {formatINR(totalPayable)}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-emerald-400/12 bg-emerald-400/[0.045] px-3 py-2.5 text-[10px] leading-relaxed text-emerald-200/70">
              Court rate + {formatINR(convenienceFee)} platform fee. The venue
              receives 100% of the court rate.
            </div>
          </section>

          <section className="rounded-3xl border border-cyan-400/12 bg-cyan-400/[0.035] p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-cyan-300">
              <Clock3 className="size-3.5" />
              {holdExpired ? "Hold expired" : `Slot held for ${countdown}`}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
              {holdExpired
                ? "Your 1-minute hold has ended. The slot may have returned to the public pool. Try uploading anyway, or pick another slot."
                : "The slot is reserved for you while you pay. If the timer runs out, the hold releases automatically."}
            </p>
            {holdExpired && (
              <Link
                href={`/venue/${booking.court.venue.id}/book?courtId=${booking.court.id}`}
                prefetch={true}
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
              >
                Pick another slot
                <ArrowRight className="size-3" />
              </Link>
            )}
          </section>

          <section className="rounded-3xl border border-white/8 bg-surface/60 p-4">
            <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              Safe by design
            </p>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-relaxed text-slate-400">
              <li>• UTR is checked against the booking amount.</li>
              <li>• One UTR can only confirm one booking.</li>
              <li>• Your pass appears instantly after verification.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}
