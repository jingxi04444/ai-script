import { config } from '../config';
import { mockMarketFunctions } from '../mock/marketFunction';
import type { MarketFunction } from '../types/marketFunction';
import api from './request';

export const marketFunctionApi = {
  listPublished: async (signal?: AbortSignal): Promise<MarketFunction[]> => {
    if (config.useMock) {
      await new Promise((resolve) => window.setTimeout(resolve, 120));
      return mockMarketFunctions
        .filter((item) => item.status === 1)
        .sort((left, right) => left.sortOrder - right.sortOrder);
    }
    const result: MarketFunction[] = await api.get('/market/functions', { signal });
    return Array.isArray(result) ? result : [];
  },
};
