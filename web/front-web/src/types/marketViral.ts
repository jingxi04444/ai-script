import type { PaginatedResponse } from './api';
import type { GenerationTask } from './generation';

export type MarketViralPlatform = 'douyin' | 'xiaohongshu';

export interface MarketViralVideo {
  id: string;
  category: string;
  platform: MarketViralPlatform;
  externalId: string;
  title: string;
  authorName?: string;
  sourceUrl: string;
  coverUrl?: string;
  tags?: string;
  durationSeconds: number | null;
  likeCount: number;
  commentCount: number;
  collectCount: number;
  shareCount: number;
  publishedAt?: string;
  lastSeenAt?: string;
  discoveryQuery?: string;
  favorited?: boolean;
}

export interface MarketViralQuery {
  page: number;
  pageSize: number;
  category: string;
  platform?: MarketViralPlatform;
  keyword?: string;
  favoriteOnly?: boolean;
}

export interface MarketViralRefreshParams {
  category: string;
  platforms: MarketViralPlatform[];
  requestNo: string;
}

export interface MarketViralRefreshTask {
  taskId: string;
  status: string;
}

export type MarketViralPage = PaginatedResponse<MarketViralVideo>;
export type MarketViralGenerationTask = GenerationTask;
