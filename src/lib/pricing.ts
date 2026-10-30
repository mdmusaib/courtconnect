export interface PricingBreakdown {
  courtPrice: number;
  convenienceFee: number;
  totalPayable: number;
  ownerPayout: number;
  isOnlinePayment: boolean;
}

export function calculateBookingPrice(
  courtPrice: number,
  paymentMode:
    | "FULL_ONLINE"
    | "ADVANCE_ONLINE"
    | "OFFLINE_CASH"
    | "PHONE_BOOKING"
    | "MANUAL_EXTERNAL",
): PricingBreakdown {
  const isOnline =
    paymentMode === "FULL_ONLINE" || paymentMode === "ADVANCE_ONLINE";

  // Online app bookings: Flat ₹25 player convenience fee (covers server + AI processing + platform profit)
  // Owner direct entries (Cash/Phone/Ground QR): ₹0 convenience fee
  const convenienceFee = isOnline ? 25 : 0;

  return {
    courtPrice,
    convenienceFee,
    totalPayable: courtPrice + convenienceFee,
    ownerPayout: courtPrice, // 100% court fee guaranteed to turf owner (0% owner commission)
    isOnlinePayment: isOnline,
  };
}
