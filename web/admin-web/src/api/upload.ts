import axios from 'axios';
import type { ApiResponse } from './index';

export interface UploadFileResult {
  objectKey: string;
  url: string;
  fileName: string;
  contentType: string;
  size: number;
}

export const uploadApi = {
  uploadFile: async (file: File): Promise<UploadFileResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', 'site-config');

    const token = localStorage.getItem('admin_token');
    const response = await axios.post<ApiResponse<UploadFileResult>>('/api/files/upload', formData, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const payload = response.data;
    if (payload.code !== 0) {
      return Promise.reject(payload);
    }
    return payload.data;
  },
};
