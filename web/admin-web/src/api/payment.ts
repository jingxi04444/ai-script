import api from './index';
import type { PageResult } from './index';

export interface PaymentOrder {
  id: string;
  orderNo: string;
  userId?: string;
  orderType?: string;
  status: string;
  amount: number;
  paidAmount?: number;
  currency?: string;
  payMethod: string;
  subject: string;
  provider?: string;
  providerStatus?: string;
  providerTradeNo?: string;
  fulfillStatus?: string;
  fulfillError?: string;
  qrContent?: string;
  payTime?: string;
  expireTime?: string;
  createdAt?: string;
  updatedAt?: string;
  lastQueryTime?: string;
  fulfillTime?: string;
}

export interface PaymentOrderListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  payMethod?: string;
  orderType?: string;
  userId?: string;
}

export const paymentApi = {
  getList: (params?: PaymentOrderListParams): Promise<PageResult<PaymentOrder>> => {
    return api.get('/payments/orders', { params });
  },

  getByOrderNo: (orderNo: string): Promise<PaymentOrder> => {
    return api.get(`/payments/orders/${encodeURIComponent(orderNo)}`);
  },

  queryProviderOrder: (orderNo: string): Promise<PaymentOrder> => {
    return api.post(`/payments/orders/${encodeURIComponent(orderNo)}/query-provider`);
  },
};
