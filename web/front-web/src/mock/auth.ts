import type { UserInfo } from '../types/user';
import type { RegisterParams, SmsScene } from '../types/user';

const mockUser: UserInfo = {
  id: 'user-1',
  username: '测试用户',
  email: 'test@example.com',
  phone: '13800138000',
  avatar: '',
  memberLevel: 1,
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const mockAuthApi = {
  login: async (_username: string, _password: string) => {
    await delay(500);
    return {
      token: 'mock-token-123456',
      user: mockUser,
    };
  },

  register: async (_params: RegisterParams) => {
    await delay(500);
    return {
      token: 'mock-token-123456',
      user: mockUser,
    };
  },

  smsLogin: async (phone: string, _code: string) => {
    await delay(500);
    return {
      token: 'mock-token-123456',
      user: { ...mockUser, phone, email: undefined },
      needsPhoneBinding: false,
      needsEmailBinding: true,
    };
  },

  bindPhone: async (phone: string, _code: string) => {
    await delay(500);
    return {
      token: 'mock-token-123456',
      user: { ...mockUser, phone, email: undefined },
      needsPhoneBinding: false,
      needsEmailBinding: true,
    };
  },

  bindEmail: async (email: string, _password: string) => {
    await delay(500);
    return {
      token: 'mock-token-123456',
      user: { ...mockUser, email },
      needsPhoneBinding: false,
      needsEmailBinding: false,
    };
  },

  logout: async () => {
    await delay(300);
  },

  getUserInfo: async () => {
    await delay(300);
    return mockUser;
  },

  sendCode: async (_phone: string, _scene: SmsScene) => {
    await delay(300);
  },

  startWechatLogin: async () => {
    await delay(300);
    const state = `mock-wechat-${Date.now()}`;
    sessionStorage.setItem(`wechat-poll:${state}`, '0');
    return { state, authorizationUrl: `https://open.weixin.qq.com/mock-login?state=${state}`, expiresIn: 300 };
  },

  getWechatLoginStatus: async (state: string) => {
    await delay(300);
    const count = Number(sessionStorage.getItem(`wechat-poll:${state}`) || '0') + 1;
    sessionStorage.setItem(`wechat-poll:${state}`, String(count));
    if (count < 3) return { status: 'waiting' as const };
    return {
      status: 'complete' as const,
      login: {
        token: 'mock-wechat-token-123456',
        user: { ...mockUser, phone: undefined, username: '微信用户' },
        needsPhoneBinding: true,
        needsEmailBinding: false,
      },
    };
  },
};
