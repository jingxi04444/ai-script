import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { Material, MaterialDownloadResult } from '../types/admin';

export const materialApi = {
  getMaterials() {
    return callApi<Material[]>(
      () => mockApi.getMaterials() as Promise<Material[]>,
      () => request<Material[]>('/api/admin/materials'),
    );
  },
  deleteMaterial(id: string) {
    return callApi<{ id: string; status: string }>(
      () => mockApi.deleteMaterial(id) as Promise<{ id: string; status: string }>,
      () => request<{ id: string; status: string }>(`/api/admin/materials/${id}`, { method: 'DELETE' }),
    );
  },
  downloadMaterial(id: string) {
    return callApi<MaterialDownloadResult>(
      () => mockApi.downloadMaterial(id) as Promise<MaterialDownloadResult>,
      () => request<MaterialDownloadResult>(`/api/admin/materials/${id}/download`, { method: 'POST' }),
    );
  },
};
