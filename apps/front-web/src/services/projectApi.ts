import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { Project } from '../types/project';

export const projectApi = {
  getProjects() {
    return callApi<Project[]>(() => mockApi.getProjects() as Promise<Project[]>, () => request<Project[]>('/api/projects'));
  },
  createProject() {
    return callApi<Project>(() => mockApi.createProject() as Promise<Project>, () => request<Project>('/api/projects', { method: 'POST' }));
  },
  getProject(projectId: string) {
    return callApi<Project>(() => mockApi.getProject(projectId) as Promise<Project>, () => request<Project>(`/api/projects/${projectId}`));
  },
  updateProject(projectId: string, patch: Partial<Pick<Project, 'title' | 'product'>>) {
    return callApi<Project>(() => mockApi.updateProject(projectId, patch) as Promise<Project>, () => request<Project>(`/api/projects/${projectId}`, { method: 'PATCH', body: patch }));
  },
};
