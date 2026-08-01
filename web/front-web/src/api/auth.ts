import { config } from '../config';
import { mockAuthApi } from '../mock/auth';
import api from './request';
import type { AuthResult, LoginParams, RegisterParams, SmsScene, UserInfo, WechatLoginStart, WechatLoginStatus } from '../types/user';

export const authApi = {
  login: (params: LoginParams): Promise<AuthResult> => {
    if (config.useMock) return mockAuthApi.login(params.username, params.password);
    return api.post('/auth/login', params);
  },

  register: (params: RegisterParams): Promise<AuthResult> => {
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

  smsLogin: (phone: string, code: string): Promise<AuthResult> => {
    if (config.useMock) return mockAuthApi.smsLogin(phone, code);
    return api.post('/auth/sms-login', { phone, code });
  },

  bindPhone: (phone: string, code: string): Promise<AuthResult> => {
    if (config.useMock) return mockAuthApi.bindPhone(phone, code);
    return api.post('/auth/bind-phone', { phone, code });
  },

  sendCode: (phone: string, scene: SmsScene): Promise<void> => {
    if (config.useMock) return mockAuthApi.sendCode(phone, scene);
    return api.post('/auth/send-code', { phone, scene });
  },

  startWechatLogin: (): Promise<WechatLoginStart> => {
    if (config.useMock) return mockAuthApi.startWechatLogin();
    return api.post('/auth/wechat/start');
  },

  getWechatLoginStatus: (state: string): Promise<WechatLoginStatus> => {
    if (config.useMock) return mockAuthApi.getWechatLoginStatus(state);
    return api.get('/auth/wechat/status', { params: { state } });
  },
};
