import type { Brief, BriefDetectionReport, BriefSharePermission, BriefShareResult } from '../types/brief';
import { createSuccessResponse, unwrapApiResponse } from '../types/api';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockBriefs: Brief[] = [
  {
    id: 'b1',
    name: 'JRFH-2026',
    productName: 'JRFH-2026',
    projectId: 'project-1',
    updatedAt: '2026-05-29 19:46',
    versions: [
      { id: 'v3', label: 'v1.2', createdAt: '2026-05-29 19:52' },
      { id: 'v2', label: 'v1.1', createdAt: '2026-05-29 19:48' },
      { id: 'v1', label: 'v1.0', createdAt: '2026-05-29 19:46' },
    ],
  },
  {
    id: 'b2',
    name: 'A60MAX',
    productName: 'A60MAX',
    projectId: 'project-1',
    updatedAt: '2026-05-29 16:42',
    versions: [{ id: 'v4', label: 'v1.0', createdAt: '2026-05-29 16:42' }],
  },
  {
    id: 'b3',
    name: '分层便当盒',
    productName: '分层便当盒',
    projectId: 'project-1',
    updatedAt: '2026-05-28 21:12',
    versions: [{ id: 'v5', label: 'v1.0', createdAt: '2026-05-28 21:12' }],
  },
];

const mockDetectionState = new Map<string, boolean>();
const mockShareLinks = new Map<string, BriefShareResult>([
  ['b1:read', {
    briefId: 'b1',
    shareToken: 'mock-share-b1-read',
    shareUrl: '/brief-share/mock-share-b1-read',
    permission: 'read',
  }],
]);
const mockProjectBriefRefs = new Map<string, Set<string>>();

const formatNow = () => new Intl.DateTimeFormat('zh-CN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
}).format(new Date()).split('/').join('-');

const createDetectionReport = (briefId: string, improved = false): BriefDetectionReport => {
  const brief = mockBriefs.find((item) => item.id === briefId);
  const briefName = brief?.productName || brief?.name || '未命名产品';
  const baseMetrics = improved ? [
    { key: 'integrity', label: '完整性', score: 94, maxScore: 100, tone: 'success' as const },
    { key: 'structured', label: '结构化', score: 89, maxScore: 100, tone: 'success' as const },
    { key: 'scene', label: '场景痛点', score: 82, maxScore: 100, tone: 'warning' as const },
    { key: 'emotion', label: '情感价值', score: 90, maxScore: 100, tone: 'success' as const },
    { key: 'data', label: '数据支撑', score: 76, maxScore: 100, tone: 'warning' as const },
    { key: 'compliance', label: '规范合规', score: 96, maxScore: 100, tone: 'success' as const },
  ] : [
    { key: 'integrity', label: '完整性', score: 82, maxScore: 100, tone: 'success' as const },
    { key: 'structured', label: '结构化', score: 74, maxScore: 100, tone: 'warning' as const },
    { key: 'scene', label: '场景痛点', score: 68, maxScore: 100, tone: 'warning' as const },
    { key: 'emotion', label: '情感价值', score: 79, maxScore: 100, tone: 'success' as const },
    { key: 'data', label: '数据支撑', score: 61, maxScore: 100, tone: 'danger' as const },
    { key: 'compliance', label: '规范合规', score: 91, maxScore: 100, tone: 'success' as const },
  ];

  const totalScore = improved ? 89 : 76;

  return {
    id: `brief-detection-${briefId}-${improved ? 'optimized' : 'base'}`,
    briefId,
    briefName,
    totalScore,
    maxScore: 100,
    grade: improved ? 'A-' : 'B+',
    summary: improved
      ? 'Brief 已完成结构补强，核心卖点更集中，数据支撑和场景表达都更贴近投放表达。'
      : 'Brief 结构基本可用，但核心痛点、数据证据和表达节奏还需要加强，适合先优化再应用。',
    evaluatedAt: formatNow(),
    metrics: baseMetrics,
    seriousRisks: improved
      ? ['仍建议补 1 组真实销量或转化数据，用于增强可信度。']
      : [
        '数据支撑偏弱，缺少可直接引用的销量、测评或用户反馈证据。',
        '场景痛点没有完全收束到具体人群和场景，容易让脚本表达发散。',
      ],
    suggestions: improved
      ? [
        { title: '继续补数据背书', detail: '保留 1 组权威数据或用户口碑，强化结论可信度。' },
        { title: '继续细化表达钩子', detail: '把开头的利益点再压缩到 1 句，方便直接进入脚本。' },
      ]
      : [
        { title: '先补“人群 + 场景 + 结果”句式', detail: '把主卖点改成一条能直接说出口的话，减少抽象描述。' },
        { title: '补 1-2 组数据支撑', detail: '优先补销量、对比数据或用户评价，提升可信度。' },
        { title: '把情绪价值前置', detail: '把“为什么要买”放在更前面，减少信息堆叠。' },
      ],
    reconstructedExample: improved
      ? `// 优化后 Brief 样例\n产品名称: ${briefName}\n核心一句: 为熬夜加班的人，提供 10 秒就能看到效果的效率型解决方案\n场景痛点: 赶工、熬夜、临时交付、注意力分散\n数据支撑: 连续 7 天使用，90% 用户反馈效率提升\n规范表述: 不夸大、不做绝对化承诺，直接给出真实可验证结果`
      : `// 重构后的 Brief 样例\n产品名称: ${briefName}\n核心一句: 针对高频使用场景，给出更快、更稳、更省心的解决方案\n场景痛点: 时间紧、步骤多、决策慢、体验不连贯\n数据支撑: 用真实数据替换“感觉很好”\n规范表述: 避免绝对化，保留可验证事实`,
  };
};

