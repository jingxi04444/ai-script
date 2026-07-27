import { config } from '../config';
import { mockBriefApi } from '../mock/brief';
import api from './request';
import type { Brief, BriefDetectionReport, BriefEditRequest, BriefSharePermission, BriefShareResult } from '../types/brief';

export const briefApi = {
  getList: (projectId: string): Promise<Brief[]> => {
    if (config.useMock) return mockBriefApi.getList(projectId);
    return api.get('/briefs', { params: { projectId } });
  },

  sharedList: (keyword?: string): Promise<Brief[]> => {
    if (config.useMock) return mockBriefApi.getList('project-1');
    return api.get('/briefs/shared', { params: { keyword } });
  },

  mineList: (keyword?: string): Promise<Brief[]> => {
    if (config.useMock) return mockBriefApi.getList('project-1');
    return api.get('/briefs/mine', { params: { keyword } });
  },

  getById: (id: string): Promise<Brief> => {
    if (config.useMock) return mockBriefApi.getById(id);
    return api.get(`/briefs/${id}`);
  },

  create: (data: Partial<Brief>): Promise<Brief> => {
    if (config.useMock) return mockBriefApi.create(data);
    return api.post('/briefs', data);
  },

  update: (id: string, data: Partial<Brief>): Promise<Brief> => {
    if (config.useMock) return mockBriefApi.update(id, data);
    return api.put(`/briefs/${id}`, data);
  },

  delete: (id: string): Promise<void> => {
    if (config.useMock) return mockBriefApi.delete(id);
    return api.delete(`/briefs/${id}`);
  },

  import: (file: File, projectId: string): Promise<Brief[]> => {
    if (config.useMock) return mockBriefApi.import(file).then(() => mockBriefApi.getList(projectId));
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/briefs/import', formData, {
      params: { projectId },
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  downloadImportTemplate: async (): Promise<void> => {
    const response = await api.get('/briefs/import-template', { responseType: 'blob' }) as unknown;
    const blob = response instanceof Blob ? response : new Blob([response as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'selling-point-template.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  enableShare: (briefId: string, permission: BriefSharePermission): Promise<BriefShareResult> =>
    config.useMock ? mockBriefApi.enableShare(briefId, permission) : api.post(`/briefs/${briefId}/share`, { permission }),

  shareLinks: (briefId: string): Promise<BriefShareResult[]> =>
    config.useMock ? mockBriefApi.shareLinks(briefId) : api.get(`/briefs/${briefId}/share-links`),

  getByShareToken: (token: string): Promise<Brief> =>
    config.useMock ? mockBriefApi.getByShareToken(token) : api.get(`/briefs/share/${token}`),

  updateByShareToken: (token: string, data: Partial<Brief>): Promise<Brief> =>
    config.useMock ? mockBriefApi.updateByShareToken(token, data) : api.put(`/briefs/share/${token}`, data),

  requestEditByShareToken: (token: string, message?: string): Promise<BriefEditRequest> =>
    api.post(`/briefs/share/${token}/edit-requests`, { message }),

  editRequests: (briefId: string): Promise<BriefEditRequest[]> =>
    api.get(`/briefs/${briefId}/edit-requests`),

  approveEditRequest: (requestId: string): Promise<BriefEditRequest> =>
    api.post(`/briefs/edit-requests/${requestId}/approve`),

  rejectEditRequest: (requestId: string): Promise<BriefEditRequest> =>
    api.post(`/briefs/edit-requests/${requestId}/reject`),

  copyToProject: (briefId: string, projectId: string): Promise<Brief> =>
    config.useMock ? mockBriefApi.copyToProject(briefId, projectId) : api.post(`/briefs/${briefId}/copy`, null, { params: { projectId } }),

  detect: (briefId: string, data?: Partial<Brief>): Promise<BriefDetectionReport> => {
    if (config.useMock) return mockBriefApi.score(briefId);
    return api.post(`/briefs/${briefId}/ai/detect`, data || {}, { timeout: 120000 });
  },

  optimize: (briefId: string): Promise<BriefDetectionReport> => {
    if (config.useMock) return mockBriefApi.optimize(briefId);
    return api.post(`/briefs/${briefId}/ai/detect`, {}, { timeout: 120000 });
  },

  score: (briefId: string): Promise<BriefDetectionReport> => {
    if (config.useMock) return mockBriefApi.score(briefId);
    return api.post(`/briefs/${briefId}/ai/detect`, {}, { timeout: 120000 });
  },
};
