export type MarketFunctionType = 'builtin' | 'external';

export interface MarketFunction {
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
