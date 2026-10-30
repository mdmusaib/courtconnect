export const IST = "Asia/Kolkata";

const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

const timeFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const dateLongFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  weekday: "short",
  day: "numeric",
  month: "short",
});

const dateNumericFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: IST,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const dateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: IST,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const datePartsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: IST,
  weekday: "short",
  day: "2-digit",
  month: "short",
});

export function formatINR(amount: number): string {
  return `₹${numberFormatter.format(Math.round(amount))}`;
}

export function formatTime(date: Date): string {
  return timeFormatter.format(date).toUpperCase();
}

export function formatDateLong(date: Date): string {
  return dateLongFormatter.format(date);
}

export function formatDateNumeric(date: Date): string {
  return dateNumericFormatter.format(date);
}

export function formatDateTimeLong(date: Date): string {
  return `${formatDateLong(date)} · ${formatTime(date)}`;
}

export function formatDateKey(date: Date): string {
  return dateKeyFormatter.format(date);
}

export function dateFromKey(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00+05:30`);
}

export function slotStartForKey(dateKey: string, hour: number): Date {
  return new Date(
    `${dateKey}T${String(hour).padStart(2, "0")}:00:00+05:30`,
  );
}

export function addDaysToDateKey(dateKey: string, days: number): string {
  const date = dateFromKey(dateKey);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateKey(date);
}

export function getDateParts(date: Date): {
  weekday: string;
  day: string;
  month: string;
} {
  const parts = datePartsFormatter.formatToParts(date);

  const valueFor = (type: string) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    weekday: valueFor("weekday"),
    day: valueFor("day"),
    month: valueFor("month"),
  };
}

export function formatDateKeyLong(dateKey: string): string {
  const { weekday, day, month } = getDateParts(dateFromKey(dateKey));
  return `${weekday}, ${day} ${month}`;
}

export function formatRelativeDateKey(dateKey: string): string {
  const todayKey = formatDateKey(new Date());
  const tomorrowKey = addDaysToDateKey(todayKey, 1);

  if (dateKey === todayKey) return "Today";
  if (dateKey === tomorrowKey) return "Tomorrow";

  return getDateParts(dateFromKey(dateKey)).weekday;
}

export function formatSlotRange(start: Date, end: Date): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatHours(hours: number): string {
  if (hours === 1) return "1 hour";
  return `${hours} hours`;
}
