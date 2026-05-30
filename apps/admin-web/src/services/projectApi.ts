import { callApi, request, withQuery } from './apiClient';
import { mockApi } from './mock.js';
import type { AdminProject, AdminProjectDetail, PagedResult, ProjectQuery } from '../types/admin';

export const projectApi = {
  getProjects(query: ProjectQuery = {}) {
    return callApi<PagedResult<AdminProject>>(() => mockApi.getProjects(query) as Promise<PagedResult<AdminProject>>, () => request<PagedResult<AdminProject>>(withQuery('/api/admin/projects', query)));
  },
  getProjectDetail(id: string) {
    return callApi<AdminProjectDetail>(() => mockApi.getProjectDetail(id) as Promise<AdminProjectDetail>, () => request<AdminProjectDetail>(`/api/admin/projects/${id}`));
  },
};
