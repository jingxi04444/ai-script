import api from './request';
import type { PaginatedResponse } from '../types/api';
import type {
  MemberOrderParams,
  PaymentOrder,
  PaymentOrderListParams,
  Quota,
  RefundOrder,
  RefundOrderListParams,
  RefundRequestParams,
} from '../types/payment';

export const paymentApi = {
  pointOrder: (params: { amount: number; payMethod: string; idempotencyKey: string }): Promise<PaymentOrder> =>
    api.post('/payments/point-orders', params),

  memberOrder: (params: MemberOrderParams): Promise<PaymentOrder> =>
    api.post('/payments/member-orders', params),

  getOrder: (orderNo: string): Promise<PaymentOrder> =>
    api.get(`/payments/orders/${encodeURIComponent(orderNo)}`),

  orders: (params?: PaymentOrderListParams): Promise<PaginatedResponse<PaymentOrder>> =>
    api.get('/payments/orders', { params }),

  refunds: (params?: RefundOrderListParams): Promise<PaginatedResponse<RefundOrder>> =>
    api.get('/payments/refunds', { params }),

  requestRefund: (params: RefundRequestParams): Promise<RefundOrder> =>
    api.post('/payments/refunds', params),

  queryProviderOrder: (orderNo: string): Promise<PaymentOrder> =>
    api.post(`/payments/orders/${encodeURIComponent(orderNo)}/query-provider`),

  quotas: (): Promise<Quota[]> => api.get('/payments/quotas'),
};
