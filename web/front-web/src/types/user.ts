export interface UserInfo {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  memberLevel?: number;
  balance?: number;
}

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
