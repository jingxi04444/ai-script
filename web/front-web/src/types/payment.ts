export interface PaymentParams {
  providerTradeNo?: string;
  orderNo?: string;
  amount?: number;
  subject?: string;
  payUrl?: string;
  qrCode?: string;
  formHtml?: string;
  rawPayload?: string;
}

export interface MemberOrderParams {
  skuId: string;
  payMethod: string;
  idempotencyKey: string;
  /** @deprecated auto renew is derived from the selected SKU billingMode. */
  autoRenew?: boolean;
  openid?: string;
  contractChannel?: 'jsapi' | 'h5' | 'app' | 'mini-program';
}

export interface PaymentOrder {
  id: string;
  orderNo: string;
  status: string;
  amount: number;
  paidAmount?: number;
  currency?: string;
  payMethod: string;
  orderType?: string;
  subject: string;
  providerTradeNo?: string;
  provider?: string;
  providerStatus?: string;
  fulfillStatus?: string;
  fulfillError?: string;
  qrContent?: string;
  contractCode?: string;
  preEntrustwebId?: string;
  contractRedirectUrl?: string;
  contractFormHtml?: string;
  expireTime?: string;
  payTime?: string;
  createdAt?: string;
  updatedAt?: string;
  lastQueryTime?: string;
  fulfillTime?: string;
  userId?: string;
  refundDays?: number;
  refundDeadline?: string;
  refundable?: boolean;
  refundUnavailableReason?: string;
  payParams?: PaymentParams;
}

export interface PaymentOrderListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
  orderType?: string;
}

export interface RefundRequestParams {
  orderNo: string;
  reason?: string;
}

export interface RefundOrderListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}

export interface RefundOrder {
  id: string;
  refundNo: string;
  paymentOrderId: string;
  paymentOrderNo: string;
  subscriptionId?: string;
  userId: string;
  refundAmount: number;
  refundReason?: string;
  provider?: string;
  providerRefundNo?: string;
  providerStatus?: string;
  status: string;
  reviewBy?: string;
  reviewTime?: string;
  reviewRemark?: string;
  requestedTime?: string;
  completedTime?: string;
  failureReason?: string;
}

export interface Quota {
  id: string;
  userId?: string;
  quotaType: string;
  remainingCount: number;
  expireTime?: string;
}
