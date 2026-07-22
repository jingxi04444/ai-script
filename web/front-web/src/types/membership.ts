export interface MembershipPlan {
  id: string;
  code: string;
  name: string;
  price: number;
  periodDays: number;
}

export interface UserMembership {
  id?: string;
  userId?: string;
  planId?: string;
  status?: string;
  startTime?: string;
  expireTime?: string;
}
