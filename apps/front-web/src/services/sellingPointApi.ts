import { readStoredSession } from '../app/session';
import { API_BASE_URL, USE_MOCK_API, callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { ActiveBriefVersionResult, BriefScoreResult, BriefVersion, CompareBriefResult, OptimizeBriefResult, ProductBriefInput, ProjectBriefStore, SellingAsset, SellingAssetDetail } from '../types/sellingPoint';

export const sellingPointApi = {
  getSellingAssets() {
    return callApi<SellingAsset[]>(() => mockApi.getSellingAssets() as Promise<SellingAsset[]>, () => request<SellingAsset[]>('/api/selling-point-assets'));
  },
  getSellingAssetDetail(id: string) {
    return callApi<SellingAssetDetail>(() => mockApi.getSellingAssetDetail(id) as Promise<SellingAssetDetail>, () => request<SellingAssetDetail>(`/api/selling-point-assets/${id}`));
  },
  optimizeBrief(payload: ProductBriefInput) {
    return callApi<OptimizeBriefResult>(() => mockApi.optimizeBrief(payload) as Promise<OptimizeBriefResult>, () => request<OptimizeBriefResult>('/api/product-brief/optimize', { method: 'POST', body: payload }));
  },
  compareBrief(current: ProductBriefInput, baseline: ProductBriefInput, context?: { briefName?: string; baselineVersion?: string; currentVersion?: string }) {
    return callApi<CompareBriefResult>(() => mockApi.compareBrief(current, baseline, context) as Promise<CompareBriefResult>, () => request<CompareBriefResult>('/api/product-brief/compare', { method: 'POST', body: { current, baseline, context } }));
  },
  scoreBrief(payload: ProductBriefInput, context?: { briefName?: string; version?: string }) {
    return callApi<BriefScoreResult>(() => mockApi.scoreBrief(payload, context) as Promise<BriefScoreResult>, () => request<BriefScoreResult>('/api/product-brief/score', { method: 'POST', body: { brief: payload, context } }));
  },

  getProjectBriefStore(projectId: string) {
    return callApi<ProjectBriefStore>(
      () => mockApi.getProjectBriefStore(projectId) as Promise<ProjectBriefStore>,
      () => request<ProjectBriefStore>(`/api/projects/${projectId}/brief-store`),
    );
  },
  createBrief(projectId: string, name: string) {
    return callApi<ProjectBriefStore>(
      () => mockApi.createBrief(projectId, { name }) as Promise<ProjectBriefStore>,
      () => request<ProjectBriefStore>(`/api/projects/${projectId}/briefs`, { method: 'POST', body: { name } }),
    );
  },
  importBriefs(projectId: string, file: File) {
    if (USE_MOCK_API) return mockApi.importBriefs(projectId, file) as Promise<{ imported: number; created: number; versioned: number; store: ProjectBriefStore }>;
    const formData = new FormData();
    formData.append('file', file);
    const token = readStoredSession()?.token;
    return fetch(`${API_BASE_URL}/api/projects/${projectId}/briefs/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    }).then((response) => {
      if (!response.ok) throw new Error(`API ${response.status}: /api/projects/${projectId}/briefs/import`);
      return response.json() as Promise<{ imported: number; created: number; versioned: number; store: ProjectBriefStore }>;
    });
  },
  createBriefVersion(projectId: string, briefId: string, label: string, seed: 'copy' | 'blank' = 'copy') {
    return callApi<ProjectBriefStore>(
      () => mockApi.createBriefVersion(projectId, { briefId, label, seed }) as Promise<ProjectBriefStore>,
      () => request<ProjectBriefStore>(`/api/projects/${projectId}/briefs/${briefId}/versions`, { method: 'POST', body: { label, seed } }),
    );
  },
  getBriefVersions(projectId: string, briefId: string) {
    return callApi<BriefVersion[]>(
      () => mockApi.getBriefVersions(projectId, briefId) as Promise<BriefVersion[]>,
      () => request<BriefVersion[]>(`/api/projects/${projectId}/briefs/${briefId}/versions`),
    );
  },
  setActiveBrief(projectId: string, briefId: string) {
    return callApi<ProjectBriefStore>(
      () => mockApi.setActiveBrief(projectId, { briefId }) as Promise<ProjectBriefStore>,
      () => request<ProjectBriefStore>(`/api/projects/${projectId}/briefs/active`, { method: 'PATCH', body: { briefId } }),
    );
  },
  setActiveVersion(projectId: string, briefId: string, versionId: string) {
    return callApi<ActiveBriefVersionResult>(
      () => mockApi.setActiveVersion(projectId, { briefId, versionId }) as Promise<ActiveBriefVersionResult>,
      () => request<ActiveBriefVersionResult>(`/api/projects/${projectId}/briefs/${briefId}/versions/active`, { method: 'PATCH', body: { briefId, versionId } }),
    );
  },
  saveBriefVersion(projectId: string, briefId: string, versionId: string, data: Record<string, unknown>, score: number = 0) {
    return callApi<{ projectId: string; briefId: string; versionId: string; savedAt: string }>(
      () => mockApi.saveBriefVersion(projectId, { briefId, versionId, data, score }) as Promise<{ projectId: string; briefId: string; versionId: string; savedAt: string }>,
      () => request<{ projectId: string; briefId: string; versionId: string; savedAt: string }>(
        `/api/projects/${projectId}/briefs/${briefId}/versions/${versionId}`,
        { method: 'PATCH', body: { data, score } },
      ),
    );
  },
};
