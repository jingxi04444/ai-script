import { readStoredSession } from '../app/session';
import { API_BASE_URL, USE_MOCK_API, callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { ImportTemplateConfig, ParsedImportTemplateResult } from '../types/ui';

export const templateApi = {
  getImportTemplate(code: string) {
    return callApi<ImportTemplateConfig>(() => mockApi.getImportTemplate(code) as Promise<ImportTemplateConfig>, () => request<ImportTemplateConfig>(`/api/import-templates/${code}`));
  },
  parseImportTemplate(code: string, file: File) {
    if (USE_MOCK_API) return mockApi.parseImportTemplate(code, file) as Promise<ParsedImportTemplateResult>;
    const formData = new FormData();
    formData.append('file', file);
    const token = readStoredSession()?.token;
    return fetch(`${API_BASE_URL}/api/import-templates/${code}/parse`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    }).then((response) => {
      if (!response.ok) throw new Error(`API ${response.status}: /api/import-templates/${code}/parse`);
      return response.json() as Promise<ParsedImportTemplateResult>;
    });
  },
};
