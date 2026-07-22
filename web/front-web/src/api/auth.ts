import { config } from '../config';
import { mockAuthApi } from '../mock/auth';
import api from './request';
import type { LoginParams, RegisterParams, UserInfo } from '../types/user';

export const authApi = {
  login: (params: LoginParams): Promise<{ token: string; user: UserInfo }> => {
    if (config.useMock) return mockAuthApi.login(params.username, params.password);
    return api.post('/auth/login', params);
  },

  register: (params: RegisterParams): Promise<{ token: string; user: UserInfo }> => {
    if (config.useMock) return mockAuthApi.register(params);
    return api.post('/auth/register', params);
  },

  logout: (): Promise<void> => {
    if (config.useMock) return mockAuthApi.logout();
    return api.post('/auth/logout');
  },

  getUserInfo: (): Promise<UserInfo> => {
    if (config.useMock) return mockAuthApi.getUserInfo();
    return api.get('/auth/user-info');
  },

  sendCode: (phone: string): Promise<void> => {
    if (config.useMock) return mockAuthApi.sendCode(phone);
    return api.post('/auth/send-code', { phone });
  },
};
