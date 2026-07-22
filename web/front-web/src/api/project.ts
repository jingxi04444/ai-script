import { config } from '../config';
import { mockProjectApi } from '../mock/project';
import api from './request';
import type { Project, ProjectListParams, ProjectStep, ProjectStepSaveParams } from '../types/project';

export const projectApi = {
  getList: (params?: ProjectListParams): Promise<{ list: Project[]; total: number }> => {
    if (config.useMock) return mockProjectApi.getList(params);
    return api.get('/projects', { params });
  },

  getById: (id: string): Promise<Project> => {
    if (config.useMock) return mockProjectApi.getById(id);
    return api.get(`/projects/${id}`);
  },

  create: (data: Partial<Project>): Promise<Project> => {
    if (config.useMock) return mockProjectApi.create(data);
    return api.post('/projects', data);
  },

  update: (id: string, data: Partial<Project>): Promise<Project> => {
    if (config.useMock) return mockProjectApi.update(id, data);
    return api.put(`/projects/${id}`, data);
  },

  delete: (id: string): Promise<void> => {
    if (config.useMock) return mockProjectApi.delete(id);
    return api.delete(`/projects/${id}`);
  },

  steps: (projectId: string): Promise<ProjectStep[]> => api.get(`/projects/${projectId}/steps`),

  createStep: (projectId: string, data: ProjectStepSaveParams): Promise<ProjectStep> =>
    api.post(`/projects/${projectId}/steps`, data),

  updateStep: (projectId: string, id: string, data: ProjectStepSaveParams): Promise<ProjectStep> =>
    api.put(`/projects/${projectId}/steps/${id}`, data),

  completeStep: (projectId: string, id: string): Promise<ProjectStep> =>
    api.post(`/projects/${projectId}/steps/${id}/complete`),

  reopenStep: (projectId: string, id: string): Promise<ProjectStep> =>
    api.post(`/projects/${projectId}/steps/${id}/reopen`),
};
