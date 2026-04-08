/**
 * Common Validators
 *
 * Validation utilities for phone numbers and emails.
 * These are runtime validators, not Convex schema validators.
 */

/**
 * E.164 phone number regex.
 * Matches: +1234567890 through +123456789012345
 */
const E164_REGEX = /^\+[1-9]\d{6,14}$/;

/**
 * Basic email regex. Not exhaustive but catches most invalid formats.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an E.164 phone number.
 * Returns true if the phone number is in valid E.164 format.
 */
export function isValidPhone(phone: string): boolean {
  return E164_REGEX.test(phone);
}

/**
 * Validate an email address.
 * Returns true if the email has a valid basic format.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Normalize a phone number to E.164 format.
 * Strips common formatting characters (spaces, dashes, parens, dots).
 * Does NOT add country codes — the input must already include one.
 *
 * @throws if the result is not valid E.164
 */
export function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-().]/g, "");
  if (!isValidPhone(cleaned)) {
    throw new Error(
      `Invalid phone number: "${phone}". Must be in E.164 format (e.g. +12025550123).`,
    );
  }
  return cleaned;
}

/**
 * Normalize an email address (lowercase, trim whitespace).
 *
 * @throws if the result is not a valid email
 */
export function normalizeEmail(email: string): string {
  const cleaned = email.trim().toLowerCase();
  if (!isValidEmail(cleaned)) {
    throw new Error(`Invalid email address: "${email}".`);
  }
  return cleaned;
}
