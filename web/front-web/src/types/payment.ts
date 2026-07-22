export interface PaymentParams {
  providerTradeNo?: string;
  orderNo?: string;
  amount?: number;
  subject?: string;
  payUrl?: string;
  qrCode?: string;
  rawPayload?: string;
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
  expireTime?: string;
  payTime?: string;
  createdAt?: string;
  updatedAt?: string;
  lastQueryTime?: string;
  fulfillTime?: string;
  userId?: string;
  payParams?: PaymentParams;
}

export interface PaymentOrderListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  frozenBalance: number;
  updatedAt?: string;
}

export interface WalletTransaction {
  id: string;
  walletId?: string;
  userId?: string;
  transactionType?: string;
  amount?: number;
  balanceAfter?: number;
  bizType?: string;
  bizId?: string;
  remark?: string;
  createdAt?: string;
}

export interface Quota {
  id: string;
  userId?: string;
  quotaType: string;
  remainingCount: number;
  expireTime?: string;
}
