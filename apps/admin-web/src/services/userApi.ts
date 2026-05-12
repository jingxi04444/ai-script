import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { AdminAccount, CreateAdminUserPayload, CreateAdminUserResult } from '../types/admin';

export const userApi = {
  getAdminUsers() {
    return callApi<AdminAccount[]>(
      () => mockApi.getAdminUsers() as Promise<AdminAccount[]>,
      () => request<AdminAccount[]>('/api/admin/users'),
    );
  },
  createAdminUser(payload: CreateAdminUserPayload) {
    return callApi<CreateAdminUserResult>(
      () => mockApi.createAdminUser(payload) as Promise<CreateAdminUserResult>,
      () => request<CreateAdminUserResult>('/api/admin/users', { method: 'POST', body: payload }),
    );
  },
  disableAdminUser(id: string) {
    return callApi<{ id: string; status: string }>(
      () => mockApi.disableAdminUser(id) as Promise<{ id: string; status: string }>,
      () => request<{ id: string; status: string }>(`/api/admin/users/${id}/disable`, { method: 'POST' }),
    );
  },
};
