import api from './index';
import type { PageResult } from './index';

export interface Template {
  id: string;
  name: string;
  category?: string;
  actor?: string;
  people?: string;
  popularity?: string;
  difficulty?: string;
  paragraphStructure?: string;
  emotionTurningPoints?: string;
  firstFiveSecondsHook?: string;
  structureFormula?: string;
  scriptTemplateLibrary?: string;
  referenceUrl?: string;
  referenceDesc?: string;
  sortOrder?: number;
  status?: 'active' | 'disabled' | string;
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

  delete: (id: string): Promise<void> => {
    return api.delete(`/templates/${id}`);
  },
};
