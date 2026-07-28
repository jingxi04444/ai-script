import api from './request';

export interface HomeBanner {
  id?: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  imageKey?: string;
  linkUrl?: string;
  sortOrder?: number;
  status?: number;
}

export interface SiteConfig {
  homeLogoUrl?: string;
  homeLogoKey?: string;
  viralSimpleAnalysisExample?: string;
  viralDeepAnalysisExample?: string;
  originalScenarioPrompts?: string;
}

let siteConfigCache: SiteConfig | null = null;
let siteConfigRequest: Promise<SiteConfig> | null = null;

export const siteApi = {
  getCachedConfig: (): SiteConfig | null => siteConfigCache,
  getConfig: (): Promise<SiteConfig> => {
    if (siteConfigCache) return Promise.resolve(siteConfigCache);
    if (siteConfigRequest) return siteConfigRequest;

    const request = (api.get('/site-config') as Promise<SiteConfig>)
      .then((config) => {
        siteConfigCache = config;
        return config;
      })
      .finally(() => {
        siteConfigRequest = null;
      });
    siteConfigRequest = request;
    return request;
  },
  clearConfigCache: () => {
    siteConfigCache = null;
    siteConfigRequest = null;
  },
  getHomeBanners: (): Promise<HomeBanner[]> => api.get('/home-banners'),
};
