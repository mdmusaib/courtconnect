export type BookingStatusValue =
  | "PENDING"
  | "CONFIRMED"
  | "CANCELLED"
  | "EXPIRED"
  | "MAINTENANCE";

export type BlockTypeValue = "PERMANENT_RECURRING" | "TEMPORARY";

export type PaymentModeValue =
  | "FULL_ONLINE"
  | "ADVANCE_ONLINE"
  | "OFFLINE_CASH"
  | "PHONE_BOOKING"
  | "MANUAL_EXTERNAL";

export type RefundStatusValue = "NONE" | "PENDING" | "PROCESSED" | "FAILED";

export type VerificationStatusValue = "PENDING" | "VERIFIED" | "REJECTED";

export type DisputeStatusValue = "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED";

export type DisputeResolutionValue =
  | "NONE"
  | "FULL_REFUND"
  | "PARTIAL_REFUND"
  | "REJECTED";

export interface CourtSummary {
  id: string;
  name: string;
  sportType: string;
  price: number;
}

export interface VenueCardData {
  id: string;
  name: string;
  city: string;
  address: string;
  amenities: string[];
  courts: CourtSummary[];
  minPrice: number;
}

export interface SlotOption {
  startIso: string;
  endIso: string;
  label: string;
  range: string;
}

export interface DaySchedule {
  key: string;
  weekday: string;
  day: string;
  month: string;
  label: string;
  dateLabel: string;
  isToday: boolean;
  slots: SlotOption[];
}

export interface SlotBooking {
  courtId: string;
  slotStart: string;
  status: BookingStatusValue;
}

export interface VenueBookingData {
  id: string;
  name: string;
  address: string;
  city: string;
  amenities: string[];
  courts: CourtSummary[];
}

export interface BookingListItem {
  id: string;
  status: BookingStatusValue;
  paymentMode: PaymentModeValue;
  slotStart: string;
  slotEnd: string;
  createdAt: string;
  paidAmount: number;
  dueAmount: number;
  convenienceFee: number;
  ownerPayout: number;
  utrNumber: string | null;
  refundAmount: number;
  refundStatus: RefundStatusValue;
  refundPolicy: string | null;
  cancelledAt: string | null;
  canCancel: boolean;
  dateLabel: string;
  timeLabel: string;
  fullDateLabel: string;
  court: CourtSummary;
  venue: {
    id: string;
    name: string;
    address: string;
    city: string;
  };
  isActive: boolean;
  holdExpired: boolean;
}

export interface CheckoutBookingData {
  id: string;
  status: BookingStatusValue;
  paymentMode: PaymentModeValue;
  createdAt: string;
  slotStart: string;
  slotEnd: string;
  userId: string | null;
  paidAmount: number;
  dueAmount: number;
  convenienceFee: number;
  ownerPayout: number;
  utrNumber: string | null;
  dateLabel: string;
  timeLabel: string;
  fullDateLabel: string;
  court: {
    id: string;
    name: string;
    sportType: string;
    price: number;
    venue: {
      id: string;
      name: string;
      address: string;
      city: string;
    };
  };
}

export type OwnerEntryType = "WALK_IN" | "PHONE" | "GROUND_QR";

export interface OwnerCourtOption {
  id: string;
  name: string;
  venueId: string;
  venueName: string;
  sportType: string;
  price: number;
}

export interface OwnerBookingRow {
  id: string;
  courtId: string;
  courtName: string;
  venueId: string;
  venueName: string;
  slotStart: string;
  slotEnd: string;
  status: BookingStatusValue;
  paymentMode: PaymentModeValue;
  paidAmount: number;
  dueAmount: number;
  ownerPayout: number;
  convenienceFee: number;
  customerName: string | null;
  createdAt: string;
}

export interface SlotBlockItem {
  id: string;
  courtId: string;
  courtName: string;
  venueId: string;
  venueName: string;
  blockType: BlockTypeValue;
  reason: string;
  startTime: string | null;
  endTime: string | null;
  startDate: string | null;
  endDate: string | null;
  daysOfWeek: number[];
  createdAt: string;
}

export interface CalendarBlockItem {
  id: string; // generated per occurrence or block.id
  blockId: string;
  courtId: string;
  courtName: string;
  venueId: string;
  venueName: string;
  blockType: BlockTypeValue;
  reason: string;
  slotStart: string; // ISO string for the day
  slotEnd: string;   // ISO string for the day
  startTime: string | null;
  endTime: string | null;
  startDate: string | null;
  endDate: string | null;
  daysOfWeek: number[];
}

