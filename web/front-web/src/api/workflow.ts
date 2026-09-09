import api from './request';
import { config } from '../config';
import type { WorkflowMode, WorkflowModelOption, WorkflowRecord, WorkflowRun, WorkflowRunEvent, WorkflowValidation } from '../types/workflow';
import { TOKEN_KEY } from '../utils/storage';

const readWorkflowEventStream = async (
  response: Response,
  onEvent: (event: WorkflowRunEvent) => void,
) => {
  if (!response.ok || !response.body) throw new Error(`工作流事件连接失败：${response.status}`);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let streamDone = false;
  while (!streamDone) {
    const { done, value } = await reader.read();
    streamDone = done;
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() || '';
    frames.forEach((frame) => {
      const payload = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n');
      if (!payload) return;
      onEvent(JSON.parse(payload) as WorkflowRunEvent);
    });
  }
};

export const workflowApi = {
  get: (projectId: string, mode: WorkflowMode): Promise<WorkflowRecord | null> =>
    api.get(`/projects/${projectId}/workflow`, { params: { mode } }),

  save: (
    projectId: string,
    data: { name: string; mode: WorkflowMode; graphJson: string },
  ): Promise<WorkflowRecord> => api.put(`/projects/${projectId}/workflow`, data),

  validate: (projectId: string, graphJson: string): Promise<WorkflowValidation> =>
    api.post(`/projects/${projectId}/workflow/validate`, { graphJson }),

  getModels: (): Promise<WorkflowModelOption[]> => api.get('/workflow/models'),

  startRun: (
    projectId: string,
    data: {
      workflowId?: string;
      workflowVersion?: number;
      mode: WorkflowMode;
      graphJson: string;
      idempotencyKey: string;
      inputJson?: string;
    },
  ): Promise<WorkflowRun> => api.post(`/projects/${projectId}/workflow/runs`, data),

  getRun: (projectId: string, runId: string): Promise<WorkflowRun> =>
    api.get(`/projects/${projectId}/workflow/runs/${runId}`),

  cancelRun: (projectId: string, runId: string): Promise<WorkflowRun> =>
    api.post(`/projects/${projectId}/workflow/runs/${runId}/cancel`),

  retryRun: (projectId: string, runId: string): Promise<WorkflowRun> =>
    api.post(`/projects/${projectId}/workflow/runs/${runId}/retry`),

  subscribeToRunEvents: async (
    projectId: string,
    runId: string,
    onEvent: (event: WorkflowRunEvent) => void,
    signal?: AbortSignal,
  ): Promise<void> => {
    const token = localStorage.getItem(TOKEN_KEY);
    const response = await fetch(`${config.apiBaseUrl}/projects/${projectId}/workflow/runs/${runId}/events`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      signal,
    });
    await readWorkflowEventStream(response, onEvent);
  },
};
