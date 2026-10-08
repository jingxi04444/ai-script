import api from './request';
import type { ScenePlan, SceneSetting } from '../pages/Workspace/ScenePlanning/scenePlanning';

export interface SceneNoticeDraftRequest {
  perSceneCap: number;
  sceneCount: number;
  scenes: SceneSetting[];
  manualModels: Array<{ id: string; name: string; targetCount: number }>;
  aiImageCounts: Record<string, number>;
  rowNotes: Record<string, string>;
  shootDate: string;
  coordinator: string;
  photographer: string;
  actor: string;
}

export interface SceneNoticeRecord {
  id?: string;
  projectId: string;
  version?: number;
  draft: SceneNoticeDraftRequest;
  plan: ScenePlan;
  updatedAt?: string;
}

export const sceneNoticeApi = {
  get: (projectId: string): Promise<SceneNoticeRecord | null> => api.get(`/projects/${projectId}/scene-notice`),
  preview: (projectId: string, data: SceneNoticeDraftRequest): Promise<SceneNoticeRecord> =>
    api.post(`/projects/${projectId}/scene-notice/preview`, data),
  save: (projectId: string, data: SceneNoticeDraftRequest): Promise<SceneNoticeRecord> =>
    api.put(`/projects/${projectId}/scene-notice`, data),
};
