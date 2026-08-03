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
  needsEmailBinding: boolean;

  login: (username: string, password: string) => Promise<void>;
  smsLogin: (phone: string, code: string) => Promise<void>;
  register: (params: RegisterParams) => Promise<void>;
  bindPhone: (phone: string, code: string) => Promise<void>;
  bindEmail: (email: string, password: string) => Promise<void>;
  acceptAuth: (result: AuthResult) => void;
  logout: () => Promise<void>;
  fetchUserInfo: () => Promise<void>;
  setToken: (token: string) => void;
  clearAuth: () => void;
}

const AUTH_STORAGE_KEY = 'token';
const PHONE_BINDING_STORAGE_KEY = 'needsPhoneBinding';
const EMAIL_BINDING_STORAGE_KEY = 'needsEmailBinding';

const bindingState = (result: AuthResult) => ({
  needsPhoneBinding: result.needsPhoneBinding ?? !result.user.phone,
  needsEmailBinding: result.needsEmailBinding ?? !result.user.email,
});

const persistBindingState = (needsPhoneBinding: boolean, needsEmailBinding: boolean) => {
  localStorage.setItem(PHONE_BINDING_STORAGE_KEY, String(needsPhoneBinding));
  localStorage.setItem(EMAIL_BINDING_STORAGE_KEY, String(needsEmailBinding));
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem(AUTH_STORAGE_KEY),
  isAuthenticated: !!localStorage.getItem(AUTH_STORAGE_KEY),
  isLoading: false,
  needsPhoneBinding: localStorage.getItem(PHONE_BINDING_STORAGE_KEY) === 'true',
  needsEmailBinding: localStorage.getItem(EMAIL_BINDING_STORAGE_KEY) === 'true',

  login: async (username, password) => {
    set({ isLoading: true });
    try {
      resetAppState();
      const result = await authApi.login({ username, password });
      const completion = bindingState(result);
      localStorage.setItem(AUTH_STORAGE_KEY, result.token);
      persistBindingState(completion.needsPhoneBinding, completion.needsEmailBinding);
      set({ token: result.token, user: result.user, ...completion, isAuthenticated: true, isLoading: false });
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
      const completion = bindingState(result);
      localStorage.setItem(AUTH_STORAGE_KEY, result.token);
      persistBindingState(completion.needsPhoneBinding, completion.needsEmailBinding);
      set({ token: result.token, user: result.user, ...completion, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (params) => {
    set({ isLoading: true });
    try {
      resetAppState();
      const result = await authApi.register(params);
      const completion = bindingState(result);
      localStorage.setItem(AUTH_STORAGE_KEY, result.token);
      persistBindingState(completion.needsPhoneBinding, completion.needsEmailBinding);
      set({ token: result.token, user: result.user, ...completion, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  bindPhone: async (phone, code) => {
    set({ isLoading: true });
    try {
      const result = await authApi.bindPhone(phone, code);
      const completion = bindingState(result);
      localStorage.setItem(AUTH_STORAGE_KEY, result.token);
      persistBindingState(completion.needsPhoneBinding, completion.needsEmailBinding);
      set({ token: result.token, user: result.user, ...completion, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  bindEmail: async (email, password) => {
    set({ isLoading: true });
    try {
      const result = await authApi.bindEmail(email, password);
      const completion = bindingState(result);
      localStorage.setItem(AUTH_STORAGE_KEY, result.token);
      persistBindingState(completion.needsPhoneBinding, completion.needsEmailBinding);
      set({ token: result.token, user: result.user, ...completion, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  acceptAuth: (result) => {
    const completion = bindingState(result);
    localStorage.setItem(AUTH_STORAGE_KEY, result.token);
    persistBindingState(completion.needsPhoneBinding, completion.needsEmailBinding);
    set({ token: result.token, user: result.user, ...completion, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(PHONE_BINDING_STORAGE_KEY);
      localStorage.removeItem(EMAIL_BINDING_STORAGE_KEY);
      resetAppState();
      set({ user: null, token: null, needsPhoneBinding: false, needsEmailBinding: false, isAuthenticated: false, isLoading: false });
    }
  },

  fetchUserInfo: async () => {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) {
      resetAppState();
      set({ user: null, token: null, needsPhoneBinding: false, needsEmailBinding: false, isAuthenticated: false, isLoading: false });
      return;
    }
    set({ isLoading: true });
    try {
      const user = await authApi.getUserInfo();
      const needsPhoneBinding = !user.phone;
      const needsEmailBinding = !user.email;
      persistBindingState(needsPhoneBinding, needsEmailBinding);
      set({ user, token, needsPhoneBinding, needsEmailBinding, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(PHONE_BINDING_STORAGE_KEY);
      localStorage.removeItem(EMAIL_BINDING_STORAGE_KEY);
      resetAppState();
      set({ user: null, token: null, needsPhoneBinding: false, needsEmailBinding: false, isAuthenticated: false, isLoading: false });
      throw error;
    }
  },

  setToken: (token) => {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
    set({ token, isAuthenticated: true });
  },

  clearAuth: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(PHONE_BINDING_STORAGE_KEY);
    localStorage.removeItem(EMAIL_BINDING_STORAGE_KEY);
    resetAppState();
    set({ user: null, token: null, needsPhoneBinding: false, needsEmailBinding: false, isAuthenticated: false, isLoading: false });
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('auth:expired', () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(PHONE_BINDING_STORAGE_KEY);
    localStorage.removeItem(EMAIL_BINDING_STORAGE_KEY);
    resetAppState();
    useAuthStore.setState({ user: null, token: null, needsPhoneBinding: false, needsEmailBinding: false, isAuthenticated: false, isLoading: false });
  });
}
