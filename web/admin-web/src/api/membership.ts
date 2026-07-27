import axios from 'axios';
import { handleAdminAuthFailure, type ApiResponse } from './index';

export interface MembershipPlan {
  id: string;
  code?: string;
  name?: string;
  price?: number | string;
  periodDays?: number;
}

const membershipHttp = axios.create({
  baseURL: import.meta.env.VITE_PUBLIC_API_BASE_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

membershipHttp.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  return config;
});

membershipHttp.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'code' in payload) {
      const apiResponse = payload as ApiResponse<unknown>;
      if (apiResponse.code === 0) return apiResponse.data;
      handleAdminAuthFailure(apiResponse, response.config.url);
      return Promise.reject(apiResponse);
    }
    return payload;
  },
  (error) => {
    handleAdminAuthFailure(error, error.config?.url);
    return Promise.reject(error.response?.data || error);
  }
);

export const membershipApi = {
  getPlans: (): Promise<MembershipPlan[]> => membershipHttp.get('/membership/plans'),
};
