import api from './index';
import type { PageResult } from './index';

export interface Provider {
  id: string;
  providerType?: string;
  providerName?: string;
  platform?: string;
  endpointUrl?: string;
  apiKey?: string;
  priority?: number;
  timeoutMs?: number;
  retryCount?: number;
  configJson?: string;
  status?: number;
  apiKeyConfigured?: boolean;
  createdAt?: string;
  updateTime?: string;
}

export interface ProviderListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}

export const providerApi = {
  getList: (params?: ProviderListParams): Promise<PageResult<Provider>> => api.get('/providers', { params }),
  getById: (id: string): Promise<Provider> => api.get(`/providers/${id}`),
  create: (data: Partial<Provider>): Promise<Provider> => api.post('/providers', data),
  update: (id: string, data: Partial<Provider>): Promise<Provider> => api.put(`/providers/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/providers/${id}`),
};
