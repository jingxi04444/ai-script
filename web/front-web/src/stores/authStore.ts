import { create } from 'zustand';
import { authApi } from '../api';
import type { UserInfo } from '../types/user';
import { resetAppState } from './resetAppState';

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (username: string, password: string) => Promise<void>;
  register: (params: { username: string; password: string; email?: string; phone?: string }) => Promise<void>;
  logout: () => Promise<void>;
  fetchUserInfo: () => Promise<void>;
  setToken: (token: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      resetAppState();
      const { token, user } = await authApi.login({ username, password });
      localStorage.setItem('token', token);
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (params) => {
    set({ isLoading: true });
    try {
      resetAppState();
      const { token, user } = await authApi.register(params);
      localStorage.setItem('token', token);
      set({ token, user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      resetAppState();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },

  fetchUserInfo: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      resetAppState();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const user = await authApi.getUserInfo();
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem('token');
      resetAppState();
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      throw error;
    }
  },

  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem('token');
    resetAppState();
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    resetAppState();
    useAuthStore.setState({ user: null, token: null, isAuthenticated: false, isLoading: false });
  });
}
