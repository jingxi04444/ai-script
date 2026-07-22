import api from './request';
import type {
  AbTest,
  AbTestPage,
  AbTestSaveParams,
  AbTestVariant,
  AbTestVariantSaveParams,
  AnalyticsMetric,
  AnalyticsMetricPage,
  AnalyticsMetricSaveParams,
  AnalyticsQueryParams,
  MonitorLink,
  MonitorLinkPage,
  MonitorLinkSaveParams,
} from '../types/analytics';

export const analyticsApi = {
  monitorLinks: (params?: AnalyticsQueryParams): Promise<MonitorLinkPage> =>
    api.get('/analytics/monitor-links', { params }),
  createMonitorLink: (data: MonitorLinkSaveParams): Promise<MonitorLink> =>
    api.post('/analytics/monitor-links', data),
  updateMonitorLink: (id: string, data: MonitorLinkSaveParams): Promise<MonitorLink> =>
    api.put(`/analytics/monitor-links/${id}`, data),

  metrics: (params?: AnalyticsQueryParams): Promise<AnalyticsMetricPage> =>
    api.get('/analytics/metrics', { params }),
  saveMetric: (data: AnalyticsMetricSaveParams): Promise<AnalyticsMetric> =>
    api.post('/analytics/metrics', data),

  abTests: (params?: AnalyticsQueryParams): Promise<AbTestPage> =>
    api.get('/analytics/ab-tests', { params }),
  createAbTest: (data: AbTestSaveParams): Promise<AbTest> =>
    api.post('/analytics/ab-tests', data),
  updateAbTest: (id: string, data: AbTestSaveParams): Promise<AbTest> =>
    api.put(`/analytics/ab-tests/${id}`, data),
  variants: (abTestId: string): Promise<AbTestVariant[]> =>
    api.get(`/analytics/ab-tests/${abTestId}/variants`),
  createVariant: (abTestId: string, data: AbTestVariantSaveParams): Promise<AbTestVariant> =>
    api.post(`/analytics/ab-tests/${abTestId}/variants`, data),
  updateVariant: (abTestId: string, variantId: string, data: AbTestVariantSaveParams): Promise<AbTestVariant> =>
    api.put(`/analytics/ab-tests/${abTestId}/variants/${variantId}`, data),
};
