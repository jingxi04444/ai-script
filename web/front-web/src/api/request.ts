import axios from 'axios';
import type { AxiosError } from 'axios';
import { message } from 'antd';
import { config } from '../config';
import { isApiResponse } from '../types/api';
import { TOKEN_KEY } from '../utils/storage';

const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: config.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

let lastErrorMessage = '';
let lastErrorTime = 0;

const showErrorMessage = (content: string) => {
  const now = Date.now();
  if (content === lastErrorMessage && now - lastErrorTime < 1200) return;
  lastErrorMessage = content;
  lastErrorTime = now;
  message.error(content);
};

const redirectToLogin = () => {
  localStorage.removeItem(TOKEN_KEY);
  window.dispatchEvent(new Event('auth:expired'));
  showErrorMessage('登录已失效，请重新登录');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  }
};

const getHttpErrorMessage = (error: AxiosError) => {
  const data = error.response?.data;
  if (isApiResponse(data) && data.message) return data.message;

  if (!error.response) {
    if (error.code === 'ECONNABORTED') return '请求超时，请稍后重试';
    return '网络异常，请检查后端服务是否启动';
  }

  if (error.response.status >= 500) return '服务异常，请联系管理员';
  if (error.response.status === 403) return '暂无权限执行该操作';
  if (error.response.status === 404) return '请求的资源不存在';
  if (error.response.status === 400) return '请求参数错误';
  return '请求失败，请稍后重试';
};

api.interceptors.request.use(
  (apiConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      apiConfig.headers.Authorization = `Bearer ${token}`;
    }
    if (typeof FormData !== 'undefined' && apiConfig.data instanceof FormData) {
      apiConfig.headers.delete('Content-Type');
    }
    return apiConfig;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  ((response) => {
    const body: unknown = response.data;
    if (isApiResponse(body)) {
      if (body.code === 0 || body.code === 200) return body.data;
      if (body.code === 40100) {
        redirectToLogin();
      }
      return Promise.reject(body);
    }
    return body;
  }) as Parameters<typeof api.interceptors.response.use>[0],
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      redirectToLogin();
    } else {
      showErrorMessage(getHttpErrorMessage(error));
    }
    return Promise.reject(error.response?.data || error);
  }
);

const pendingGetRequests = new Map<string, ReturnType<typeof api.get>>();
const originalGet = api.get.bind(api);

const serializeGetParams = (params: unknown) => {
  if (params instanceof URLSearchParams) return params.toString();
  if (!params) return '';
  try {
    return JSON.stringify(params);
  } catch {
    return String(params);
  }
};

api.get = ((url: string, requestConfig = {}) => {
  // React StrictMode 会在开发环境重复执行挂载阶段的 effect。
  // 合并仍在进行中的同 URL、同参数 GET，请求完成后立即释放，不做结果缓存。
  if (requestConfig.signal) return originalGet(url, requestConfig);
  const token = localStorage.getItem(TOKEN_KEY) || '';
  const requestKey = [
    token,
    requestConfig.baseURL || api.defaults.baseURL || '',
    url,
    serializeGetParams(requestConfig.params),
    requestConfig.responseType || '',
  ].join('::');
  const pendingRequest = pendingGetRequests.get(requestKey);
  if (pendingRequest) return pendingRequest;

  const request = originalGet(url, requestConfig);
  pendingGetRequests.set(requestKey, request);
  const clearPendingRequest = () => {
    if (pendingGetRequests.get(requestKey) === request) {
      pendingGetRequests.delete(requestKey);
    }
  };
  request.then(clearPendingRequest, clearPendingRequest);
  return request;
}) as typeof api.get;

export default api;
