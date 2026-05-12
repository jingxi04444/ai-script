import { callApi, request } from './apiClient';
import { mockApi } from './mock.js';
import type { AdminMenuItem, UpdateMenusPayload, UpdateMenusResult } from '../types/admin';

export const menuApi = {
  getMenus() {
    return callApi<AdminMenuItem[]>(
      () => mockApi.getMenus() as Promise<AdminMenuItem[]>,
      () => request<AdminMenuItem[]>('/api/admin/menus'),
    );
  },
  updateMenus(payload: UpdateMenusPayload) {
    return callApi<UpdateMenusResult>(
      () => mockApi.updateMenus(payload) as Promise<UpdateMenusResult>,
      () => request<UpdateMenusResult>('/api/admin/menus', { method: 'PUT', body: payload }),
    );
  },
};
