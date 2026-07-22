import api from './index';

export interface QuotaAdjustPayload {
  userId: string;
  quotaType: string;
  changeCount: number;
  remark?: string;
}

export const quotaApi = {
  adjust: (payload: QuotaAdjustPayload): Promise<void> => api.post('/quotas/adjust', payload),
};
