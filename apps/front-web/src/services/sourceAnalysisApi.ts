import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { OriginalTemplate, SourceAnalysis } from '../types/source';

export const sourceAnalysisApi = {
  parseSourceLink(url: string) {
    return callApi<SourceAnalysis>(() => mockApi.parseSourceLink(url) as Promise<SourceAnalysis>, () => request<SourceAnalysis>('/api/source-analysis/parse-link', { method: 'POST', body: { url } }));
  },
  getOriginalTemplates() {
    return callApi<OriginalTemplate[]>(() => mockApi.getOriginalTemplates() as Promise<OriginalTemplate[]>, () => request<OriginalTemplate[]>('/api/original-templates'));
  },
};
