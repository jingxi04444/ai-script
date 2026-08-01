import api, { type PageResult } from './index';

export interface MembershipSku {
  id: string;
  code: string;
  name: string;
  billingMode: string;
  periodUnit: string;
  periodCount: number;
  price: number;
  originalPrice?: number;
  refundDays: number;
  displayOrder?: number;
  status: number;
}

export interface MembershipBenefit {
  code: string;
  name: string;
  category: string;
  value: string;
  valueType: string;
  unit?: string;
  resetType: string;
  previewOnly: boolean;
  enabled: boolean;
  description?: string;
}

export interface MembershipPlan {
  id: string;
  code: string;
  name: string;
  level: number;
  free: boolean;
  description?: string;
  displayOrder?: number;
  status: number;
  price: number;
  periodDays: number;
  skus: MembershipSku[];
  benefits: MembershipBenefit[];
}

export interface AdminSubscription {
  id: string;
  userId: string;
  username?: string;
  account?: string;
  planId: string;
  planName?: string;
  skuId?: string;
  skuName?: string;
  status: string;
  autoRenew: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  pendingPlanName?: string;
  createTime?: string;
}

export interface RefundOrder {
  id: string;
  refundNo: string;
  paymentOrderNo: string;
  userId: string;
  refundAmount: number;
  refundReason?: string;
  provider?: string;
  providerStatus?: string;
  status: string;
  requestedTime?: string;
  reviewRemark?: string;
}

export const membershipApi = {
  getPlans: (): Promise<MembershipPlan[]> => api.get('/membership/plans'),
  updatePlan: (id: string, payload: { name: string; description?: string; price: number; periodDays: number; displayOrder?: number; status: number }): Promise<MembershipPlan> =>
    api.put(`/membership/plans/${id}`, payload),
  updateSku: (id: string, payload: Omit<MembershipSku, 'id' | 'code'> & { status: number }): Promise<MembershipPlan> =>
    api.put(`/membership/skus/${id}`, payload),
  updateBenefit: (planId: string, code: string, payload: { value: string; enabled: boolean }): Promise<MembershipPlan> =>
    api.put(`/membership/plans/${planId}/benefits/${encodeURIComponent(code)}`, payload),
  subscriptions: (params: { page: number; pageSize: number; keyword?: string; status?: string }): Promise<PageResult<AdminSubscription>> =>
    api.get('/membership/subscriptions', { params }),
  adjustPoints: (payload: { userId: string; changePoints: number; remark?: string }) =>
    api.post('/membership/points/adjust', payload),
  refunds: (params: { page: number; pageSize: number; keyword?: string; status?: string }): Promise<PageResult<RefundOrder>> =>
    api.get('/payments/refunds', { params }),
  reviewRefund: (refundNo: string, approved: boolean, remark?: string): Promise<RefundOrder> =>
    api.post(`/payments/refunds/${encodeURIComponent(refundNo)}/review`, { approved, remark }),
  refreshRefund: (refundNo: string): Promise<RefundOrder> =>
    api.post(`/payments/refunds/${encodeURIComponent(refundNo)}/refresh`),
};
