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
  homeVisualConfig?: string;
  scriptVisualConfig?: string;
  userAgreementConfig?: string;
  privacyPolicyConfig?: string;
  membershipServiceAgreementConfig?: string;
}

let siteConfigCache: SiteConfig | null = null;
let siteConfigRequest: Promise<SiteConfig> | null = null;

export const siteApi = {
  getCachedConfig: (): SiteConfig | null => siteConfigCache,
  getConfig: (options?: { force?: boolean }): Promise<SiteConfig> => {
    const force = Boolean(options?.force);
    if (!force && siteConfigCache) return Promise.resolve(siteConfigCache);
    if (!force && siteConfigRequest) return siteConfigRequest;

    const request = (api.get('/site-config', { params: force ? { _: Date.now() } : undefined }) as Promise<SiteConfig>)
      .then((config) => {
        siteConfigCache = config;
        return config;
      })
      .finally(() => {
        if (siteConfigRequest === request) siteConfigRequest = null;
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
