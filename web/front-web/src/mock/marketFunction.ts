import type { MarketFunction } from '../types/marketFunction';

export const mockMarketFunctions: MarketFunction[] = [
  {
    id: 'market-function-1',
    code: 'category-viral-links',
    title: '品类爆款链接',
    summary: '按品类聚合抖音、小红书全时长的单品测评爆款链接。',
    description: '输入品类后自动采集候选视频，剔除多品横测、榜单和跨品类推荐，并按点赞数从高到低展示。',
    badge: 'HOT',
    icon: 'flame',
    featureType: 'builtin',
    route: '/market/category-viral-links',
    category: '内容灵感',
    tags: ['爆款链接', '品类测评', '短视频'],
    sortOrder: 10,
    status: 1,
    updateTime: '2026-10-24 20:00:00',
  },
];
