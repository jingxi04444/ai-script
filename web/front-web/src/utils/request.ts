import api from '../api/request';

// The shared Axios response interceptor returns the unwrapped business data.
// Keep that runtime contract explicit here because Axios 1.18+ types still model
// the original AxiosResponse wrapper for a generic response type.
const asDataPromise = <T>(promise: Promise<unknown>): Promise<T> => promise as Promise<T>;

export const request = {
  get: <T>(url: string, params?: any): Promise<T> => {
    return asDataPromise<T>(api.get(url, { params }));
  },

  post: <T>(url: string, data?: any): Promise<T> => {
    return asDataPromise<T>(api.post(url, data));
  },

  put: <T>(url: string, data?: any): Promise<T> => {
    return asDataPromise<T>(api.put(url, data));
  },

  delete: <T>(url: string): Promise<T> => {
    return asDataPromise<T>(api.delete(url));
  },

  upload: <T>(url: string, file: File): Promise<T> => {
    const formData = new FormData();
    formData.append('file', file);
    return asDataPromise<T>(api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }));
  },
};
