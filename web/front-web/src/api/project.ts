import { config } from '../config';
import { mockProjectApi } from '../mock/project';
import api from './request';
import type {
  Project,
  ProjectCollaborationOverview,
  ProjectListParams,
  ProjectStep,
  ProjectStepSaveParams,
} from '../types/project';

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

  createCollaborationLink: (id: string, options?: { expiresInHours?: number; maxUses?: number }): Promise<{ id: string; token: string; path: string; expiresAt: string }> =>
    api.post(`/projects/${id}/collaboration-links`, options || { expiresInHours: 168 }),

  joinCollaboration: (token: string): Promise<{ projectId: string }> => api.post(`/project-collaboration/${token}/join`),

  getCollaboration: (id: string): Promise<ProjectCollaborationOverview> =>
    api.get(`/projects/${id}/collaboration`),

  revokeCollaborationLink: (projectId: string, linkId: string): Promise<void> =>
    api.delete(`/projects/${projectId}/collaboration-links/${linkId}`),

  removeCollaborator: (projectId: string, userId: string): Promise<void> =>
    api.delete(`/projects/${projectId}/collaborators/${userId}`),

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
