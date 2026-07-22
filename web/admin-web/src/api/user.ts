import api from './index';
import type { PageResult } from './index';

export interface User {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  memberLevel?: number | string;
  balance?: number | string;
  status?: 'active' | 'disabled' | 'enabled';
  createdAt?: string;
  updateTime?: string;
  nickname?: string;
}

export interface UserListParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
}

export const userApi = {
  getList: (params?: UserListParams): Promise<PageResult<User>> => {
    return api.get('/users', { params });
  },

  getById: (id: string): Promise<User> => {
    return api.get(`/users/${id}`);
  },

  update: (id: string, data: Partial<User>): Promise<User> => {
    return api.put(`/users/${id}`, data);
  },

  disable: (id: string): Promise<void> => {
    return api.post(`/users/${id}/disable`);
  },

  enable: (id: string): Promise<void> => {
    return api.post(`/users/${id}/enable`);
  },
};
