import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { CreateRolePayload, CreateRoleResult, RolePermission } from '../types/admin';

export const roleApi = {
  getRoles() {
    return callApi<RolePermission[]>(
      () => mockApi.getRoles() as Promise<RolePermission[]>,
      () => request<RolePermission[]>('/api/admin/roles'),
    );
  },
  createRole(payload: CreateRolePayload) {
    return callApi<CreateRoleResult>(
      () => mockApi.createRole(payload) as Promise<CreateRoleResult>,
      () => request<CreateRoleResult>('/api/admin/roles', { method: 'POST', body: payload }),
    );
  },
};
