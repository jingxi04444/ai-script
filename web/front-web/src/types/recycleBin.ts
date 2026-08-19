import type { PaginatedResponse } from './api';

export type RecycleResourceType = 'project' | 'brief' | 'script';

export interface RecycleBinItem {
  id: string;
  resourceType: RecycleResourceType;
  resourceId: string;
  resourceName: string;
  parentId?: string;
  retentionDays: number;
  remainingDays: number;
  deletedAt: string;
  expireAt: string;
}

export type RecycleBinPage = PaginatedResponse<RecycleBinItem>;

export interface RecycleBinSummary {
  total: number;
  projectCount: number;
  briefCount: number;
  scriptCount: number;
  retentionDays: number;
}
