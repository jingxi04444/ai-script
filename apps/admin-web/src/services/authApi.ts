import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { AdminUser, AuthPayload, AuthResult } from '../types/admin';

export const authApi = {
  login(payload: AuthPayload) {
    return callApi<AuthResult>(
      () => mockApi.login(payload) as Promise<AuthResult>,
      () => request<AuthResult>('/api/admin/auth/login', { method: 'POST', body: payload }),
    );
  },
  getCurrentUser() {
    return callApi<AdminUser>(
      () => mockApi.getCurrentUser() as Promise<AdminUser>,
      () => request<AdminUser>('/api/admin/auth/current-user'),
    );
  },
};
