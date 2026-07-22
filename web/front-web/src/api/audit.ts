import api from './request';
import type { AuditSubmitParams, AuditTask } from '../types/audit';

export const auditApi = {
  submit: (data: AuditSubmitParams): Promise<AuditTask> => api.post('/audit/tasks', data),
};
