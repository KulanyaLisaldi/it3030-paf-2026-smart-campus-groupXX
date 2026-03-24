const STORAGE_KEY = "smartCampusUser";

/** Fired on localStorage user JSON update so the navbar and other UI can refresh. */
export const CAMPUS_USER_UPDATED = "smartcampus-user-updated";

export function readCampusUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Persist signed-in profile to localStorage and notify listeners. Pass null to clear. */
export function persistCampusUser(user) {
  if (user == null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  }
  window.dispatchEvent(new Event(CAMPUS_USER_UPDATED));
}
