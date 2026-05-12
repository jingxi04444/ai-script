const wait = (value, delay = 180) => new Promise((resolve) => setTimeout(() => resolve(clone(value)), delay));
const clone = (value) => JSON.parse(JSON.stringify(value));

const currentUser = {
  id: 'front_001',
  name: '林楠',
  tenantName: '北钥宠物生活',
  role: '增长编导',
  points: 1280,
};

let projects = [
  { id: 'mock_project_001', title: '2026宝贝宝贝不能', product: '宠鲜鲜智能加热饭盒', status: 'draft', currentStep: 'global', platform: '抖音', updatedAt: '刚刚', progress: 11 },
  { id: 'mock_project_002', title: '宠鲜鲜加热饭盒 - 职场加班版', product: '宠鲜鲜智能加热饭盒', status: 'scripting', currentStep: 'storyboard', platform: '抖音', updatedAt: '今天 20:48', progress: 44 },
  { id: 'mock_project_003', title: '分层便当盒 - 小红书测评', product: '分层便当盒', status: 'draft', currentStep: 'selling-points', platform: '小红书', updatedAt: '05-10 23:01', progress: 22 },
];

const defaultSellingStep = {
  productName: '宠鲜鲜智能加热饭盒',
  brief: '宠鲜鲜智能加热饭盒，主打 20 分钟快速加热，辅助卖点包括分层防串味设计。目标用户：养宠上班族、短途出行用户。补充要求：真实生活化表达，避免夸张广告词。',
  sellingPoints: ['20 分钟快速加热', '分层防串味设计'],
  primarySellingPoint: '20 分钟快速加热',
  auxiliarySellingPoints: ['分层防串味设计'],
  targetGroups: ['养宠上班族', '短途出行用户'],
  otherRequirements: '真实生活化表达，避免夸张广告词。',
};

let stepStates = {
  mock_project_001: {
    'selling-points': { projectId: 'mock_project_001', step: 'selling-points', status: 'completed', data: defaultSellingStep, savedAt: '刚刚' },
  },
};

let sellingAssets = [
  {
    id: 'sell_asset_001',
    name: '宠物加热饭盒卖点包',
    tag: '宠物用品',
    main: '20 分钟快速加热，外出也能吃到温热鲜食。',
    count: 2,
    targetGroups: ['养宠上班族', '短途出行用户'],
    status: '已入库',
    updatedAt: '今天 10:24',
    items: [
      { id: 'sell_asset_001_1', content: '20 分钟快速加热', pointType: '主卖点', metadata: { source: 'mock' } },
      { id: 'sell_asset_001_2', content: '分层防串味设计', pointType: '辅助卖点', metadata: { source: 'mock' } },
    ],
  },
  {
    id: 'sell_asset_002',
    name: '通勤便当盒卖点包',
    tag: '餐厨用品',
    main: '密封分层设计，减少通勤路上的串味和漏洒。',
    count: 3,
    targetGroups: ['通勤上班族', '健身人群'],
    status: '已入库',
    updatedAt: '昨天 18:06',
    items: [
      { id: 'sell_asset_002_1', content: '密封分层设计', pointType: '主卖点', metadata: { source: 'mock' } },
      { id: 'sell_asset_002_2', content: '轻量便携', pointType: '辅助卖点', metadata: { source: 'mock' } },
      { id: 'sell_asset_002_3', content: '微波炉可用', pointType: '辅助卖点', metadata: { source: 'mock' } },
    ],
  },
];

let viralAssets = [
  {
    id: 'viral_asset_001',
    library: 'viral-script',
    name: '宠物用品剧情反转脚本',
    tag: '抖音 / 爆款脚本',
    status: '已入库',
    updatedAt: '今天 14:20',
    count: 6,
    summary: '误会冲突 -> 产品救场 -> 情绪反转 -> 轻 CTA',
    sections: [
      { title: '平台 / 类型', content: '抖音 / 爆款脚本' },
      { title: '来源链接', content: 'https://www.douyin.com/video/mock' },
      { title: '脚本文案', content: '开场误会宠物挑食，转入加热饭盒解决鲜食温度问题，结尾轻 CTA。' },
      { title: '结构公式', content: '误会冲突 -> 产品救场 -> 情绪反转 -> 轻 CTA' },
      { title: '拉片报告', content: '{\n  "tone": "轻剧情",\n  "shots": 4\n}' },
      { title: '标签', content: '宠物用品、剧情反转' },
    ],
  },
];

