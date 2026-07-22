import { config } from '../config';
import { mockScriptApi } from '../mock/script';
import api from './request';
import type { Script, ScriptFormatOption, ScriptTemplate, GenerateScriptParams, PolishScriptParams, PolishScriptResult } from '../types/script';

export const scriptApi = {
  getList: (projectId: string): Promise<Script[]> => {
    if (config.useMock) return mockScriptApi.getList(projectId);
    return api.get('/scripts', { params: { projectId } });
  },

  mineList: (): Promise<Script[]> => {
    if (config.useMock) return mockScriptApi.getList('project-1');
    return api.get('/scripts/mine');
  },

  getById: (id: string): Promise<Script> => {
    if (config.useMock) return mockScriptApi.getById(id);
    return api.get(`/scripts/${id}`);
  },

  generate: (params: GenerateScriptParams): Promise<Script> => {
    if (config.useMock) return mockScriptApi.generate(params);
    return api.post('/scripts/generate', params, { timeout: 120000 });
  },

  update: (id: string, data: Partial<Script>): Promise<Script> => {
    if (config.useMock) return mockScriptApi.update(id, data);
    return api.put(`/scripts/${id}`, data);
  },

  polish: (id: string, params: PolishScriptParams): Promise<PolishScriptResult> => {
    if (config.useMock) return mockScriptApi.polish(id, params);
    return api.post(`/scripts/${id}/polish`, params, { timeout: 120000 });
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
