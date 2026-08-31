import api from './request';
import type { WorkflowMode, WorkflowRecord, WorkflowValidation } from '../types/workflow';

export const workflowApi = {
  get: (projectId: string, mode: WorkflowMode): Promise<WorkflowRecord | null> =>
    api.get(`/projects/${projectId}/workflow`, { params: { mode } }),

  save: (
    projectId: string,
    data: { name: string; mode: WorkflowMode; graphJson: string },
  ): Promise<WorkflowRecord> => api.put(`/projects/${projectId}/workflow`, data),

  validate: (projectId: string, graphJson: string): Promise<WorkflowValidation> =>
    api.post(`/projects/${projectId}/workflow/validate`, { graphJson }),
};
