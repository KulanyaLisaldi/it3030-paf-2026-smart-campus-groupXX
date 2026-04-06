/**
 * Shared rules for Contact Us, Manage Account contact edit, and admin reply text.
 * — No more than 3 identical non-space characters in a row
 * — Allowed character sets (no @ # $ % ^ & * etc. outside email field)
 */

/** Max identical non-whitespace chars in a row (4+ blocked when value is 3). */
const DEFAULT_MAX_SAME_CHAR_RUN = 3;

export function hasExcessiveConsecutiveSameChar(text, maxRun = DEFAULT_MAX_SAME_CHAR_RUN) {
  if (!text || maxRun < 1) return false;
  const re = new RegExp(`([^\\s])\\1{${maxRun},}`);
  return re.test(text);
}

export const ERR_SAME_CHAR_RUN = "The same character cannot be repeated more than 3 times in a row.";

/** First / last name: letters (any language), spaces, hyphen, apostrophe */
const NAME_CHARS = /^[\p{L}\s'-]*$/u;

export const ERR_NAME_CHARS =
  "Names may only include letters, spaces, hyphens, and apostrophes (no numbers or symbols).";

export function nameCharsValid(value) {
  return value === "" || NAME_CHARS.test(value);
}

/** Subject: letters, digits, spaces, period, comma, hyphen, apostrophe */
const SUBJECT_CHARS = /^[a-zA-Z0-9\s.,'-]+$/;

export const ERR_SUBJECT_CHARS =
  "Subject may only use letters, numbers, spaces, and these characters: . , - '";

export function subjectCharsValid(value) {
  return value === "" || SUBJECT_CHARS.test(value);
}

/** Message body & admin reply: letters, digits, common whitespace and punctuation (no @#$%^&*<>{}[]|\~`) */
const LONG_TEXT_CHARS = /^[a-zA-Z0-9\s.,!?+:;'"()/\-\n\r]+$/;

export const ERR_LONG_TEXT_CHARS =
  "Only letters, numbers, spaces, and basic punctuation are allowed. Do not use symbols such as @ # $ % ^ & * < >.";

export function longTextCharsValid(value) {
  return value === "" || LONG_TEXT_CHARS.test(value);
}

/** Optional phone: digits, spaces, hyphens, optional leading + */
const PHONE_CHARS = /^[+0-9\s-]+$/;

export const ERR_PHONE_CHARS =
  "Phone may only include digits, spaces, hyphens, and one leading +.";

export function phoneCharsValid(phoneTrimmed) {
  if (!phoneTrimmed) return true;
  return PHONE_CHARS.test(phoneTrimmed);
}
