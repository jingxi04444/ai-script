import { config } from '../config';
import { mockStoryboardApi } from '../mock/storyboard';
import api from './request';
import type { Storyboard } from '../types/storyboard';

export const storyboardApi = {
  getByScriptId: (scriptId: string): Promise<Storyboard> => {
    if (config.useMock) return mockStoryboardApi.getByScriptId(scriptId);
    return api.get('/storyboards', { params: { scriptId } });
  },

  getById: (id: string): Promise<Storyboard> => {
    if (config.useMock) return mockStoryboardApi.getById(id);
    return api.get(`/storyboards/${id}`);
  },

  update: (id: string, data: Partial<Storyboard>): Promise<Storyboard> => {
    if (config.useMock) return mockStoryboardApi.update(id, data);
    return api.put(`/storyboards/${id}`, data);
  },

  export: (id: string): Promise<Blob> => {
    if (config.useMock) return mockStoryboardApi.export(id);
    return api.get(`/storyboards/${id}/export`, { responseType: 'blob' });
  },
};
