import type {
  MarketViralGenerationTask,
  MarketViralPage,
  MarketViralQuery,
  MarketViralRefreshParams,
  MarketViralRefreshTask,
  MarketViralVideo,
} from '../types/marketViral';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const seenAt = new Date().toISOString();
const publishedAt = (days: number) => new Date(Date.now() - days * 86400000).toISOString();

let demos: MarketViralVideo[] = [
  {
    id: 'market-1001', category: '油烟机', platform: 'douyin', externalId: 'demo-1001',
    title: '厨房用了半年，这台油烟机最让我意外的不是吸力',
    authorName: '阿洛的厨房实验', sourceUrl: 'https://www.douyin.com/search/%E6%B2%B9%E7%83%9F%E6%9C%BA',
    tags: '油烟机测评,厨房改造,单品实测', durationSeconds: 47, likeCount: 128000,
    commentCount: 4300, collectCount: 9100, shareCount: 2800, publishedAt: publishedAt(2),
    lastSeenAt: seenAt, discoveryQuery: '油烟机测评',
  },
  {
    id: 'market-1002', category: '油烟机', platform: 'xiaohongshu', externalId: 'demo-1002',
    title: '小厨房装完一年，我只保留这台吸油烟机',
    authorName: '住进小满家', sourceUrl: 'https://www.xiaohongshu.com/search_result?keyword=%E6%B2%B9%E7%83%9F%E6%9C%BA',
    tags: '吸油烟机,单人使用体验,小厨房', durationSeconds: 58, likeCount: 86000,
    commentCount: 2100, collectCount: 13800, shareCount: 1600, publishedAt: publishedAt(4),
    lastSeenAt: seenAt, discoveryQuery: '油烟机测评',
  },
  {
    id: 'market-1003', category: '油烟机', platform: 'douyin', externalId: 'demo-1003',
    title: '爆炒辣椒不呛鼻？这台抽油烟机现场实测',
    authorName: '认真生活的老周', sourceUrl: 'https://www.douyin.com/search/%E6%B2%B9%E7%83%9F%E6%9C%BA',
    tags: '抽油烟机,爆炒测试,单品测评', durationSeconds: 32, likeCount: 74000,
    commentCount: 3200, collectCount: 5100, shareCount: 1200, publishedAt: publishedAt(1),
    lastSeenAt: seenAt, discoveryQuery: '油烟机',
  },
  {
    id: 'market-1004', category: '油烟机', platform: 'xiaohongshu', externalId: 'demo-1004',
    title: '开放式厨房的油烟机到底值不值，住三个月后说真话',
    authorName: '周末住范儿', sourceUrl: 'https://www.xiaohongshu.com/search_result?keyword=%E6%B2%B9%E7%83%9F%E6%9C%BA',
    tags: '油烟机,长期使用,开放式厨房', durationSeconds: 54, likeCount: 39000,
    commentCount: 980, collectCount: 7300, shareCount: 640, publishedAt: publishedAt(7),
    lastSeenAt: seenAt, discoveryQuery: '油烟机测评',
  },
  {
    id: 'market-1005', category: '油烟机', platform: 'douyin', externalId: 'demo-1005',
    title: '一台机器的自清洁是不是智商税，拆开看',
    authorName: '家电拆解员', sourceUrl: 'https://www.douyin.com/search/%E6%B2%B9%E7%83%9F%E6%9C%BA',
    tags: '油烟机,自清洁,拆机实测', durationSeconds: 44, likeCount: 21000,
    commentCount: 750, collectCount: 2300, shareCount: 410, publishedAt: publishedAt(9),
    lastSeenAt: seenAt, discoveryQuery: '油烟机测评',
  },
];
let favoriteIds = new Set<string>();

const matches = (item: MarketViralVideo, query: MarketViralQuery) => {
  const keyword = query.keyword?.trim().toLocaleLowerCase();
  return item.category === query.category
    && (!query.platform || item.platform === query.platform)
    && (!keyword || `${item.title} ${item.authorName || ''} ${item.tags || ''}`.toLocaleLowerCase().includes(keyword));
};

export const mockMarketViralApi = {
  list: async (query: MarketViralQuery): Promise<MarketViralPage> => {
    await delay(180);
    const filtered = demos.filter((item) => matches(item, query))
      .filter((item) => !query.favoriteOnly || favoriteIds.has(item.id))
      .sort((left, right) => right.likeCount - left.likeCount);
    const start = (query.page - 1) * query.pageSize;
    return {
      list: filtered.slice(start, start + query.pageSize)
        .map((item) => ({ ...item, favorited: favoriteIds.has(item.id) })),
      total: filtered.length,
      page: query.page,
      pageSize: query.pageSize,
      pages: Math.ceil(filtered.length / query.pageSize),
    };
  },
  refresh: async (params: MarketViralRefreshParams): Promise<MarketViralRefreshTask> => {
    await delay(280);
    return { taskId: `demo-market-${params.requestNo}`, status: 'pending' };
  },
  task: async (id: string): Promise<MarketViralGenerationTask> => {
    await delay(650);
    return {
      id,
      status: 'success',
      progress: 100,
      result: JSON.stringify({
        category: '油烟机',
        accepted: demos.length,
        stored: demos.length,
        filtered: 12,
        warnings: [],
      }),
    };
  },
  simulateRefresh: async (category: string) => {
    demos = demos.map((item) => ({
      ...item,
      category,
      lastSeenAt: new Date().toISOString(),
      likeCount: item.likeCount + Math.floor(Math.random() * 300),
    }));
  },
  favorite: async (id: string): Promise<{ favorited: boolean }> => {
    await delay(120);
    if (favoriteIds.has(id)) {
      favoriteIds.delete(id);
      return { favorited: false };
    }
    favoriteIds.add(id);
    return { favorited: true };
  },
};
