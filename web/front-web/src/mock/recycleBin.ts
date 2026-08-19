import type { RecycleBinItem, RecycleBinPage, RecycleBinSummary, RecycleResourceType } from '../types/recycleBin';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

let mockItems: RecycleBinItem[] = [
  {
    id: 'recycle-1001',
    resourceType: 'project',
    resourceId: 'project-12',
    resourceName: '七夕香氛礼盒整合投放',
    retentionDays: 7,
    remainingDays: 6,
    deletedAt: daysFromNow(-1),
    expireAt: daysFromNow(6),
  },
  {
    id: 'recycle-1002',
    resourceType: 'brief',
    resourceId: 'brief-37',
    resourceName: '便携咖啡机达人 Brief V3',
    parentId: 'project-8',
    retentionDays: 7,
    remainingDays: 3,
    deletedAt: daysFromNow(-4),
    expireAt: daysFromNow(3),
  },
  {
    id: 'recycle-1003',
    resourceType: 'script',
    resourceId: 'script-86',
    resourceName: '下班 10 分钟快速晚餐｜口播版',
    parentId: 'project-5',
    retentionDays: 7,
    remainingDays: 1,
    deletedAt: daysFromNow(-6),
    expireAt: daysFromNow(1),
  },
];

const getSummary = (): RecycleBinSummary => ({
  total: mockItems.length,
  projectCount: mockItems.filter((item) => item.resourceType === 'project').length,
  briefCount: mockItems.filter((item) => item.resourceType === 'brief').length,
  scriptCount: mockItems.filter((item) => item.resourceType === 'script').length,
  retentionDays: 7,
});

const remove = (ids: string[]) => {
  const idSet = new Set(ids);
  mockItems = mockItems.filter((item) => !idSet.has(item.id));
};

export const mockRecycleBinApi = {
  list: async (params: { page?: number; pageSize?: number; resourceType?: RecycleResourceType; keyword?: string }): Promise<RecycleBinPage> => {
    await delay(240);
    const page = params.page || 1;
    const pageSize = params.pageSize || 12;
    const keyword = params.keyword?.trim().toLowerCase();
    const filtered = mockItems.filter((item) => (
      (!params.resourceType || item.resourceType === params.resourceType)
      && (!keyword || item.resourceName.toLowerCase().includes(keyword))
    ));
    const start = (page - 1) * pageSize;
    return {
      list: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
      pages: Math.ceil(filtered.length / pageSize),
    };
  },

  summary: async (): Promise<RecycleBinSummary> => {
    await delay(160);
    return getSummary();
  },

  restore: async (id: string): Promise<void> => {
    await delay(220);
    remove([id]);
  },

  purge: async (id: string): Promise<void> => {
    await delay(220);
    remove([id]);
  },

  restoreBatch: async (ids: string[]): Promise<void> => {
    await delay(260);
    remove(ids);
  },

  purgeBatch: async (ids: string[]): Promise<void> => {
    await delay(260);
    remove(ids);
  },
};
