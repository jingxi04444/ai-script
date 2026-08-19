import { config } from '../config';
import { mockRecycleBinApi } from '../mock/recycleBin';
import api from './request';
import type { RecycleBinPage, RecycleBinSummary, RecycleResourceType } from '../types/recycleBin';

export interface RecycleBinListParams {
  page?: number;
  pageSize?: number;
  resourceType?: RecycleResourceType;
  keyword?: string;
}

export const recycleBinApi = {
  list: (params: RecycleBinListParams): Promise<RecycleBinPage> => {
    if (config.useMock) return mockRecycleBinApi.list(params);
    return api.get('/recycle-bin', { params });
  },

  summary: (): Promise<RecycleBinSummary> => {
    if (config.useMock) return mockRecycleBinApi.summary();
    return api.get('/recycle-bin/summary');
  },

  restore: (id: string): Promise<void> => {
    if (config.useMock) return mockRecycleBinApi.restore(id);
    return api.post(`/recycle-bin/${id}/restore`);
  },

  purge: (id: string): Promise<void> => {
    if (config.useMock) return mockRecycleBinApi.purge(id);
    return api.delete(`/recycle-bin/${id}`);
  },

  restoreBatch: (ids: string[]): Promise<void> => {
    if (config.useMock) return mockRecycleBinApi.restoreBatch(ids);
    return api.post('/recycle-bin/batch/restore', { ids });
  },

  purgeBatch: (ids: string[]): Promise<void> => {
    if (config.useMock) return mockRecycleBinApi.purgeBatch(ids);
    return api.post('/recycle-bin/batch/purge', { ids });
  },
};
