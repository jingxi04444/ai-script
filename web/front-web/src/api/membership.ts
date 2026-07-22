import api from './request';
import type { MembershipPlan, UserMembership } from '../types/membership';

export const membershipApi = {
  plans: (): Promise<MembershipPlan[]> => api.get('/membership/plans'),
  current: (): Promise<UserMembership> => api.get('/membership/current'),
};
