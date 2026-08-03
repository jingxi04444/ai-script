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

export interface MembershipPurchaseMode {
  value: 'once_month' | 'once_quarter' | 'once_year';
  label: string;
  hint: string;
  badge?: string;
  enabled: boolean;
  displayOrder: number;
}

export interface MembershipPlanCreatePayload {
  code: string;
  name: string;
  level: number;
  free?: boolean;
  price: number;
  periodDays: number;
  description?: string;
  displayOrder?: number;
  status: number;
}

export type MembershipSkuCreatePayload = Omit<MembershipSku, 'id'>;

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

export interface PointPackage {
  id: string;
  code: string;
  name: string;
  price: number;
  points: number;
  description?: string;
  displayOrder?: number;
  status: number;
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

export interface TemplateCustomRequest {
  id: string;
  userId: string;
  planId: string;
  title: string;
  requirements: string;
  contact?: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  adminRemark?: string;
  handledBy?: string;
  handledTime?: string;
  createdAt?: string;
}

export const membershipApi = {
  getPlans: (): Promise<MembershipPlan[]> => api.get('/membership/plans'),
  purchaseModes: (): Promise<MembershipPurchaseMode[]> => api.get('/membership/purchase-modes'),
  updatePurchaseModes: (items: MembershipPurchaseMode[]): Promise<MembershipPurchaseMode[]> =>
    api.put('/membership/purchase-modes', { items }),
  createPlan: (payload: MembershipPlanCreatePayload): Promise<MembershipPlan> =>
    api.post('/membership/plans', payload),
  updatePlan: (id: string, payload: { name: string; description?: string; price: number; periodDays: number; displayOrder?: number; status: number }): Promise<MembershipPlan> =>
    api.put(`/membership/plans/${id}`, payload),
  createSku: (planId: string, payload: MembershipSkuCreatePayload): Promise<MembershipPlan> =>
    api.post(`/membership/plans/${planId}/skus`, payload),
  updateSku: (id: string, payload: Omit<MembershipSku, 'id' | 'code'> & { status: number }): Promise<MembershipPlan> =>
    api.put(`/membership/skus/${id}`, payload),
  createBenefit: (planId: string, payload: { code: string; value: string; enabled?: boolean }): Promise<MembershipPlan> =>
    api.post(`/membership/plans/${planId}/benefits`, payload),
  updateBenefit: (planId: string, code: string, payload: { value: string; enabled: boolean }): Promise<MembershipPlan> =>
    api.put(`/membership/plans/${planId}/benefits/${encodeURIComponent(code)}`, payload),
  subscriptions: (params: { page: number; pageSize: number; keyword?: string; status?: string }): Promise<PageResult<AdminSubscription>> =>
    api.get('/membership/subscriptions', { params }),
  adjustPoints: (payload: { userId: string; changePoints: number; remark?: string }) =>
    api.post('/membership/points/adjust', payload),
  pointPackages: (): Promise<PointPackage[]> => api.get('/membership/point-packages'),
  createPointPackage: (payload: Omit<PointPackage, 'id'>): Promise<PointPackage> =>
    api.post('/membership/point-packages', payload),
  updatePointPackage: (id: string, payload: Omit<PointPackage, 'id' | 'code'>): Promise<PointPackage> =>
    api.put(`/membership/point-packages/${id}`, payload),
  refunds: (params: { page: number; pageSize: number; keyword?: string; status?: string }): Promise<PageResult<RefundOrder>> =>
    api.get('/payments/refunds', { params }),
  reviewRefund: (refundNo: string, approved: boolean, remark?: string): Promise<RefundOrder> =>
    api.post(`/payments/refunds/${encodeURIComponent(refundNo)}/review`, { approved, remark }),
  refreshRefund: (refundNo: string): Promise<RefundOrder> =>
    api.post(`/payments/refunds/${encodeURIComponent(refundNo)}/refresh`),
  templateCustomRequests: (params: { page: number; pageSize: number; keyword?: string; status?: string }): Promise<PageResult<TemplateCustomRequest>> =>
    api.get('/membership/template-custom-requests', { params }),
  updateTemplateCustomRequest: (id: string, payload: { status: string; adminRemark?: string }): Promise<TemplateCustomRequest> =>
    api.put(`/membership/template-custom-requests/${id}`, payload),
};
