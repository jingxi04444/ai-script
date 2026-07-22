import api from './index';
import type { PageResult } from './index';

export interface Tenant {
  id: string;
  tenantName?: string;
  tenantCode?: string;
  domain?: string;
  status?: number;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  logoUrl?: string;
  themeKey?: string;
  planCode?: string;
  storageQuotaBytes?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface TenantListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}

export const tenantApi = {
  getList: (params?: TenantListParams): Promise<PageResult<Tenant>> => api.get('/tenants', { params }),
  getById: (id: string): Promise<Tenant> => api.get(`/tenants/${id}`),
  create: (data: Partial<Tenant>): Promise<Tenant> => api.post('/tenants', data),
  update: (id: string, data: Partial<Tenant>): Promise<Tenant> => api.put(`/tenants/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/tenants/${id}`),
};
