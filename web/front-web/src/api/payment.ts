import api from './request';
import type { PaginatedResponse, PaginationParams } from '../types/api';
import type { PaymentOrder, PaymentOrderListParams, Quota, Wallet, WalletTransaction } from '../types/payment';

export const paymentApi = {
  recharge: (params: { amount: number; payMethod: string }): Promise<PaymentOrder> =>
    api.post('/payments/recharge-orders', params),

  pointOrder: (params: { amount: number; payMethod: string; idempotencyKey: string }): Promise<PaymentOrder> =>
    api.post('/payments/point-orders', params),

  memberOrder: (params: { skuId: string; payMethod: string; idempotencyKey: string }): Promise<PaymentOrder> =>
    api.post('/payments/member-orders', params),

  getOrder: (orderNo: string): Promise<PaymentOrder> =>
    api.get(`/payments/orders/${encodeURIComponent(orderNo)}`),

  orders: (params?: PaymentOrderListParams): Promise<PaginatedResponse<PaymentOrder>> =>
    api.get('/payments/orders', { params }),

  queryProviderOrder: (orderNo: string): Promise<PaymentOrder> =>
    api.post(`/payments/orders/${encodeURIComponent(orderNo)}/query-provider`),

  wallet: (): Promise<Wallet> => api.get('/payments/wallet'),

  walletTransactions: (params?: PaginationParams): Promise<PaginatedResponse<WalletTransaction>> =>
    api.get('/payments/wallet/transactions', { params }),

  quotas: (): Promise<Quota[]> => api.get('/payments/quotas'),
};
