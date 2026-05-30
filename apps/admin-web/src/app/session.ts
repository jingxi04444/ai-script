import type { AuthResult } from '../types/admin';

const ADMIN_SESSION_KEY = 'admin-session';

export function readStoredSession(): AuthResult | null {
  const raw = localStorage.getItem(ADMIN_SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as AuthResult;
    return session?.token && session?.user ? session : null;
  } catch {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

export function saveStoredSession(session: AuthResult) {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
}
