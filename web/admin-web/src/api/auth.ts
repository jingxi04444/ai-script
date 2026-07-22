import api from './index';

export interface LoginResult {
  token: string;
  user: AdminUser;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface AdminUser {
  id: string;
  username: string;
  role: 'admin' | 'superadmin';
  roles?: string[];
  permissions?: string[];
  menus?: AdminMenu[];
}

export interface AdminMenu {
  id: string;
  parentId?: string;
  name: string;
  code: string;
  moduleCode?: string;
  type: string;
  path?: string;
  icon?: string;
  sortOrder?: number;
  children?: AdminMenu[];
}

export const authApi = {
  login: (params: LoginParams): Promise<LoginResult> => {
    return api.post('/auth/login', params);
  },

  logout: (): Promise<void> => {
    return api.post('/auth/logout');
  },

  getAdminInfo: (): Promise<AdminUser> => {
    return api.get('/auth/admin-info');
  },
};
