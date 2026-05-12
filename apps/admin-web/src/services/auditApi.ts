import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { AuditActionResult, AuditTask } from '../types/admin';

export const auditApi = {
  getAuditTasks() {
    return callApi<AuditTask[]>(
      () => mockApi.getAuditTasks() as Promise<AuditTask[]>,
      () => request<AuditTask[]>('/api/admin/audit/tasks'),
    );
  },
  approveAuditTask(id: string) {
    return callApi<AuditActionResult>(
      () => mockApi.approveAuditTask(id) as Promise<AuditActionResult>,
      () => request<AuditActionResult>(`/api/admin/audit/tasks/${id}/approve`, { method: 'POST' }),
    );
  },
  rejectAuditTask(id: string, reason?: string) {
    return callApi<AuditActionResult>(
      () => mockApi.rejectAuditTask(id, reason) as Promise<AuditActionResult>,
      () => request<AuditActionResult>(`/api/admin/audit/tasks/${id}/reject`, { method: 'POST', body: { reason } }),
    );
  },
};
