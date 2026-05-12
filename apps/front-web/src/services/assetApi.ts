import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { Asset, LibraryAsset, LibraryAssetDetail, LibraryType } from '../types/asset';

export const assetApi = {
  getAssets() {
    return callApi<Asset[]>(() => mockApi.getAssets() as Promise<Asset[]>, () => request<Asset[]>('/api/assets'));
  },
  getLibraryAssets() {
    return callApi<LibraryAsset[]>(() => mockApi.getLibraryAssets() as Promise<LibraryAsset[]>, () => request<LibraryAsset[]>('/api/asset-library'));
  },
  getLibraryAssetDetail(library: LibraryType, id: string) {
    return callApi<LibraryAssetDetail>(() => mockApi.getLibraryAssetDetail(library, id) as Promise<LibraryAssetDetail>, () => request<LibraryAssetDetail>(`/api/asset-library/${library}/${id}`));
  },
};
