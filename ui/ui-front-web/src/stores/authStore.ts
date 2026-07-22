import { create } from 'zustand';

interface AuthState {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: window.localStorage.getItem('ai-script-auth') === '1',
  login: () => {
    window.localStorage.setItem('ai-script-auth', '1');
    set({ isAuthenticated: true });
  },
  logout: () => {
    window.localStorage.removeItem('ai-script-auth');
    set({ isAuthenticated: false });
  },
}));
