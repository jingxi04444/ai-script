import api from './request';
import { config } from '../config';
import type { CreativeResource, CreativeResourcePage, CreativeResourceQuery } from '../types/creativeResource';
import { isCreativeResourceType } from '../types/creativeResource';

const publishedResource = (value: CreativeResource): CreativeResource => {
  if (!value || typeof value.id !== 'string' || !isCreativeResourceType(value.type)
    || value.status !== 'published' || typeof value.name !== 'string'
    || !Array.isArray(value.gallery) || !Array.isArray(value.tags)) {
    throw new Error('资源尚未发布或数据格式不完整，请刷新后重试');
  }
  return value;
};

const readDemoCatalog = async (signal?: AbortSignal): Promise<CreativeResource[]> => {
  const response = await fetch('/creative-library/catalog.json', { signal });
  if (!response.ok) throw new Error('演示资源目录加载失败，请重试');
  const catalog: unknown = await response.json();
  if (!Array.isArray(catalog)) throw new Error('演示资源目录格式不正确');
  return catalog.filter(item => item?.status === 'published').map(publishedResource);
};

export const creativeResourceApi = {
  // Local examples are available only through the existing explicit mock switch.
  isDemo: config.useMock,
  list: async (query: CreativeResourceQuery, signal?: AbortSignal): Promise<CreativeResourcePage> => {
    if (config.useMock) {
      const keyword = query.keyword?.trim().toLocaleLowerCase();
      const matches = (await readDemoCatalog(signal)).filter(item => item.type === query.type
        && (!query.category || item.category === query.category)
        && (!keyword || `${item.name} ${item.description} ${item.tags.join(' ')}`.toLocaleLowerCase().includes(keyword)))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      return { list: matches.slice((query.page - 1) * query.pageSize, query.page * query.pageSize),
        total: matches.length, page: query.page, pageSize: query.pageSize, pages: Math.ceil(matches.length / query.pageSize) };
    }
    const result: CreativeResourcePage = await api.get('/creative-resources', { params: query, signal });
    if (!Array.isArray(result.list)) throw new Error('资源目录返回格式不正确，请重试');
    return { ...result, list: result.list.map(publishedResource) };
  },
  get: async (id: string, signal?: AbortSignal): Promise<CreativeResource> => {
    if (config.useMock) {
      const resource = (await readDemoCatalog(signal)).find(item => item.id === id);
      if (!resource) throw new Error('此演示资源已不存在');
      return resource;
    }
    return publishedResource(await api.get(`/creative-resources/${encodeURIComponent(id)}`, { signal }));
  },
};
