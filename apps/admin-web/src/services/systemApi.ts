import { callApi, request, requestList } from './apiClient';
import { mockApi } from './mock.js';
import type { ImportTemplateConfig } from '../types/admin';

export const systemApi = {
  getImportTemplates() {
    return callApi<ImportTemplateConfig[]>(() => mockApi.getImportTemplates() as Promise<ImportTemplateConfig[]>, () => requestList<ImportTemplateConfig>('/api/admin/import-templates'));
  },
  updateImportTemplate(code: string, payload: ImportTemplateConfig) {
    return callApi<ImportTemplateConfig>(() => mockApi.updateImportTemplate(code, payload) as Promise<ImportTemplateConfig>, () => request<ImportTemplateConfig>(`/api/admin/import-templates/${code}`, { method: 'PATCH', body: payload }));
  },
};
