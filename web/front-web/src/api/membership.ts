import api from './request';
import type { PaginatedResponse, PaginationParams } from '../types/api';
import type {
  DailyPointReward,
  MembershipChangeQuote,
  MembershipPlan,
  MembershipPurchaseMode,
  PointAccount,
  PointOperationCosts,
  PointPackage,
  PointTransaction,
  UserMembership,
  TemplateCustomRequest,
} from '../types/membership';

export const membershipApi = {
  plans: (): Promise<MembershipPlan[]> => api.get('/membership/plans'),
  purchaseModes: (): Promise<MembershipPurchaseMode[]> => api.get('/membership/purchase-modes'),
  pointPackages: (): Promise<PointPackage[]> => api.get('/membership/point-packages'),
  current: (): Promise<UserMembership | null> => api.get('/membership/current'),
  activateFreeTrial: (skuId: string): Promise<UserMembership> => api.post('/membership/free-trial/activate', { skuId }),
  quote: (skuId: string): Promise<MembershipChangeQuote> =>
    api.get('/membership/subscription/quote', { params: { skuId } }),
  scheduleDowngrade: (skuId: string): Promise<UserMembership> =>
    api.post('/membership/subscription/downgrade', { skuId }),
  revokeDowngrade: (): Promise<UserMembership> =>
    api.post('/membership/subscription/downgrade/revoke'),
  cancelRenewal: (): Promise<UserMembership> =>
    api.post('/membership/subscription/cancel-renewal'),
  points: (): Promise<PointAccount> => api.get('/membership/points'),
  pointOperationCosts: (): Promise<PointOperationCosts> => api.get('/membership/points/costs'),
  pointTransactions: (params?: PaginationParams): Promise<PaginatedResponse<PointTransaction>> =>
    api.get('/membership/points/transactions', { params }),
  claimDailyReward: (): Promise<DailyPointReward> =>
    api.post('/membership/points/daily-reward'),
  templateCustomRequests: (params?: PaginationParams): Promise<PaginatedResponse<TemplateCustomRequest>> =>
    api.get('/membership/template-custom-requests', { params }),
  createTemplateCustomRequest: (payload: { title: string; requirements: string; contact?: string }): Promise<TemplateCustomRequest> =>
    api.post('/membership/template-custom-requests', payload),
};
