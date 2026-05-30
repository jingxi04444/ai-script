import { callApi, request, withQuery } from './apiClient';
import { mockApi } from './mock.js';
import type { KnowledgeBaseData, KnowledgeQuery, OriginalTemplate, OriginalTemplateRequest } from '../types/admin';

export const knowledgeApi = {
  getKnowledgeBase(query: KnowledgeQuery = {}) {
    return callApi<KnowledgeBaseData>(() => mockApi.getKnowledgeBase(query) as Promise<KnowledgeBaseData>, () => request<KnowledgeBaseData>(withQuery('/api/admin/knowledge-base', query)));
  },
  createOriginalTemplate(payload: OriginalTemplateRequest) {
    return callApi<OriginalTemplate>(() => mockApi.createOriginalTemplate(payload) as Promise<OriginalTemplate>, () => request<OriginalTemplate>('/api/admin/original-templates', { method: 'POST', body: payload }));
  },
  updateOriginalTemplate(id: string, payload: OriginalTemplateRequest) {
    return callApi<OriginalTemplate>(() => mockApi.updateOriginalTemplate(id, payload) as Promise<OriginalTemplate>, () => request<OriginalTemplate>(`/api/admin/original-templates/${id}`, { method: 'PATCH', body: payload }));
  },
  deleteOriginalTemplate(id: string) {
    return callApi<{ id: string; status: string }>(() => mockApi.deleteOriginalTemplate(id) as Promise<{ id: string; status: string }>, () => request<{ id: string; status: string }>(`/api/admin/original-templates/${id}`, { method: 'DELETE' }));
  },
};
