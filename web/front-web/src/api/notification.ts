import api from './request';
import { config } from '../config';
import type { NotificationPage, NotificationQueryParams } from '../types/notification';

export const notificationApi = {
  list: (params?: NotificationQueryParams): Promise<NotificationPage> =>
    config.useMock
      ? Promise.resolve({ list: [], total: 0, page: params?.page || 1, pageSize: params?.pageSize || 20, pages: 0 })
      : api.get('/notifications', { params }),

  markRead: (id: string): Promise<void> => api.post(`/notifications/${id}/read`),
};
