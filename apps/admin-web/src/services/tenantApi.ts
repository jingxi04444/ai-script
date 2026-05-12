import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { CreateTenantPayload, CreateTenantResult, Tenant } from '../types/admin';

export const tenantApi = {
  getTenants() {
    return callApi<Tenant[]>(
      () => mockApi.getTenants() as Promise<Tenant[]>,
      () => request<Tenant[]>('/api/admin/tenants'),
    );
  },
  createTenant(payload: CreateTenantPayload) {
    return callApi<CreateTenantResult>(
      () => mockApi.createTenant(payload) as Promise<CreateTenantResult>,
      () => request<CreateTenantResult>('/api/admin/tenants', { method: 'POST', body: payload }),
    );
  },
};
