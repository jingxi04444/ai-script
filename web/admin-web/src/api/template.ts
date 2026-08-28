import api from './index';
import type { PageResult } from './index';

export interface Template {
  id: string;
  name: string;
  category?: string;
  templateSource?: string;
  actor?: string;
  people?: string;
  popularity?: string;
  difficulty?: string;
  paragraphStructure?: string;
  emotionTurningPoints?: string;
  firstFiveSecondsHook?: string;
  structureFormula?: string;
  formulaExecutionChecklist?: string;
  scriptTemplateLibrary?: string;
  referenceUrl?: string;
  referenceDesc?: string;
  previewVideoUrl?: string;
  fullVideoUrl?: string;
  sortOrder?: number;
  status?: 'active' | 'disabled' | string;
  auditStatus?: 'draft' | 'running' | 'approved' | 'rejected';
  publishStatus?: 'online' | 'offline';
  locked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TemplateListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  category?: string;
}

export const templateApi = {
  getList: (params?: TemplateListParams): Promise<PageResult<Template>> => {
    return api.get('/templates', { params });
  },

  getById: (id: string): Promise<Template> => {
    return api.get(`/templates/${id}`);
  },

  create: (data: Partial<Template>): Promise<Template> => {
    return api.post('/templates', data);
  },

  update: (id: string, data: Partial<Template>): Promise<Template> => {
    return api.put(`/templates/${id}`, data);
  },

  updateState: (
    id: string,
    data: Pick<Partial<Template>, 'auditStatus' | 'publishStatus' | 'locked'>,
  ): Promise<Template> => {
    return api.put(`/templates/${id}/state`, data);
  },

  delete: (id: string): Promise<void> => {
    return api.delete(`/templates/${id}`);
  },
};
