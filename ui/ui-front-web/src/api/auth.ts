import api from './index';

export interface LoginParams {
  username: string;
  password: string;
}

export interface RegisterParams {
  username: string;
  password: string;
  email?: string;
  phone?: string;
  code?: string;
}

export interface UserInfo {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  memberLevel?: number;
  balance?: number;
}

export const authApi = {
  login: (params: LoginParams): Promise<{ token: string; user: UserInfo }> => {
    return api.post('/auth/login', params);
  },

  register: (params: RegisterParams): Promise<{ token: string; user: UserInfo }> => {
    return api.post('/auth/register', params);
  },

  logout: (): Promise<void> => {
    return api.post('/auth/logout');
  },

  getUserInfo: (): Promise<UserInfo> => {
    return api.get('/auth/user-info');
  },

  sendCode: (phone: string): Promise<void> => {
    return api.post('/auth/send-code', { phone });
  },
};
