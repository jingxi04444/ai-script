import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { DashboardData } from '../types/admin';

export const dashboardApi = {
  getDashboard() {
    return callApi<DashboardData>(
      () => mockApi.getDashboard() as Promise<DashboardData>,
      () => request<DashboardData>('/api/admin/dashboard'),
    );
  },
};
