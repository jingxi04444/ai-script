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

function redirectToLogin() {
  localStorage.removeItem('admin_token');
  if (window.location.pathname !== '/admin/login') {
    window.location.href = '/admin/login';
  }
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
        redirectToLogin();
      }
      return Promise.reject(apiResponse);
    }

    return payload;
  },
  (error) => {
    if (error.response?.status === 401 || error?.code === 40100) {
      redirectToLogin();
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
