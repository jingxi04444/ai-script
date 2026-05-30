import { callApi, request, requestList } from './apiClient';
import { mockApi } from './mock.js';
import type { ApiContract, ApiProvider, CreateApiProviderRequest, ParseProvider, PromptTemplate, Status, UpdatePromptTemplateRequest } from '../types/admin';

export const apiManagementApi = {
  getApiProviders() {
    return callApi<ApiProvider[]>(() => mockApi.getApiProviders() as Promise<ApiProvider[]>, () => requestList<ApiProvider>('/api/admin/api-providers'));
  },
  createApiProvider(payload: CreateApiProviderRequest) {
    return callApi<ApiProvider>(() => mockApi.createApiProvider(payload) as Promise<ApiProvider>, () => request<ApiProvider>('/api/admin/api-providers', { method: 'POST', body: payload }));
  },
  updateApiProvider(id: string, payload: CreateApiProviderRequest) {
    return callApi<ApiProvider>(() => mockApi.updateApiProvider(id, payload) as Promise<ApiProvider>, () => request<ApiProvider>(`/api/admin/api-providers/${id}`, { method: 'PATCH', body: payload }));
  },
  updateApiProviderStatus(id: string, status: Status) {
    return callApi<ApiProvider>(() => mockApi.updateApiProviderStatus(id, status) as Promise<ApiProvider>, () => request<ApiProvider>(`/api/admin/api-providers/${id}/status`, { method: 'PATCH', body: { status } }));
  },
  getParseProviders() {
    return callApi<ParseProvider[]>(() => mockApi.getParseProviders() as Promise<ParseProvider[]>, () => requestList<ParseProvider>('/api/admin/parse-providers'));
  },
  getApiContracts() {
    return callApi<ApiContract[]>(() => mockApi.getApiContracts() as Promise<ApiContract[]>, () => requestList<ApiContract>('/api/admin/api-contracts'));
  },
  getPromptTemplates() {
    return callApi<PromptTemplate[]>(() => mockApi.getPromptTemplates() as Promise<PromptTemplate[]>, () => requestList<PromptTemplate>('/api/admin/prompt-templates'));
  },
  updatePromptTemplate(id: string, payload: UpdatePromptTemplateRequest) {
    return callApi<PromptTemplate>(() => mockApi.updatePromptTemplate(id, payload) as Promise<PromptTemplate>, () => request<PromptTemplate>(`/api/admin/prompt-templates/${id}`, { method: 'PATCH', body: payload }));
  },
};
