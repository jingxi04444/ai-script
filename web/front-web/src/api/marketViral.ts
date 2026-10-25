import { config } from '../config';
import { mockMarketViralApi } from '../mock/marketViral';
import type {
  MarketViralGenerationTask,
  MarketViralPage,
  MarketViralQuery,
  MarketViralRefreshParams,
  MarketViralRefreshTask,
} from '../types/marketViral';
import api from './request';

export const marketViralApi = {
  list: (query: MarketViralQuery, signal?: AbortSignal): Promise<MarketViralPage> => {
    if (config.useMock) return mockMarketViralApi.list(query);
    return api.get('/market/viral-videos', { params: query, signal });
  },
  refresh: (params: MarketViralRefreshParams): Promise<MarketViralRefreshTask> => {
    if (config.useMock) return mockMarketViralApi.refresh(params);
    return api.post('/market/viral-videos/refresh', params);
  },
  task: (id: string): Promise<MarketViralGenerationTask> => {
    if (config.useMock) return mockMarketViralApi.task(id);
    return api.get(`/tasks/${encodeURIComponent(id)}`);
  },
  favorite: (id: string): Promise<{ favorited: boolean }> => {
    if (config.useMock) return mockMarketViralApi.favorite(id);
    return api.post(`/market/viral-videos/${encodeURIComponent(id)}/favorite`);
  },
  simulateMockRefresh: (category: string) => mockMarketViralApi.simulateRefresh(category),
};
