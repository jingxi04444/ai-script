import api from './index';

export type MarketSourceStatus = 'unchecked' | 'valid' | 'check_failed' | 'invalid';

export interface MarketSourceConfig {
  id?: string;
  platform: 'douyin' | 'xiaohongshu';
  platformName: string;
  cookieConfigured: boolean;
  alertPhoneConfigured: boolean;
  maskedAlertPhone?: string;
  enabled: boolean;
  alertEnabled: boolean;
  cookieStatus: MarketSourceStatus;
  consecutiveFailures: number;
  lastErrorMessage?: string;
  lastCheckedAt?: string;
  lastValidAt?: string;
  lastAlertAt?: string;
}

export interface MarketSourceSavePayload {
  cookie?: string;
  alertPhone?: string;
  enabled: boolean;
  alertEnabled: boolean;
}

export const marketSourceApi = {
  list: (): Promise<MarketSourceConfig[]> => api.get('/market-sources'),
  save: (platform: string, data: MarketSourceSavePayload): Promise<MarketSourceConfig> =>
    api.put(`/market-sources/${encodeURIComponent(platform)}`, data),
  validate: (platform: string): Promise<MarketSourceConfig> =>
    api.post(`/market-sources/${encodeURIComponent(platform)}/validate`),
};
