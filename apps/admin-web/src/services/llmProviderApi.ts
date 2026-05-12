import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { CreateLlmProviderPayload, CreateLlmProviderResult, LlmProvider } from '../types/admin';

export const llmProviderApi = {
  getProviders() {
    return callApi<LlmProvider[]>(
      () => mockApi.getLlmProviders() as Promise<LlmProvider[]>,
      () => request<LlmProvider[]>('/api/admin/llm/providers'),
    );
  },
  createProvider(payload: CreateLlmProviderPayload) {
    return callApi<CreateLlmProviderResult>(
      () => mockApi.createLlmProvider(payload) as Promise<CreateLlmProviderResult>,
      () => request<CreateLlmProviderResult>('/api/admin/llm/providers', { method: 'POST', body: payload }),
    );
  },
  disableProvider(id: string) {
    return callApi<{ id: string; status: string }>(
      () => mockApi.disableLlmProvider(id) as Promise<{ id: string; status: string }>,
      () => request<{ id: string; status: string }>(`/api/admin/llm/providers/${id}/disable`, { method: 'POST' }),
    );
  },
};
