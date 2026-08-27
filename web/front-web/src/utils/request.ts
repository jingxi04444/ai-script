import api from '../api/request';

export const request = {
  get: <T>(url: string, params?: any): Promise<T> => {
    return api.get(url, { params }) as unknown as Promise<T>;
  },

  post: <T>(url: string, data?: any): Promise<T> => {
    return api.post(url, data) as unknown as Promise<T>;
  },

  put: <T>(url: string, data?: any): Promise<T> => {
    return api.put(url, data) as unknown as Promise<T>;
  },

  delete: <T>(url: string): Promise<T> => {
    return api.delete(url) as unknown as Promise<T>;
  },

  upload: <T>(url: string, file: File): Promise<T> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }) as unknown as Promise<T>;
  },
};
