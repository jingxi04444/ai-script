import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { ExportVideoResult, GenerationTask } from '../types/generation';

export const generationApi = {
  getTaskProgress() {
    return callApi<GenerationTask>(() => mockApi.getTaskProgress() as Promise<GenerationTask>, () => request<GenerationTask>('/api/generation/tasks/current'));
  },
  exportVideo() {
    return callApi<ExportVideoResult>(() => mockApi.exportVideo() as Promise<ExportVideoResult>, () => request<ExportVideoResult>('/api/projects/current/export', { method: 'POST' }));
  },
};
