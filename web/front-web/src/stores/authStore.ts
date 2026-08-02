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

const AUTH_STORAGE_KEY = 'token';
const BINDING_STORAGE_KEY = 'needsPhoneBinding';

const readStoredBinding = () => localStorage.getItem(BINDING_STORAGE_KEY) === 'true';
const resolvePhoneBinding = (user: UserInfo | null) => {
  const stored = localStorage.getItem(BINDING_STORAGE_KEY);
  if (stored !== null) return stored === 'true';
  return user ? !user.phone : false;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem(AUTH_STORAGE_KEY),
  isAuthenticated: !!localStorage.getItem(AUTH_STORAGE_KEY),
  isLoading: false,
  needsPhoneBinding: readStoredBinding(),

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      resetAppState();
      const { token, user, needsPhoneBinding } = await authApi.login({ username, password });
      localStorage.setItem(AUTH_STORAGE_KEY, token);
      localStorage.setItem(BINDING_STORAGE_KEY, String(!!needsPhoneBinding));
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
      localStorage.setItem(AUTH_STORAGE_KEY, result.token);
      localStorage.setItem(BINDING_STORAGE_KEY, String(!!result.needsPhoneBinding));
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
      localStorage.setItem(AUTH_STORAGE_KEY, token);
      localStorage.setItem(BINDING_STORAGE_KEY, String(!!needsPhoneBinding));
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
      localStorage.setItem(AUTH_STORAGE_KEY, result.token);
      localStorage.setItem(BINDING_STORAGE_KEY, 'false');
      set({ token: result.token, user: result.user, needsPhoneBinding: false, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  acceptAuth: (result) => {
    localStorage.setItem(AUTH_STORAGE_KEY, result.token);
    localStorage.setItem(BINDING_STORAGE_KEY, String(!!result.needsPhoneBinding));
    set({ token: result.token, user: result.user, needsPhoneBinding: !!result.needsPhoneBinding, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(BINDING_STORAGE_KEY);
      resetAppState();
      set({ user: null, token: null, needsPhoneBinding: false, isAuthenticated: false, isLoading: false });
    }
  },

  fetchUserInfo: async () => {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) {
      resetAppState();
      set({ user: null, token: null, needsPhoneBinding: false, isAuthenticated: false, isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const user = await authApi.getUserInfo();
      const needsPhoneBinding = resolvePhoneBinding(user);
      localStorage.setItem(BINDING_STORAGE_KEY, String(needsPhoneBinding));
      set({ user, token, needsPhoneBinding, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(BINDING_STORAGE_KEY);
      resetAppState();
      set({ user: null, token: null, needsPhoneBinding: false, isAuthenticated: false, isLoading: false });
      throw error;
    }
  },

  setToken: (token) => {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
    set({ token, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(BINDING_STORAGE_KEY);
    resetAppState();
    set({ user: null, token: null, needsPhoneBinding: false, isAuthenticated: false, isLoading: false });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(BINDING_STORAGE_KEY);
    resetAppState();
    useAuthStore.setState({ user: null, token: null, needsPhoneBinding: false, isAuthenticated: false, isLoading: false });
  });
}
