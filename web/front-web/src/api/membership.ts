import api from './request';
import type { PaginatedResponse, PaginationParams } from '../types/api';
import type {
  DailyPointReward,
  MembershipChangeQuote,
  MembershipPlan,
  PointAccount,
  PointTransaction,
  UserMembership,
} from '../types/membership';

export const membershipApi = {
  plans: (): Promise<MembershipPlan[]> => api.get('/membership/plans'),
  current: (): Promise<UserMembership> => api.get('/membership/current'),
  quote: (skuId: string): Promise<MembershipChangeQuote> =>
    api.get('/membership/subscription/quote', { params: { skuId } }),
  scheduleDowngrade: (skuId: string): Promise<UserMembership> =>
    api.post('/membership/subscription/downgrade', { skuId }),
  revokeDowngrade: (): Promise<UserMembership> =>
    api.post('/membership/subscription/downgrade/revoke'),
  cancelRenewal: (): Promise<UserMembership> =>
    api.post('/membership/subscription/cancel-renewal'),
  points: (): Promise<PointAccount> => api.get('/membership/points'),
  pointTransactions: (params?: PaginationParams): Promise<PaginatedResponse<PointTransaction>> =>
    api.get('/membership/points/transactions', { params }),
  claimDailyReward: (): Promise<DailyPointReward> =>
    api.post('/membership/points/daily-reward'),
};
