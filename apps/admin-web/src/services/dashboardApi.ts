import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { DashboardOverview } from '../types/admin';

export const dashboardApi = {
  getOverview() {
    return callApi<DashboardOverview>(() => mockApi.getDashboardOverview() as Promise<DashboardOverview>, () => request<DashboardOverview>('/api/admin/dashboard/overview'));
  },
};
