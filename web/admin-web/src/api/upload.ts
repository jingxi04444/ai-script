import axios from 'axios';
import { handleAdminAuthFailure, type ApiResponse } from './index';

const ADMIN_UPLOAD_URL = '/api/admin/files/upload';

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
      const response = await axios.post<ApiResponse<UploadFileResult>>(ADMIN_UPLOAD_URL, formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const payload = response.data;
      if (payload.code !== 0) {
        handleAdminAuthFailure(payload, ADMIN_UPLOAD_URL);
        return Promise.reject(payload);
      }
      return payload.data;
    } catch (error) {
      handleAdminAuthFailure(error, ADMIN_UPLOAD_URL);
      throw error;
    }
  },
};
