import api from './index';
import type { PageResult } from './index';

export interface Project {
  id: string;
  name: string;
  userId?: string;
  username?: string;
  category?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  updateTime?: string;
  briefCount?: number;
  scriptCount?: number;
  videoCount?: number;
}

export interface ProjectListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}

export const projectApi = {
  getList: (params?: ProjectListParams): Promise<PageResult<Project>> => {
    return api.get('/projects', { params });
  },

  getById: (id: string): Promise<Project> => {
    return api.get(`/projects/${id}`);
  },

  delete: (id: string): Promise<void> => {
    return api.delete(`/projects/${id}`);
  },
};
