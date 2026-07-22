import type { PaginatedResponse, PaginationParams } from './api';

export interface MonitorLink {
  id: string;
  projectId?: string;
  scriptId?: string;
  linkType?: string;
  variantName?: string;
  url?: string;
  status?: number;
  createdAt?: string;
}

export interface MonitorLinkSaveParams {
  projectId: string;
  scriptId?: string;
  linkType?: string;
  variantName?: string;
  url: string;
  status?: number;
}

export interface AnalyticsMetric {
  id: string;
  projectId?: string;
  scriptId?: string;
  monitorLinkId?: string;
  source?: string;
  metricDate?: string;
  plays?: number;
  likes?: number;
  comments?: number;
  favorites?: number;
  shares?: number;
  orders?: number;
  revenue?: number;
  roi?: number;
  createdAt?: string;
}

export interface AnalyticsMetricSaveParams extends Omit<AnalyticsMetric, 'id' | 'createdAt'> {}

export interface AbTest {
  id: string;
  projectId?: string;
  testName?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AbTestSaveParams {
  projectId: string;
  testName: string;
  status?: string;
  startTime?: string;
  endTime?: string;
}

export interface AbTestVariant {
  id: string;
  abTestId?: string;
  scriptId?: string;
  variantName?: string;
  monitorLinkId?: string;
  plays?: number;
  interactionRate?: number;
  conversionRate?: number;
  isWinner?: number;
  createdAt?: string;
}

export interface AbTestVariantSaveParams {
  scriptId?: string;
  variantName: string;
  monitorLinkId?: string;
  plays?: number;
  interactionRate?: number;
  conversionRate?: number;
  isWinner?: number;
}

export interface AnalyticsQueryParams extends PaginationParams {
  projectId?: string;
  keyword?: string;
}

export type MonitorLinkPage = PaginatedResponse<MonitorLink>;
export type AnalyticsMetricPage = PaginatedResponse<AnalyticsMetric>;
export type AbTestPage = PaginatedResponse<AbTest>;
