import { callApi, request, withQuery } from './apiClient';
import { mockApi } from './mock.js';
import type { OperationLog, OperationLogQuery, PagedResult } from '../types/admin';

export const operationLogApi = {
  getOperationLogs(query: OperationLogQuery = {}) {
    return callApi<PagedResult<OperationLog>>(() => mockApi.getOperationLogs(query) as Promise<PagedResult<OperationLog>>, () => request<PagedResult<OperationLog>>(withQuery('/api/admin/operation-logs', query)));
  },
};
