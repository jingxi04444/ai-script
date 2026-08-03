import { config } from '../config';
import { mockBriefApi } from '../mock/brief';
import api from './request';
import type { Brief, BriefAssetLibrary, BriefDetectionReport, BriefEditRequest, BriefSharePack, BriefSharePermission, BriefShareResult } from '../types/brief';

const briefDetailRequests = new Map<string, Promise<Brief>>();

const getBriefById = (id: string): Promise<Brief> => {
  const pendingRequest = briefDetailRequests.get(id);
  if (pendingRequest) return pendingRequest;

  const request = config.useMock
    ? mockBriefApi.getById(id)
    : api.get(`/briefs/${id}`) as Promise<Brief>;
  briefDetailRequests.set(id, request);
  const clearRequest = () => {
    if (briefDetailRequests.get(id) === request) briefDetailRequests.delete(id);
  };
  request.then(clearRequest, clearRequest);
  return request;
};

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


  assetLibrary: async (): Promise<BriefAssetLibrary> => {
    if (!config.useMock) return api.get('/briefs/mine/assets');
    const briefs = await mockBriefApi.getList('project-1');
    const groups = new Map<string, Brief[]>();
    briefs.forEach((brief) => groups.set(brief.projectId, [...(groups.get(brief.projectId) || []), brief]));
    return {
      total: briefs.length,
      projects: Array.from(groups.entries()).map(([projectId, projectBriefs]) => ({
        projectId,
        projectName: `项目 ${projectId}`,
        briefs: projectBriefs.map((brief) => ({ ...brief, ownedByCurrentUser: true })),
      })),
    };
  },

  getById: getBriefById,

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

  createSharePack: (briefIds: string[], permission: BriefSharePermission): Promise<BriefSharePack> =>
    api.post('/briefs/share-packs', { briefIds: briefIds.map(Number), permission }),

  getSharePack: (token: string): Promise<BriefSharePack> =>
    api.get(`/briefs/share-pack/${token}`),

  linkSharePackToProject: (token: string, projectId: string, briefIds: string[]): Promise<Brief[]> =>
    api.post(`/briefs/share-pack/${token}/link`, { projectId: Number(projectId), briefIds: briefIds.map(Number) }),
  unlinkSharePackFromProject: (token: string, projectId: string, briefIds: string[]): Promise<void> =>
    api.post(`/briefs/share-pack/${token}/unlink`, { projectId: Number(projectId), briefIds: briefIds.map(Number) }),

  sharePackLinkedBriefIds: (token: string, projectId: string): Promise<string[]> =>
    api.get(`/briefs/share-pack/${token}/linked`, { params: { projectId } }),
  getSharePackBrief: (token: string, briefId: string): Promise<Brief> =>
    api.get(`/briefs/share-pack/${token}/briefs/${briefId}`),
  enableShare: (briefId: string, permission: BriefSharePermission): Promise<BriefShareResult> =>
    config.useMock ? mockBriefApi.enableShare(briefId, permission) : api.post(`/briefs/${briefId}/share`, { permission }),

  shareLinks: (briefId: string): Promise<BriefShareResult[]> =>
    config.useMock ? mockBriefApi.shareLinks(briefId) : api.get(`/briefs/${briefId}/share-links`),

  getByShareToken: (token: string): Promise<Brief> =>
    config.useMock ? mockBriefApi.getByShareToken(token) : api.get(`/briefs/share/${token}`),

  updateByShareToken: (token: string, projectId: string, data: Partial<Brief>): Promise<Brief> =>
    config.useMock
      ? mockBriefApi.updateByShareToken(token, projectId, data)
      : api.put(`/briefs/share/${token}`, data, { params: { projectId } }),

  requestEditByShareToken: (token: string, message?: string): Promise<BriefEditRequest> =>
    api.post(`/briefs/share/${token}/edit-requests`, { message }),

  editRequests: (briefId: string): Promise<BriefEditRequest[]> =>
    api.get(`/briefs/${briefId}/edit-requests`),

  approveEditRequest: (requestId: string): Promise<BriefEditRequest> =>
    api.post(`/briefs/edit-requests/${requestId}/approve`),

  rejectEditRequest: (requestId: string): Promise<BriefEditRequest> =>
    api.post(`/briefs/edit-requests/${requestId}/reject`),

  linkToProject: (briefId: string, projectId: string): Promise<Brief> =>
    config.useMock ? mockBriefApi.linkToProject(briefId, projectId) : api.post(`/briefs/${briefId}/link`, null, { params: { projectId } }),

  unlinkFromProject: (briefId: string, projectId: string): Promise<void> =>
    config.useMock
      ? mockBriefApi.unlinkFromProject(briefId, projectId)
      : api.delete(`/briefs/${briefId}/link`, { params: { projectId } }),

  detect: (briefId: string, data?: Partial<Brief>): Promise<BriefDetectionReport> => {
    if (config.useMock) return mockBriefApi.score(briefId);
    return api.post(`/briefs/${briefId}/ai/detect`, data || {}, { timeout: 180000 });
  },

  optimize: (briefId: string): Promise<BriefDetectionReport> => {
    if (config.useMock) return mockBriefApi.optimize(briefId);
    return api.post(`/briefs/${briefId}/ai/detect`, {}, { timeout: 180000 });
  },

  score: (briefId: string): Promise<BriefDetectionReport> => {
    if (config.useMock) return mockBriefApi.score(briefId);
    return api.post(`/briefs/${briefId}/ai/detect`, {}, { timeout: 180000 });
  },
};
