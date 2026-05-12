import type { AuthResult } from '../types/auth';

const FRONT_SESSION_KEY = 'front-session';

export const readStoredSession = (): AuthResult | null => {
  try {
    const raw = localStorage.getItem(FRONT_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as AuthResult;
    return session?.token && session?.user ? session : null;
  } catch {
    localStorage.removeItem(FRONT_SESSION_KEY);
    return null;
  }
};

export const saveStoredSession = (session: AuthResult) => {
  localStorage.setItem(FRONT_SESSION_KEY, JSON.stringify(session));
};

export const clearStoredSession = () => {
  localStorage.removeItem(FRONT_SESSION_KEY);
};
