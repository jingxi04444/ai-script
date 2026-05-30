import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { Project } from '../types/project';

export type CreateProjectParams = {
  title: string;
  announcement?: string;
};

export const projectApi = {
  getProjects() {
    return callApi<Project[]>(() => mockApi.getProjects() as Promise<Project[]>, () => request<Project[]>('/api/projects'));
  },
  createProject(params?: CreateProjectParams) {
    return callApi<Project>(() => mockApi.createProject(params) as Promise<Project>, () => request<Project>('/api/projects', { method: 'POST', body: params }));
  },
  getProject(projectId: string) {
    return callApi<Project>(() => mockApi.getProject(projectId) as Promise<Project>, () => request<Project>(`/api/projects/${projectId}`));
  },
  updateProject(projectId: string, patch: Partial<Pick<Project, 'title' | 'product' | 'announcement'>>) {
    return callApi<Project>(() => mockApi.updateProject(projectId, patch) as Promise<Project>, () => request<Project>(`/api/projects/${projectId}`, { method: 'PATCH', body: patch }));
  },
  uploadAvatar(projectId: string, file: File) {
    if (mockApi.uploadAvatar) {
      return mockApi.uploadAvatar(projectId, file) as Promise<{ avatarUrl: string }>;
    }
    const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false';
    if (USE_MOCK_API) {
      return Promise.resolve({ avatarUrl: `https://via.placeholder.com/120/1a3c2a/00D084?text=${encodeURIComponent(file.name)}` });
    }
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';
    const token = sessionStorage.getItem('token');
    const formData = new FormData();
    formData.append('file', file);
    return fetch(`${API_BASE_URL}/api/projects/${projectId}/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    }).then((r) => r.json() as Promise<{ avatarUrl: string }>);
  },
};
