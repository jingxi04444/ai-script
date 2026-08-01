import { create } from 'zustand';
import { authApi } from '../api';
import type { UserInfo } from '../types/user';
import type { AuthResult, RegisterParams } from '../types/user';
import { resetAppState } from './resetAppState';

interface AuthState {
  user: UserInfo | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  needsPhoneBinding: boolean;

  login: (username: string, password: string) => Promise<void>;
  smsLogin: (phone: string, code: string) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  bindPhone: (phone: string, code: string) => Promise<void>;
  acceptAuth: (result: AuthResult) => void;
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
  needsPhoneBinding: false,

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      resetAppState();
      const { token, user, needsPhoneBinding } = await authApi.login({ username, password });
      localStorage.setItem('token', token);
      set({ token, user, needsPhoneBinding: !!needsPhoneBinding, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  smsLogin: async (phone, code) => {
    set({ isLoading: true });
    try {
      resetAppState();
      const result = await authApi.smsLogin(phone, code);
      localStorage.setItem('token', result.token);
      set({ token: result.token, user: result.user, needsPhoneBinding: !!result.needsPhoneBinding, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (params) => {
    set({ isLoading: true });
    try {
      resetAppState();
      const { token, user, needsPhoneBinding } = await authApi.register(params);
      localStorage.setItem('token', token);
      set({ token, user, needsPhoneBinding: !!needsPhoneBinding, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  bindPhone: async (phone, code) => {
    set({ isLoading: true });
    try {
      const result = await authApi.bindPhone(phone, code);
      localStorage.setItem('token', result.token);
      set({ token: result.token, user: result.user, needsPhoneBinding: false, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  acceptAuth: (result) => {
    localStorage.setItem('token', result.token);
    set({ token: result.token, user: result.user, needsPhoneBinding: !!result.needsPhoneBinding, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('token');
      resetAppState();
      set({ user: null, token: null, needsPhoneBinding: false, isAuthenticated: false, isLoading: false });
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
      set({ user, token, needsPhoneBinding: !user.phone, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem('token');
      resetAppState();
      set({ user: null, token: null, needsPhoneBinding: false, isAuthenticated: false, isLoading: false });
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
    set({ user: null, token: null, needsPhoneBinding: false, isAuthenticated: false, isLoading: false });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    resetAppState();
    useAuthStore.setState({ user: null, token: null, needsPhoneBinding: false, isAuthenticated: false, isLoading: false });
  });
}
