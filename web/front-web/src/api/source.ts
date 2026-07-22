import { config } from '../config';
import { mockSourceApi } from '../mock/source';
import api from './request';
import type { SourceAnalysis } from '../types/source';

type ParseParams = { projectId: string; url: string; mode?: 'simple' | 'deep' };
type AnalyzeCopyParams = { projectId: string; copy: string; mode: 'simple' | 'deep' };

export const sourceApi = {
  list: (projectId: string): Promise<SourceAnalysis[]> =>
    api.get('/source-analysis', { params: { projectId } }),

  parseShareUrl: (params: ParseParams): Promise<SourceAnalysis> =>
    api.post('/video/share-url/parse', params),

  createParseTask: (params: ParseParams): Promise<SourceAnalysis> => {
    if (config.useMock) return mockSourceApi.createParseTask(params);
    return api.post('/video/share-url/parse-tasks', params, { timeout: 300000 });
  },

  extractCopy: (params: { projectId: string; videoUrl?: string; text?: string }): Promise<SourceAnalysis> =>
    api.post('/script-generator/extract-copy', params),

  analyzeCopy: (params: AnalyzeCopyParams): Promise<SourceAnalysis> => {
    if (config.useMock) return mockSourceApi.analyzeCopy(params);
    return api.post('/script-generator/analyze-copy', params, { timeout: 300000 });
  },
};
