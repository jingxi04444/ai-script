import axios from 'axios';
import { handleAdminAuthFailure, type ApiResponse } from './index';

export interface UploadFileResult {
  objectKey: string;
  url: string;
  fileName: string;
  contentType: string;
  size: number;
}

export const uploadApi = {
  uploadFile: async (file: File, folder = 'site-config'): Promise<UploadFileResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const token = localStorage.getItem('admin_token');
    try {
      const response = await axios.post<ApiResponse<UploadFileResult>>('/api/files/upload', formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const payload = response.data;
      if (payload.code !== 0) {
        handleAdminAuthFailure(payload, '/api/files/upload');
        return Promise.reject(payload);
      }
      return payload.data;
    } catch (error) {
      handleAdminAuthFailure(error, '/api/files/upload');
      throw error;
    }
  },
};
