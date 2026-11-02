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
      pillClass: "border-rose-200 bg-rose-50 text-rose-700",
      dotClass: "bg-rose-500",
      iconClass: "text-rose-600",
      blockClass:
        "border-rose-200 bg-rose-50 text-rose-800 hover:border-rose-300",
    };
  }

  if (paymentMode === "OFFLINE_CASH") {
    return {
      label: "Walk-in",
      icon: Banknote,
      pillClass: "border-amber-200 bg-amber-50 text-amber-700",
      dotClass: "bg-amber-500",
      iconClass: "text-amber-600",
      blockClass:
        "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300",
    };
  }

  if (paymentMode === "PHONE_BOOKING") {
    return {
      label: "Phone",
      icon: Phone,
      pillClass: "border-cyan-200 bg-cyan-50 text-cyan-700",
      dotClass: "bg-cyan-500",
      iconClass: "text-cyan-600",
      blockClass:
        "border-cyan-200 bg-cyan-50 text-cyan-800 hover:border-cyan-300",
    };
  }

  if (paymentMode === "MANUAL_EXTERNAL") {
    return {
      label: "Ground QR",
      icon: QrCode,
      pillClass: "border-violet-200 bg-violet-50 text-violet-700",
      dotClass: "bg-violet-500",
      iconClass: "text-violet-600",
      blockClass:
        "border-violet-200 bg-violet-50 text-violet-800 hover:border-violet-300",
    };
  }

  if (status === "PENDING") {
    return {
      label: "Online hold",
      icon: Globe2,
      pillClass: "border-emerald-200 bg-primary-soft text-emerald-700",
      dotClass: "bg-emerald-500",
      iconClass: "text-primary",
      blockClass:
        "border-dashed border-emerald-300 bg-primary-soft text-emerald-800 hover:border-emerald-400",
    };
  }

  if (status === "CANCELLED" || status === "EXPIRED") {
    return {
      label: status === "CANCELLED" ? "Cancelled" : "Expired",
      icon: Globe2,
      pillClass: "border-slate-200 bg-slate-100 text-slate-600",
      dotClass: "bg-slate-400",
      iconClass: "text-slate-500",
      blockClass:
        "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300",
    };
  }

  return {
    label: "Online",
    icon: Globe2,
    pillClass: "border-emerald-200 bg-primary-soft text-emerald-700",
    dotClass: "bg-emerald-500",
    iconClass: "text-primary",
    blockClass:
      "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300",
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
