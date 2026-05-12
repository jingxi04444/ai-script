import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { OptimizeBriefResult, ProductBriefInput, SellingAsset, SellingAssetDetail } from '../types/sellingPoint';

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
};
