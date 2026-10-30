/**
 * CourtConnect is an India-first product. Firebase returns E.164 phone numbers
 * (for example +919876543210); the database stores the canonical 10-digit
 * Indian mobile number so seeded accounts and new sign-ins resolve to the same
 * user record.
 */
export function normalizePhoneNumber(input: string): string | null {
  const trimmed = input.trim();

  if (!trimmed) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");

  if (trimmed.startsWith("+")) {
    if (digits.startsWith("91") && digits.length === 12) {
      return validateIndianMobile(digits.slice(2));
    }

    if (digits.length === 10) {
      return validateIndianMobile(digits);
    }

    return null;
  }

  if (digits.length === 10) {
    return validateIndianMobile(digits);
  }

  if (digits.length === 11 && digits.startsWith("0")) {
    return validateIndianMobile(digits.slice(1));
  }

  if (digits.length === 12 && digits.startsWith("91")) {
    return validateIndianMobile(digits.slice(2));
  }

  return null;
}

function validateIndianMobile(digits: string): string | null {
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

export function toE164India(phone: string): string | null {
  const normalized = normalizePhoneNumber(phone);
  return normalized ? `+91${normalized}` : null;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const local = digits.length > 10 ? digits.slice(-10) : digits;

  if (local.length !== 10) {
    return phone;
  }

  return `+91 ${local.slice(0, 2)}••• •${local.slice(-4)}`;
}
