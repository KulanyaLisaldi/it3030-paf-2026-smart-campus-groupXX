/**
 * Notifications UI uses Inter (linked in index.html) for clearer body copy and titles
 * than the account shell’s default system stack.
 */
export const NOTIFICATION_UI_FONT = '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

export const notificationUiRootStyle = {
  fontFamily: NOTIFICATION_UI_FONT,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
};
