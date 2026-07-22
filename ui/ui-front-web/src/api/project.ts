import api from './index';

export interface Project {
  id: string;
  name: string;
  category?: string;
  status: 'active' | 'published' | 'review' | 'idle';
  briefCount: number;
  scriptCount: number;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
}

export const projectApi = {
  getList: (params?: ProjectListParams): Promise<{ list: Project[]; total: number }> => {
    return api.get('/projects', { params });
  },

  getById: (id: string): Promise<Project> => {
    return api.get(`/projects/${id}`);
  },

  create: (data: Partial<Project>): Promise<Project> => {
    return api.post('/projects', data);
  },

  update: (id: string, data: Partial<Project>): Promise<Project> => {
    return api.put(`/projects/${id}`, data);
  },

  delete: (id: string): Promise<void> => {
    return api.delete(`/projects/${id}`);
  },
};
