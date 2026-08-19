import { config } from '../config';
import { mockScriptApi } from '../mock/script';
import api from './request';
import type { Script, ScriptAccess, ScriptFormatOption, ScriptPolishMessage, ScriptReviewComment, ScriptReviewContext, ScriptTemplate, ScriptVersion, ShareLinkResult, GenerateScriptParams, PolishScriptParams, PolishScriptResult } from '../types/script';
import type { PaginatedResponse } from '../types/api';
import type { ScriptQueueItem, ScriptQueueState } from '../types/generation';

export interface ScriptPageParams {
  projectId: string;
  page: number;
  pageSize: number;
  keyword?: string;
  type?: string;
  status?: string;
  sortBy?: 'updated' | 'product';
}

export const scriptApi = {
  getList: (projectId: string): Promise<Script[]> => {
    if (config.useMock) return mockScriptApi.getList(projectId);
    return api.get('/scripts', { params: { projectId } });
  },

  getPage: async (params: ScriptPageParams): Promise<PaginatedResponse<Script>> => {
    if (config.useMock) {
      const scripts = await mockScriptApi.getList(params.projectId);
      const types = params.type?.split(',').filter(Boolean) || [];
      const keyword = params.keyword?.trim().toLowerCase();
      const filtered = scripts.filter((script) =>
        (!keyword || script.name.toLowerCase().includes(keyword))
        && (!types.length || types.includes(script.type))
        && (!params.status || script.status === params.status)
      );
      if (params.sortBy === 'product') {
        filtered.sort((a, b) => {
          const briefA = a.briefId || '\uffff';
          const briefB = b.briefId || '\uffff';
          return briefA.localeCompare(briefB, 'zh-CN', { numeric: true }) || b.updatedAt.localeCompare(a.updatedAt);
        });
      }
      const start = (params.page - 1) * params.pageSize;
      return {
        list: filtered.slice(start, start + params.pageSize),
        total: filtered.length,
        page: params.page,
        pageSize: params.pageSize,
        pages: Math.ceil(filtered.length / params.pageSize),
      };
    }
    return api.get('/scripts/page', { params });
  },

  mineList: (): Promise<Script[]> => {
    if (config.useMock) return mockScriptApi.getList('project-1');
    return api.get('/scripts/mine');
  },

  getById: (id: string): Promise<Script> => {
    if (config.useMock) return mockScriptApi.getById(id);
    return api.get(`/scripts/${id}`);
  },

  getAccess: (id: string): Promise<ScriptAccess> => api.get(`/scripts/${id}/access`),

  createReviewLink: (id: string, options?: { expiresInHours?: number; maxUses?: number; versionScope?: 'all' | 'current' }): Promise<ShareLinkResult> =>
    api.post(`/scripts/${id}/review-links`, options || { expiresInHours: 168, versionScope: 'all' }),

  getReviewContext: (token: string): Promise<ScriptReviewContext> => api.get(`/script-reviews/${token}`),

  getReviewComments: (id: string): Promise<ScriptReviewComment[]> => api.get(`/scripts/${id}/review-comments`),

  addInternalReviewComment: (id: string, data: { content: string; parentId?: string; versionId?: string; rowIndex?: number; columnKey?: string }): Promise<ScriptReviewComment> =>
    api.post(`/scripts/${id}/review-comments`, data),

  addReviewComment: (token: string, data: { content: string; parentId?: string; versionId?: string; rowIndex?: number; columnKey?: string }): Promise<ScriptReviewComment> =>
    api.post(`/script-reviews/${token}/comments`, data),

  updateReviewComment: (id: string, content: string): Promise<ScriptReviewComment> =>
    api.put(`/script-review-comments/${id}`, { content }),

  deleteReviewComment: (id: string): Promise<void> => api.delete(`/script-review-comments/${id}`),

  submitReviewDecision: (token: string, data: { decision: 'approved' | 'changes_requested'; opinion?: string; versionId?: string }): Promise<void> =>
    api.post(`/script-reviews/${token}/decision`, data),

  generate: (params: GenerateScriptParams): Promise<Script> => {
    if (config.useMock) return mockScriptApi.generate(params);
    return api.post('/scripts/generate', params, { timeout: 180000 });
  },

  enqueueGeneration: (params: GenerateScriptParams): Promise<ScriptQueueItem> =>
    api.post('/scripts/generation-queue', params),

  getGenerationQueue: (): Promise<ScriptQueueState> =>
    api.get('/scripts/generation-queue'),

  updateGenerationConcurrency: (concurrency: number): Promise<ScriptQueueState> =>
    api.put('/scripts/generation-queue/concurrency', { concurrency }),

  cancelGeneration: (id: string): Promise<void> =>
    api.delete(`/scripts/generation-queue/${id}`),

  update: (id: string, data: Partial<Script>): Promise<Script> => {
    if (config.useMock) return mockScriptApi.update(id, data);
    return api.put(`/scripts/${id}`, data);
  },

  polish: (id: string, params: PolishScriptParams): Promise<PolishScriptResult> => {
    if (config.useMock) return mockScriptApi.polish(id, params);
    return api.post(`/scripts/${id}/polish`, params, { timeout: 180000 });
  },

  getPolishMessages: (id: string): Promise<ScriptPolishMessage[]> => {
    if (config.useMock) return Promise.resolve([]);
    return api.get(`/scripts/${id}/polish-messages`);
  },

  getVersions: (id: string): Promise<ScriptVersion[]> => {
    if (config.useMock) return mockScriptApi.getVersions(id);
    return api.get(`/scripts/${id}/versions`);
  },

  restoreVersion: (id: string, versionId: string): Promise<Script> => {
    if (config.useMock) return mockScriptApi.restoreVersion(id, versionId);
    return api.post(`/scripts/${id}/versions/${versionId}/restore`);
  },

  delete: (id: string): Promise<void> => {
    if (config.useMock) return mockScriptApi.delete(id);
    return api.delete(`/scripts/${id}`);
  },

  getTemplates: (): Promise<ScriptTemplate[]> => {
    if (config.useMock) return mockScriptApi.getTemplates();
    return api.get('/scripts/templates');
  },

  getFormats: (): Promise<ScriptFormatOption[]> => {
    if (config.useMock) return Promise.resolve([]);
    return api.get('/script-formats');
  },
};
