/** Profile phone: digits only, exactly this many characters (no letters, spaces, or symbols). */
export const PROFILE_PHONE_DIGITS = 10;

/** Strip non-digits and cap length so users cannot type letters. */
export function sanitizeProfilePhoneInput(raw) {
  return String(raw ?? "").replace(/\D/g, "").slice(0, PROFILE_PHONE_DIGITS);
}

/** Normalize a value from the API for the controlled input (digits only). */
export function phoneFromServer(stored) {
  return sanitizeProfilePhoneInput(stored);
}

export function isValidProfilePhone(value) {
  return new RegExp(`^\\d{${PROFILE_PHONE_DIGITS}}$`).test(String(value ?? ""));
}
