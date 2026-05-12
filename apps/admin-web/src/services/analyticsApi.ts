import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { AnalyticsData } from '../types/admin';

export const analyticsApi = {
  getAnalytics() {
    return callApi<AnalyticsData>(
      () => mockApi.getAnalytics() as Promise<AnalyticsData>,
      () => request<AnalyticsData>('/api/admin/analytics/summary'),
    );
  },
};
