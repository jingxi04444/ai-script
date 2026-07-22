import type { UserInfo } from '../types/user';

const mockUser: UserInfo = {
  id: 'user-1',
  username: '测试用户',
  email: 'test@example.com',
  phone: '13800138000',
  avatar: '',
  memberLevel: 1,
  balance: 100,
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

  register: async (_params: { username: string; password: string; email?: string; phone?: string }) => {
    await delay(500);
    return {
      token: 'mock-token-123456',
      user: mockUser,
    };
  },

  logout: async () => {
    await delay(300);
  },

  getUserInfo: async () => {
    await delay(300);
    return mockUser;
  },

  sendCode: async (_phone: string) => {
    await delay(300);
  },
};
