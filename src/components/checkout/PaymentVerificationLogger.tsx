"use client";

import { useEffect, useRef } from "react";

export interface PaymentVerificationTrace {
  bookingId: string;
  courtName: string;
  status: string;
  utr: string | null;
  amount: number;
  model: string;
  app: string | null;
  confidence: number | null;
  verifiedAt: string | null;
}

/**
 * Writes the persisted receipt-verification details to the browser console.
 * This makes mobile end-to-end testing possible from a phone connected to
 * remote debugging, without digging through server logs.
 */
export function PaymentVerificationLogger({
  trace,
}: {
  trace: PaymentVerificationTrace;
}) {
  const logged = useRef(false);

  useEffect(() => {
    if (logged.current) {
      return;
    }

    logged.current = true;
    console.info("[CourtConnect] Payment verification", trace);
  }, [trace]);

  return null;
}
