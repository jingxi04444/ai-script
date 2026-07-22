import api from '../api/request';

export const request = {
  get: <T>(url: string, params?: any): Promise<T> => {
    return api.get(url, { params });
  },

  post: <T>(url: string, data?: any): Promise<T> => {
    return api.post(url, data);
  },

  put: <T>(url: string, data?: any): Promise<T> => {
    return api.put(url, data);
  },

  delete: <T>(url: string): Promise<T> => {
    return api.delete(url);
  },

  upload: <T>(url: string, file: File): Promise<T> => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
