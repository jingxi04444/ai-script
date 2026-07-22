import api from './request';
import type { NotificationPage, NotificationQueryParams } from '../types/notification';

export const notificationApi = {
  list: (params?: NotificationQueryParams): Promise<NotificationPage> =>
    api.get('/notifications', { params }),

  markRead: (id: string): Promise<void> => api.post(`/notifications/${id}/read`),
};
