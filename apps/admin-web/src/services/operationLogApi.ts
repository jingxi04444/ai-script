import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { OperationLog } from '../types/admin';

export const operationLogApi = {
  getOperationLogs() {
    return callApi<OperationLog[]>(
      () => mockApi.getOperationLogs() as Promise<OperationLog[]>,
      () => request<OperationLog[]>('/api/admin/operation-logs'),
    );
  },
};
