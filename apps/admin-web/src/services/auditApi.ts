import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { AuditOverview, ReviewTaskRequest } from '../types/admin';

export const auditApi = {
  getOverview() {
    return callApi<AuditOverview>(() => mockApi.getAuditOverview() as Promise<AuditOverview>, () => request<AuditOverview>('/api/admin/audit/overview'));
  },
  reviewTask(payload: ReviewTaskRequest) {
    return callApi<{ success: boolean }>(() => mockApi.reviewTask(payload) as Promise<{ success: boolean }>, () => request<{ success: boolean }>(`/api/admin/audit/tasks/${payload.taskId}/review`, { method: 'POST', body: payload }));
  },
};
