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

export const siteApi = {
  getConfig: (): Promise<SiteConfig> => api.get('/site-config'),
  getHomeBanners: (): Promise<HomeBanner[]> => api.get('/home-banners'),
};
