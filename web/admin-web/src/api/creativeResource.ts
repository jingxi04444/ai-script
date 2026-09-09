import api, { type PageResult } from './index';

export type CreativeResourceType = 'character' | 'style' | 'effect';
export type CreativeResourceStatus = 'draft' | 'published';
export interface CreativeResourceGalleryItem { label: string; url: string }

export interface CreativeResourceSaveParams {
  code: string;
  type: CreativeResourceType;
  name: string;
  category: string;
  description: string;
  coverUrl: string;
  previewVideoUrl?: string;
  gallery: CreativeResourceGalleryItem[];
  tags: string[];
  prompt: string;
  negativePrompt?: string;
  config: Record<string, unknown>;
  status: CreativeResourceStatus;
  sortOrder: number;
  licenseNote: string;
  author: string;
}

export interface CreativeResource extends CreativeResourceSaveParams {
  id: string;
  createTime?: string;
  updateTime?: string;
}

export interface CreativeResourceQuery {
  type: CreativeResourceType;
  category?: string;
  status?: CreativeResourceStatus;
  keyword?: string;
  page: number;
  pageSize: number;
}

export const creativeResourceApi = {
  list: (params: CreativeResourceQuery, signal?: AbortSignal): Promise<PageResult<CreativeResource>> =>
    api.get('/creative-resources', { params, signal }),
  create: (data: CreativeResourceSaveParams): Promise<CreativeResource> => api.post('/creative-resources', data),
  update: (id: string, data: CreativeResourceSaveParams): Promise<CreativeResource> => api.put(`/creative-resources/${encodeURIComponent(id)}`, data),
  remove: (id: string): Promise<void> => api.delete(`/creative-resources/${encodeURIComponent(id)}`),
};
