import { callApi, requestList } from './apiClient';
import { mockApi } from './mock.js';
import type { AdminMenuItem } from '../types/admin';

export const menuApi = {
  getMenus() {
    return callApi<AdminMenuItem[]>(() => mockApi.getMenus() as Promise<AdminMenuItem[]>, () => requestList<AdminMenuItem>('/api/admin/menus'));
  },
};
