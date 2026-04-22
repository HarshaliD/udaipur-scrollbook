// ─── Auth helpers ───────────────────────────────────────────────────────────
// All JWT storage is centralised here so nothing else touches localStorage
// directly. This makes it easy to swap out the storage strategy later.

const TOKEN_KEY = 'scrollbook_token';
const USER_KEY  = 'scrollbook_user';

export interface StoredUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  cloudinaryName: string;
  cloudinaryPreset: string;
}

// ── Write ────────────────────────────────────────────────────────────────────
export function saveAuth(token: string, user: StoredUser): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // Private-browsing / storage-quota errors — ignore silently
  }
}

export function saveUser(user: StoredUser): void {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

// ── Read ─────────────────────────────────────────────────────────────────────
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getUser(): StoredUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function isLoggedIn(): boolean {
  return Boolean(getToken());
}

// ── Delete ────────────────────────────────────────────────────────────────────
export function clearAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}
