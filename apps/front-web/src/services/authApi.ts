import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { AuthPayload, AuthResult, User } from '../types/auth';

export const authApi = {
  login(payload: AuthPayload) {
    return callApi<AuthResult>(() => mockApi.login(payload) as Promise<AuthResult>, () => request<AuthResult>('/api/auth/login', { method: 'POST', body: payload }));
  },
  register(payload: AuthPayload) {
    return callApi<AuthResult>(() => mockApi.register(payload) as Promise<AuthResult>, () => request<AuthResult>('/api/auth/register', { method: 'POST', body: payload }));
  },
  getCurrentUser() {
    return callApi<User>(() => mockApi.getCurrentUser() as Promise<User>, () => request<User>('/api/auth/me'));
  },
};
