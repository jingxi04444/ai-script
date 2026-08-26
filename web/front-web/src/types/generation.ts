import type { PaginatedResponse, PaginationParams } from './api';

export interface GenerationTask {
  id: string;
  status: string;
  progress?: number;
  result?: string;
  errorMessage?: string;
}

export type ScriptQueueStatus = 'pending' | 'running' | 'success' | 'failed' | 'canceled';

export interface ScriptQueueItem {
  id: string;
  projectId: string;
  batchNo: string;
  scriptType: string;
  taskLabel: string;
  status: ScriptQueueStatus;
  scriptId?: string;
  errorMessage?: string;
  createdAt?: string;
  startTime?: string;
  finishTime?: string;
}

export interface ScriptQueueState {
  items: ScriptQueueItem[];
  pendingCount: number;
  runningCount: number;
  activeCount: number;
  concurrency: number;
  maxConcurrency: number;
  parallelConfigurable: boolean;
}

export interface VideoSegment {
  id: string;
  projectId: string;
  shotId?: string;
  taskId?: string;
  assetId?: string;
  status?: string;
  tagsJson?: string;
  durationSeconds?: number;
  createdAt?: string;
}

export interface VideoGenerateParams {
  projectId: string;
  shotId?: string;
  prompt?: string;
  tagsJson?: string;
  durationSeconds?: number;
}

export interface DubbingAsset {
  id: string;
  projectId: string;
  taskId?: string;
  assetId?: string;
  mode?: string;
  voice?: string;
  speed?: string;
  tone?: string;
  volume?: string;
  lipPrecision?: string;
  status?: string;
  createdAt?: string;
}

export interface DubbingCreateParams {
  projectId: string;
  text: string;
  mode?: string;
  voice?: string;
  speed?: string;
  tone?: string;
  volume?: string;
  lipPrecision?: string;
}

export interface TimelineConfig {
  id?: string;
  projectId: string;
  selectedClip?: string;
  transitionEffect?: string;
  backgroundMusicAssetId?: string;
  resolution?: string;
  configJson?: string;
  updatedAt?: string;
}

export interface TimelineSaveParams {
  projectId: string;
  selectedClip?: string;
  transitionEffect?: string;
  backgroundMusicAssetId?: string;
  resolution?: string;
  configJson?: string;
}

export interface ExportJob {
  id: string;
  projectId?: string;
  taskId?: string;
  exportType?: string;
  resolution?: string;
  fileName?: string;
  assetId?: string;
  status?: 'pending' | 'running' | 'success' | 'failed' | 'canceled' | 'expired';
  sourceCount?: number;
  progress?: number;
  fileSize?: number;
  errorMessage?: string;
  downloadUrl?: string;
  finishTime?: string;
  expireAt?: string;
  createdAt?: string;
}

export interface ExportCreateParams {
  projectId?: string;
  exportType: string;
  resolution?: string;
  fileName?: string;
  scriptIds?: string[];
}

export interface ExportQueryParams extends PaginationParams {
  projectId?: string;
  keyword?: string;
}

export type ExportJobPage = PaginatedResponse<ExportJob>;
