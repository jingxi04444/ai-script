import api from './request';
import type {
  Asset,
  AssetPage,
  AssetQueryParams,
  AssetSaveParams,
  FileUploadResult,
  SellingPointAsset,
  SellingPointAssetPage,
  SellingPointAssetSaveParams,
  ViralAsset,
  ViralAssetPage,
  ViralAssetSaveParams,
} from '../types/asset';
import type { PaginationParams } from '../types/api';

export const assetApi = {
  list: (params?: AssetQueryParams): Promise<AssetPage> => api.get('/assets', { params }),
  create: (data: AssetSaveParams): Promise<Asset> => api.post('/assets', data),
  update: (id: string, data: AssetSaveParams): Promise<Asset> => api.put(`/assets/${id}`, data),
  delete: (id: string): Promise<void> => api.delete(`/assets/${id}`),

  sellingPoints: (params?: PaginationParams): Promise<SellingPointAssetPage> =>
    api.get('/selling-point-assets', { params }),
  createSellingPoint: (data: SellingPointAssetSaveParams): Promise<SellingPointAsset> =>
    api.post('/selling-point-assets', data),
  updateSellingPoint: (id: string, data: SellingPointAssetSaveParams): Promise<SellingPointAsset> =>
    api.put(`/selling-point-assets/${id}`, data),
  deleteSellingPoint: (id: string): Promise<void> => api.delete(`/selling-point-assets/${id}`),

  viralAssets: (params?: PaginationParams & { kind?: string }): Promise<ViralAssetPage> =>
    api.get('/viral-assets', { params }),
  createViral: (data: ViralAssetSaveParams): Promise<ViralAsset> => api.post('/viral-assets', data),
  updateViral: (id: string, data: ViralAssetSaveParams): Promise<ViralAsset> =>
    api.put(`/viral-assets/${id}`, data),
  deleteViral: (id: string): Promise<void> => api.delete(`/viral-assets/${id}`),
};

export const fileApi = {
  upload: (file: File, folder = 'common'): Promise<FileUploadResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);
    return api.post('/files/upload', formData);
  },
};
