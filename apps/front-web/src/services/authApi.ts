import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { AuthPayload, AuthResult, User } from '../types/auth';

const toStringValue = (value: FormDataEntryValue | null | undefined) => (typeof value === 'string' ? value : '');

const normalizeAuthPayload = (payload: AuthPayload) => ({
  name: toStringValue(payload.name) || undefined,
  account: toStringValue(payload.account),
  password: toStringValue(payload.password),
});

export const authApi = {
  login(payload: AuthPayload) {
    const body = normalizeAuthPayload(payload);
    return callApi<AuthResult>(() => mockApi.login(body) as Promise<AuthResult>, () => request<AuthResult>('/api/auth/login', { method: 'POST', body }));
  },
  register(payload: AuthPayload) {
    const body = normalizeAuthPayload(payload);
    return callApi<AuthResult>(() => mockApi.register(body) as Promise<AuthResult>, () => request<AuthResult>('/api/auth/register', { method: 'POST', body }));
  },
  getCurrentUser() {
    return callApi<User>(() => mockApi.getCurrentUser() as Promise<User>, () => request<User>('/api/auth/me'));
  },
};
