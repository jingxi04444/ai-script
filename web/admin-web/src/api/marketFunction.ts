import api from './index';

export type MarketFunctionType = 'builtin' | 'external';

export interface MarketFunctionItem {
  id: string;
  code: string;
  title: string;
  summary: string;
  description?: string;
  badge?: string;
  icon: string;
  coverUrl?: string;
  featureType: MarketFunctionType;
  route: string;
  category?: string;
  tags: string[];
  sortOrder: number;
  status: number;
  updateTime?: string;
}

export type MarketFunctionPayload = Omit<MarketFunctionItem, 'id' | 'updateTime'>;

export const marketFunctionApi = {
  list: (): Promise<MarketFunctionItem[]> => api.get('/market-functions'),
  create: (data: MarketFunctionPayload): Promise<MarketFunctionItem> =>
    api.post('/market-functions', data),
  update: (id: string, data: MarketFunctionPayload): Promise<MarketFunctionItem> =>
    api.put(`/market-functions/${encodeURIComponent(id)}`, data),
  remove: (id: string): Promise<void> =>
    api.delete(`/market-functions/${encodeURIComponent(id)}`),
};
