import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { ProjectStepState, SaveStepPayload, SaveStepResult, UploadFilePayload, UploadFileResult } from '../types/workflow';

export const workflowApi = {
  saveStep(payload: SaveStepPayload) {
    return callApi<SaveStepResult>(() => mockApi.saveStep(payload) as Promise<SaveStepResult>, () => request<SaveStepResult>(`/api/projects/${payload.projectId}/step`, { method: 'PATCH', body: payload }));
  },
  getStep<T = unknown>(projectId: string, step: string) {
    return callApi<ProjectStepState<T>>(() => mockApi.getStep(projectId, step) as Promise<ProjectStepState<T>>, () => request<ProjectStepState<T>>(`/api/projects/${projectId}/steps/${step}`));
  },
  uploadFile(payload: UploadFilePayload) {
    return callApi<UploadFileResult>(() => mockApi.uploadFile(payload) as Promise<UploadFileResult>, () => request<UploadFileResult>('/api/files', { method: 'POST', body: payload }));
  },
};
