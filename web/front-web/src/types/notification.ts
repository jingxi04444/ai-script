import type { PaginatedResponse, PaginationParams } from './api';

export interface Notification {
  id: string;
  userId?: string;
  channel?: string;
  bizType?: string;
  bizId?: string;
  targetProjectId?: string;
  targetScriptId?: string;
  title: string;
  content?: string;
  status?: number;
  readTime?: string;
  createTime?: string;
}

export interface NotificationQueryParams extends PaginationParams {
  status?: string;
  keyword?: string;
}

export type NotificationPage = PaginatedResponse<Notification>;
