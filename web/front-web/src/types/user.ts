export interface UserInfo {
  id: string;
  username: string;
  email?: string;
  phone?: string;
  avatar?: string;
  memberLevel?: number;
}

export interface LoginParams {
  username: string;
  password: string;
}

export interface RegisterParams {
  username?: string;
  password: string;
  email: string;
  phone: string;
  code: string;
}

export interface AuthResult {
  token: string;
  user: UserInfo;
  needsPhoneBinding?: boolean;
  needsEmailBinding?: boolean;
}

export type SmsScene = 'login' | 'register' | 'bind';

export interface WechatLoginStart {
  state: string;
  authorizationUrl: string;
  expiresIn: number;
}

export interface WechatLoginStatus {
  status: 'waiting' | 'complete' | 'expired';
  login?: AuthResult;
}