let visualAssets = [
  { id: 'visual_001', name: '办公室夜景参考', type: '场景', status: '已绑定', tag: '镜号01' },
  { id: 'visual_002', name: '加热饭盒产品特写', type: '道具', status: '待确认', tag: '镜号02' },
  { id: 'visual_003', name: '温柔女声旁白', type: '音频', status: '已生成', tag: 'TTS' },
];

const storyboardRows = [
  { id: 1, shot: '镜号 01', type: '特写', scene: '加班工位，冷掉的便当盒放在键盘旁。', line: '加班到晚上，想吃一口热饭怎么就这么难？', duration: '3s', point: '痛点开场', risk: '低' },
  { id: 2, shot: '镜号 02', type: '中景', scene: '插电启动加热饭盒，蒸汽升起。', line: '插电 20 分钟，办公室也能吃上刚热好的饭。', duration: '4s', point: '主卖点直出', risk: '低' },
  { id: 3, shot: '镜号 03', type: '近景', scene: '打开分层餐盒，米饭和配菜保持完整。', line: '分层不串味，忙一天也能认真吃顿热乎的。', duration: '3s', point: '辅助卖点', risk: '低' },
];

const sellingSummary = (payload) => {
  const product = payload.productName || '当前产品';
  const primary = payload.primarySellingPoint || payload.sellingPoints?.[0] || '核心卖点';
  const groups = payload.targetGroups?.length ? payload.targetGroups.join('、') : '目标用户';
  return `AI 已提炼为：${groups}在具体使用场景中需要更高效的解决方案，${product}通过“${primary}”降低决策阻力，并可在脚本中结合辅助卖点自然植入。`;
};

const toSellingListItem = (asset) => ({ id: asset.id, name: asset.name, tag: asset.tag, main: asset.main, count: asset.items?.length || asset.count || 0 });

const toLibrarySellingAsset = (asset) => ({
  id: asset.id,
  library: 'selling-point',
  name: asset.name,
  tag: asset.tag,
  status: asset.status,
  updatedAt: asset.updatedAt,
  count: asset.items?.length || asset.count || 0,
});

const toLibrarySellingDetail = (asset) => ({
  ...toLibrarySellingAsset(asset),
  summary: asset.main,
  sections: [
    { title: '主卖点', content: asset.main || '暂无' },
    { title: '目标人群', content: asset.targetGroups?.join('、') || '暂无' },
    { title: '卖点明细', content: asset.items?.map((item) => `${item.pointType}：${item.content}`).join('\n') || '暂无明细' },
  ],
});

