import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { ParsingLog, ProviderConfigPayload, ProviderConfigResult } from '../types/admin';

export const parsingApi = {
  getParsingLogs() {
    return callApi<ParsingLog[]>(
      () => mockApi.getParsingLogs() as Promise<ParsingLog[]>,
      () => request<ParsingLog[]>('/api/admin/parsing/logs'),
    );
  },
  retryParsingLog(id: string) {
    return callApi<{ id: string; status: string }>(
      () => mockApi.retryParsingLog(id) as Promise<{ id: string; status: string }>,
      () => request<{ id: string; status: string }>(`/api/admin/parsing/logs/${id}/retry`, { method: 'POST' }),
    );
  },
  saveProviderConfig(payload: ProviderConfigPayload) {
    return callApi<ProviderConfigResult>(
      () => mockApi.saveProviderConfig(payload) as Promise<ProviderConfigResult>,
      () => request<ProviderConfigResult>('/api/admin/parsing/providers', { method: 'POST', body: payload }),
    );
  },
};
