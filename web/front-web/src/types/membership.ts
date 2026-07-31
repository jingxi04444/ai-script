export interface MembershipPlanSku {
  id: string;
  code: string;
  name: string;
  billingMode: 'one_time' | 'auto_renew';
  periodUnit: 'month' | 'quarter' | 'year';
  periodCount: number;
  price: number;
  originalPrice?: number;
  refundDays: number;
  displayOrder?: number;
}

export interface MembershipBenefit {
  code: string;
  name: string;
  category: string;
  value: string;
  valueType: 'boolean' | 'integer' | 'decimal' | 'string';
  unit?: string;
  resetType: 'none' | 'day' | 'membership_month' | 'lifetime';
  previewOnly: boolean;
  enabled: boolean;
  description?: string;
  displayOrder?: number;
}

export interface MembershipPlan {
  id: string;
  code: string;
  name: string;
  level?: number;
  free?: boolean;
  description?: string;
  displayOrder?: number;
  /** 兼容旧版购买弹窗，正式下单使用 skus[].id。 */
  price: number;
  periodDays: number;
  skus?: MembershipPlanSku[];
  benefits?: MembershipBenefit[];
}

export interface UserMembership {
  id?: string;
  userId?: string;
  planId?: string;
  skuId?: string;
  planCode?: string;
  planName?: string;
  status?: string;
  autoRenew?: boolean;
  cancelAtPeriodEnd?: boolean;
  startTime?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  expireTime?: string;
  benefitCycleStart?: string;
  benefitCycleEnd?: string;
  pendingPlanId?: string;
  pendingSkuId?: string;
  pendingEffectiveTime?: string;
}
export interface MembershipChangeQuote {
  changeType: 'first_purchase' | 'renewal' | 'upgrade' | 'downgrade' | string;
  effectiveType: 'immediate' | 'period_end' | string;
  subscriptionId?: string;
  currentPlanId?: string;
  currentSkuId?: string;
  targetPlanId: string;
  targetSkuId: string;
  originalAmount: number;
  creditAmount: number;
  payableAmount: number;
  effectiveTime?: string;
}

export interface PointAccount {
  id?: string;
  userId?: string;
  availablePoints: number;
  frozenPoints: number;
  updatedAt?: string;
}

export interface DailyPointReward {
  rewardDate: string;
  rewardPoints: number;
  balanceAfter: number;
  alreadyClaimed: boolean;
}

export interface PointTransaction {
  id: string;
  transactionType: string;
  changePoints: number;
  balanceAfter: number;
  bizType?: string;
  bizId?: string;
  requestNo?: string;
  sourceOrderNo?: string;
  remark?: string;
  createdAt?: string;
}
