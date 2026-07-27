import axios from 'axios';

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  traceId?: string;
  timestamp?: number;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

const ADMIN_AUTH_NOTICE_KEY = 'admin_auth_notice';
const adminBasePath = (import.meta.env.BASE_URL || '/admin/').replace(/\/$/, '');
const adminLoginPath = `${adminBasePath}/login`;
let redirectingToLogin = false;

const isLoginRequest = (requestUrl?: string) => Boolean(requestUrl?.replace(/\?.*$/, '').endsWith('/auth/login'));

export function handleAdminAuthFailure(error: unknown, requestUrl?: string): boolean {
  if (isLoginRequest(requestUrl)) return false;
  const candidate = error as {
    code?: number;
    message?: string;
    response?: { status?: number; data?: { code?: number; message?: string } };
  };
  const payload = candidate.response?.data || candidate;
  const unauthorized = candidate.response?.status === 401 || payload?.code === 40100;
  if (!unauthorized) return false;

  localStorage.removeItem('admin_token');
  sessionStorage.setItem(ADMIN_AUTH_NOTICE_KEY, payload?.message || '登录已过期，请重新登录');
  if (window.location.pathname !== adminLoginPath && !redirectingToLogin) {
    redirectingToLogin = true;
    window.location.replace(`${adminLoginPath}?reason=expired`);
  }
  return true;
}

export function takeAdminAuthNotice(): string {
  const notice = sessionStorage.getItem(ADMIN_AUTH_NOTICE_KEY) || '';
  sessionStorage.removeItem(ADMIN_AUTH_NOTICE_KEY);
  return notice;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/admin',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (response.config.responseType === 'blob' || payload instanceof Blob) {
      return payload;
    }

    if (payload && typeof payload === 'object' && 'code' in payload) {
      const apiResponse = payload as ApiResponse<unknown>;
      if (apiResponse.code === 0) {
        return apiResponse.data;
      }
      if (apiResponse.code === 40100) {
        handleAdminAuthFailure(apiResponse, response.config.url);
      }
      return Promise.reject(apiResponse);
    }

    return payload;
  },
  (error) => {
    handleAdminAuthFailure(error, error.config?.url);
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
