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

  createExport: (data: ExportCreateParams): Promise<ExportJob> =>
    api.post('/exports', data),

  exports: (params?: ExportQueryParams): Promise<ExportJobPage> =>
    api.get('/exports', { params }),
};
