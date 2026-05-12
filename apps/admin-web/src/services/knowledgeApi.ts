import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { Formula, KnowledgeImportPayload, KnowledgeImportResult } from '../types/admin';

export const knowledgeApi = {
  getFormulas() {
    return callApi<Formula[]>(
      () => mockApi.getFormulas() as Promise<Formula[]>,
      () => request<Formula[]>('/api/admin/knowledge/formulas'),
    );
  },
  importKnowledgeFile(payload: KnowledgeImportPayload) {
    return callApi<KnowledgeImportResult>(
      () => mockApi.importKnowledgeFile(payload) as Promise<KnowledgeImportResult>,
      () => request<KnowledgeImportResult>('/api/admin/knowledge/imports', { method: 'POST', body: payload }),
    );
  },
};
