import {
  Banknote,
  Globe2,
  Phone,
  QrCode,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { BookingStatusValue, PaymentModeValue } from "@/lib/types";

export interface BookingSourceTheme {
  label: string;
  icon: LucideIcon;
  pillClass: string;
  dotClass: string;
  iconClass: string;
  blockClass: string;
}

export function getBookingSourceTheme(
  status: BookingStatusValue,
  paymentMode: PaymentModeValue,
): BookingSourceTheme {
  if (status === "MAINTENANCE") {
    return {
      label: "Maintenance",
      icon: Wrench,
      pillClass: "border-rose-400/25 bg-rose-400/10 text-rose-200",
      dotClass: "bg-rose-400",
      iconClass: "text-rose-300",
      blockClass:
        "border-rose-400/25 bg-rose-400/[0.12] text-rose-50 hover:border-rose-300/40",
    };
  }

  if (paymentMode === "OFFLINE_CASH") {
    return {
      label: "Walk-in",
      icon: Banknote,
      pillClass: "border-amber-400/25 bg-amber-400/10 text-amber-200",
      dotClass: "bg-amber-400",
      iconClass: "text-amber-300",
      blockClass:
        "border-amber-400/25 bg-amber-400/[0.12] text-amber-50 hover:border-amber-300/40",
    };
  }

  if (paymentMode === "PHONE_BOOKING") {
    return {
      label: "Phone",
      icon: Phone,
      pillClass: "border-cyan-400/25 bg-cyan-400/10 text-cyan-200",
      dotClass: "bg-cyan-400",
      iconClass: "text-cyan-300",
      blockClass:
        "border-cyan-400/25 bg-cyan-400/[0.12] text-cyan-50 hover:border-cyan-300/40",
    };
  }

  if (paymentMode === "MANUAL_EXTERNAL") {
    return {
      label: "Ground QR",
      icon: QrCode,
      pillClass: "border-violet-400/25 bg-violet-400/10 text-violet-200",
      dotClass: "bg-violet-400",
      iconClass: "text-violet-300",
      blockClass:
        "border-violet-400/25 bg-violet-400/[0.12] text-violet-50 hover:border-violet-300/40",
    };
  }

  if (status === "PENDING") {
    return {
      label: "Online hold",
      icon: Globe2,
      pillClass: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
      dotClass: "bg-emerald-400",
      iconClass: "text-emerald-300",
      blockClass:
        "border-dashed border-emerald-400/30 bg-emerald-400/[0.07] text-emerald-50 hover:border-emerald-300/50",
    };
  }

  if (status === "CANCELLED" || status === "EXPIRED") {
    return {
      label: status === "CANCELLED" ? "Cancelled" : "Expired",
      icon: Globe2,
      pillClass: "border-slate-500/25 bg-slate-500/10 text-slate-300",
      dotClass: "bg-slate-500",
      iconClass: "text-slate-400",
      blockClass:
        "border-slate-500/25 bg-slate-500/[0.08] text-slate-300 hover:border-slate-400/40",
    };
  }

  return {
    label: "Online",
    icon: Globe2,
    pillClass: "border-emerald-400/25 bg-emerald-400/10 text-emerald-200",
    dotClass: "bg-emerald-400",
    iconClass: "text-emerald-300",
    blockClass:
      "border-emerald-400/30 bg-emerald-400/[0.13] text-emerald-50 hover:border-emerald-300/50",
  };
}

export function BookingSourceTag({
  status,
  paymentMode,
  className = "",
}: {
  status: BookingStatusValue;
  paymentMode: PaymentModeValue;
  className?: string;
}) {
  const theme = getBookingSourceTheme(status, paymentMode);
  const Icon = theme.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] ${theme.pillClass} ${className}`}
    >
      <Icon className="size-2.5" strokeWidth={2.4} />
      {theme.label}
    </span>
  );
}
