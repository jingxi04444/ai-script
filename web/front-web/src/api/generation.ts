import { config } from '../config';
import { mockTaskCenterApi } from '../mock/taskCenter';
import api from './request';
import type {
  DubbingAsset,
  DubbingCreateParams,
  ExportCreateParams,
  ExportJob,
  ExportJobPage,
  ExportQueryParams,
  GenerationTask,
  TimelineConfig,
  TimelineSaveParams,
  VideoGenerateParams,
  VideoSegment,
} from '../types/generation';

export const generationApi = {
  task: (id: string): Promise<GenerationTask> => api.get(`/tasks/${id}`),

  generateVideo: (data: VideoGenerateParams): Promise<VideoSegment> =>
    api.post('/generation/videos', data),

  createDubbing: (data: DubbingCreateParams): Promise<DubbingAsset> =>
    api.post('/generation/dubbing', data),

  getTimeline: (projectId: string): Promise<TimelineConfig> =>
    api.get(`/projects/${projectId}/timeline`),

  saveTimeline: (data: TimelineSaveParams): Promise<TimelineConfig> =>
    api.put('/projects/timeline', data),

  createExport: (data: ExportCreateParams): Promise<ExportJob> => {
    if (config.useMock) return mockTaskCenterApi.createExport(data);
    return api.post('/exports', data);
  },

  exports: (params?: ExportQueryParams): Promise<ExportJobPage> => {
    if (config.useMock) return mockTaskCenterApi.exports(params?.page, params?.pageSize);
    return api.get('/exports', { params });
  },

  retryExport: (id: string): Promise<ExportJob> => {
    if (config.useMock) return mockTaskCenterApi.retryExport(id);
    return api.post(`/exports/${id}/retry`);
  },

  cancelExport: (id: string): Promise<void> => {
    if (config.useMock) return mockTaskCenterApi.cancelExport(id);
    return api.delete(`/exports/${id}`);
  },
};