export const mockBriefApi = {
  getList: async (_projectId: string) => {
    await delay(300);
    const linkedBriefIds = mockProjectBriefRefs.get(_projectId) || new Set<string>();
    return unwrapApiResponse(createSuccessResponse(mockBriefs.filter((b) => b.projectId === _projectId || linkedBriefIds.has(b.id))));
  },

  getById: async (id: string) => {
    await delay(200);
    const brief = mockBriefs.find((b) => b.id === id);
    if (!brief) throw new Error('Brief not found');
    return unwrapApiResponse(createSuccessResponse(brief));
  },

  create: async (data: Partial<Brief>) => {
    await delay(300);
    const brief: Brief = {
      ...data,
      id: `brief-${Date.now()}`,
      name: data.productName || data.name || '未命名产品',
      productName: data.productName || data.name || '未命名产品',
      projectId: data.projectId || '',
      updatedAt: new Date().toISOString(),
      versions: [{ id: `v-${Date.now()}`, label: 'v1.0', createdAt: new Date().toISOString() }],
    };
    mockBriefs.unshift(brief);
    return unwrapApiResponse(createSuccessResponse(brief));
  },

  update: async (id: string, data: Partial<Brief>) => {
    await delay(300);
    const brief = mockBriefs.find((b) => b.id === id);
    if (!brief) throw new Error('Brief not found');
    const nextBrief = { ...brief, ...data, updatedAt: new Date().toISOString() };
    Object.assign(brief, nextBrief);
    return unwrapApiResponse(createSuccessResponse(nextBrief));
  },

  enableShare: async (id: string, permission: BriefSharePermission) => {
    await delay(180);
    const brief = mockBriefs.find((item) => item.id === id);
    if (!brief) throw new Error('Brief not found');
    const key = `${id}:${permission}`;
    const existing = mockShareLinks.get(key);
    const shareToken = existing?.shareToken || `mock-share-${id}-${permission}`;
    const result = {
      briefId: id,
      shareToken,
      shareUrl: `/brief-share/${shareToken}`,
      permission,
    };
    mockShareLinks.set(key, result);
    Object.assign(brief, {
      shareEnabled: 1,
    });
    return unwrapApiResponse(createSuccessResponse(result));
  },

  shareLinks: async (id: string) => {
    await delay(120);
    return unwrapApiResponse(createSuccessResponse(
      Array.from(mockShareLinks.entries())
        .filter(([key]) => key.startsWith(`${id}:`))
        .map(([, link]) => link),
    ));
  },

  getByShareToken: async (token: string) => {
    await delay(180);
    const link = Array.from(mockShareLinks.values()).find((item) => item.shareToken === token);
    const brief = link ? mockBriefs.find((item) => item.id === link.briefId) : undefined;
    if (!brief) throw new Error('分享链接不存在或已失效');
    return unwrapApiResponse(createSuccessResponse({
      ...brief,
      accessPermission: link?.permission || 'read',
      sharePermission: link?.permission || 'read',
    }));
  },

  updateByShareToken: async (token: string, projectId: string, data: Partial<Brief>) => {
    await delay(220);
    const link = Array.from(mockShareLinks.values()).find((item) => item.shareToken === token);
    if (!link || link.permission === 'read') throw new Error('当前分享链接不可编辑');
    const references = mockProjectBriefRefs.get(projectId);
    if (!projectId || !references?.has(link.briefId)) throw new Error('请先将共享 Brief 加入所选项目');
    const brief = mockBriefs.find((item) => item.id === link.briefId);
    if (!brief) throw new Error('Brief not found');
    Object.assign(brief, data, { updatedAt: new Date().toISOString() });
    return unwrapApiResponse(createSuccessResponse({
      ...brief,
      accessPermission: link.permission,
      sharePermission: link.permission,
    }));
  },

  linkToProject: async (briefId: string, projectId: string) => {
    await delay(220);
    const brief = mockBriefs.find((item) => item.id === briefId);
    if (!brief) throw new Error('Brief not found');
    const references = mockProjectBriefRefs.get(projectId) || new Set<string>();
    references.add(briefId);
    mockProjectBriefRefs.set(projectId, references);
    return unwrapApiResponse(createSuccessResponse(brief));
  },

  unlinkFromProject: async (briefId: string, projectId: string) => {
    await delay(180);
    mockProjectBriefRefs.get(projectId)?.delete(briefId);
    return unwrapApiResponse(createSuccessResponse(undefined));
  },

  delete: async (_id: string) => {
    await delay(300);
  },

  import: async (_file: File) => {
    await delay(500);
  },

  score: async (briefId: string) => {
    await delay(400);
    return unwrapApiResponse(createSuccessResponse(createDetectionReport(briefId, mockDetectionState.get(briefId) === true)));
  },

  optimize: async (briefId: string) => {
    await delay(420);
    mockDetectionState.set(briefId, true);
    return unwrapApiResponse(createSuccessResponse(createDetectionReport(briefId, true)));
  },
};
