import { callApi, request, requestList, withQuery } from './apiClient';
import { mockApi } from './mock.js';
import type { CreateUserRequest, ManagedUser, RolePermission, Status } from '../types/admin';

export const userApi = {
  getUsers(query: Record<string, unknown> = {}) {
    return callApi<ManagedUser[]>(() => mockApi.getUsers(query) as Promise<ManagedUser[]>, () => requestList<ManagedUser>(withQuery('/api/admin/users', query)));
  },
  createUser(payload: CreateUserRequest) {
    return callApi<ManagedUser>(() => mockApi.createUser(payload) as Promise<ManagedUser>, () => request<ManagedUser>('/api/admin/users', { method: 'POST', body: payload }));
  },
  updateUserStatus(id: string, status: Status) {
    const action = status === 'inactive' ? 'disable' : 'enable';
    return callApi<ManagedUser>(() => mockApi.updateUserStatus(id, status) as Promise<ManagedUser>, () => request<ManagedUser>(`/api/admin/users/${id}/${action}`, { method: 'POST' }));
  },
  getRoles() {
    return callApi<RolePermission[]>(() => mockApi.getRoles() as Promise<RolePermission[]>, () => requestList<RolePermission>('/api/admin/roles'));
  },
};