export const mockApi = {
  login: (payload) => wait({ token: 'mock-front-token', user: { ...currentUser, name: payload.name || currentUser.name } }),
  register: (payload) => wait({ token: 'mock-front-token', user: { ...currentUser, name: payload.name || currentUser.name } }),
  getCurrentUser: () => wait(currentUser),
  getProjects: () => wait(projects),
  createProject: () => {
    const project = { id: `mock_project_${Date.now()}`, title: '新建短视频脚本项目', product: '待填写产品', status: 'draft', currentStep: 'global', platform: '抖音', updatedAt: '刚刚', progress: 0 };
    projects = [project, ...projects];
    return wait(project, 220);
  },
  getProject: (projectId) => wait(projects.find((project) => project.id === projectId) || projects[0]),
  updateProject: (projectId, patch) => {
    projects = projects.map((project) => project.id === projectId ? { ...project, ...patch, updatedAt: '刚刚' } : project);
    return wait(projects.find((project) => project.id === projectId) || projects[0]);
  },
  saveStep: (payload) => {
    stepStates[payload.projectId] = { ...(stepStates[payload.projectId] || {}), [payload.step]: { projectId: payload.projectId, step: payload.step, status: 'completed', data: payload.data || {}, savedAt: '刚刚' } };
    projects = projects.map((project) => project.id === payload.projectId ? { ...project, currentStep: payload.step, progress: Math.max(project.progress || 0, 11), updatedAt: '刚刚' } : project);
    return wait({ projectId: payload.projectId, step: payload.step, savedAt: '刚刚', data: payload.data || {} }, 220);
  },
  getStep: (projectId, step) => wait(stepStates[projectId]?.[step] || { projectId, step, status: 'empty', data: null, savedAt: '' }),
  uploadFile: (payload) => {
    const result = { id: `upload_${Date.now()}`, type: payload.type, fileName: payload.fileName, status: 'uploaded', uploadedAt: '刚刚' };
    if (payload.type === 'selling-point-script-asset') {
      sellingAssets = [{ id: result.id, name: payload.fileName, tag: '产品卖点脚本', main: payload.fileName, count: 1, targetGroups: [], status: '已入库', updatedAt: '刚刚', items: [{ id: `${result.id}_1`, content: payload.fileName, pointType: '主卖点', metadata: { source: 'upload' } }] }, ...sellingAssets];
    }
    if (payload.type === 'viral-link-script-asset') {
      viralAssets = [{ id: result.id, library: 'viral-script', name: payload.fileName, tag: '爆款脚本', status: '已入库', updatedAt: '刚刚', count: 0, summary: '上传脚本资产，待解析结构。', sections: [{ title: '脚本文案', content: '上传文件已入库，后续可解析为结构公式。' }] }, ...viralAssets];
    }
    return wait(result, 240);
  },
  getSellingAssets: () => wait(sellingAssets.map(toSellingListItem)),
  getSellingAssetDetail: (id) => wait(sellingAssets.find((asset) => asset.id === id) || sellingAssets[0]),
  optimizeBrief: (payload) => wait({ ...payload, summary: sellingSummary(payload) }, 360),
  getAssets: () => wait(visualAssets),
  getLibraryAssets: () => wait([...sellingAssets.map(toLibrarySellingAsset), ...viralAssets.map((asset) => ({ id: asset.id, library: asset.library, name: asset.name, tag: asset.tag, status: asset.status, updatedAt: asset.updatedAt, count: asset.count }))]),
  getLibraryAssetDetail: (library, id) => {
    if (library === 'selling-point') return wait(toLibrarySellingDetail(sellingAssets.find((asset) => asset.id === id) || sellingAssets[0]));
    return wait(viralAssets.find((asset) => asset.id === id) || viralAssets[0]);
  },
  parseSourceLink: (url) => wait({ url, title: '加班冷饭痛点爆款视频', account: '职场饭盒研究所', metrics: '点赞 12.4w / 收藏 2.1w / 评论 3860', structure: '3 秒痛点 + 场景放大 + 产品救场 + 轻 CTA', report: ['镜头 01：冷饭痛点，制造代入。', '镜头 02：产品快速加热，卖点直出。', '镜头 03：热饭入口，情绪转正。'] }, 420),
  getOriginalTemplates: () => wait([
    { id: 'tpl_1', name: '3 秒痛点 + 产品方案 + 轻 CTA', structure: '痛点开场 -> 产品方案 -> 场景验证 -> 轻 CTA' },
    { id: 'tpl_2', name: '测评开箱 + 三项实测 + 人群总结', structure: '开箱 -> 三项实测 -> 使用感受 -> 适用人群总结' },
  ]),
  generateStoryboard: () => wait(storyboardRows, 420),
  runCompliance: () => wait({ similarity: '38%', riskCount: 1, suggestion: '建议将“最有效”替换为“更适合”。' }, 320),
  submitAudit: () => wait({ status: 'submitted', message: '脚本已提交审核。' }, 260),
  downloadScript: (scriptName) => wait({ fileName: `${scriptName || '分镜脚本'}.docx`, url: '#' }, 260),
  shareScript: (scriptName) => wait({ title: scriptName || '分镜脚本', url: '/share/scripts/mock-share-token', scope: '只读分享' }, 260),
  getShareScript: () => wait({ title: '宠鲜鲜加热饭盒_职场加班版_v3', status: '只读分享', scenes: storyboardRows }),
  getTaskProgress: () => wait({ status: 'running', progress: 76, label: '正在生成镜号 03 视频片段' }, 220),
  exportVideo: () => wait({ fileName: '宠鲜鲜加热饭盒_成片.mp4', url: '#' }, 360),
};
