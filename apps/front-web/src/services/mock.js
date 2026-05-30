const wait = (value, delay = 180) => new Promise((resolve) => setTimeout(() => resolve(clone(value)), delay));
const clone = (value) => JSON.parse(JSON.stringify(value));
const formatDateTime = (date = new Date()) => {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const currentUser = {
  id: 'front_001',
  name: '林楠',
  tenantName: '北钥宠物生活',
  role: '增长编导',
  points: 1280,
};

let projects = [
  { id: 'mock_project_001', title: '2026宝贝宝贝不能', product: '宠鲜鲜智能加热饭盒', announcement: '打造职场人群的早餐/加班餐场景，突出便利性。', avatarUrl: '', status: 'draft', currentStep: 'global', platform: '抖音', updatedAt: formatDateTime(), progress: 11 },
  { id: 'mock_project_002', title: '宠鲜鲜加热饭盒 - 职场加班版', product: '宠鲜鲜智能加热饭盒', announcement: '聚焦加班场景，讲述打工人真实故事。', avatarUrl: '', status: 'scripting', currentStep: 'storyboard', platform: '抖音', updatedAt: '2026-05-27 20:48:00', progress: 44 },
  { id: 'mock_project_003', title: '分层便当盒 - 小红书测评', product: '分层便当盒', announcement: '小红书种草向，强调颜值与实用性。', avatarUrl: '', status: 'draft', currentStep: 'selling-points', platform: '小红书', updatedAt: '2026-05-10 23:01:00', progress: 22 },
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
    'selling-points': { projectId: 'mock_project_001', step: 'selling-points', status: 'completed', data: defaultSellingStep, savedAt: formatDateTime() },
  },
};

// --- Brief / Version store (per project) ---
let briefStores = {};

const buildDefaultBriefStore = (projectId) => {
  const now = formatDateTime();
  const briefId = `brief_init_${projectId}`;
  const versionId = `ver_init_${projectId}`;
  return {
    projectId,
    activeBriefId: briefId,
    briefs: [
      {
        id: briefId,
        name: '默认 Brief',
        createdAt: now,
        updatedAt: now,
        activeVersionId: versionId,
        versions: [
          {
            id: versionId,
            label: 'v1.0',
            createdAt: now,
            updatedAt: now,
            data: {
              ...defaultSellingStep,
              productVersion: 'v1.0',
              productPrice: '',
              productSlogan: '',
              specialSellingPoint: '',
              mainSellingPoint: '',
              auxiliarySellingPoint: '',
              suitableCrowd: '',
              suitableScene: '',
              briefScore: 0,
            },
          },
        ],
      },
    ],
  };
};

const ensureBriefStore = (projectId) => {
  if (!briefStores[projectId]) briefStores[projectId] = buildDefaultBriefStore(projectId);
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
    updatedAt: '2026-05-27 10:24:00',
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
    updatedAt: '2026-05-26 18:06:00',
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
    updatedAt: '2026-05-27 14:20:00',
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

const scriptFormats = [
  { id: 'storyboard-table', name: '分镜表格' },
  { id: 'oral-script', name: '台词口播' },
  { id: 'shooting-script', name: '拍摄执行稿' },
];

const scriptTemplateCategories = [
  { id: 'product-intro', name: '产品介绍模板库', description: '适合新品讲解、功能说明和转化承接。' },
  { id: 'creative-story', name: '创意剧情模板库', description: '适合剧情反转、角色冲突和场景种草。' },
  { id: 'benefit-talk', name: '福利口播模板库', description: '适合直播切片、优惠活动和短促转化。' },
];

const importTemplates = {
  'selling-point-template': {
    code: 'selling-point-template',
    name: '卖点导入模板',
    description: '用于前台“导入卖点表格”，字段会映射到产品 Brief、卖点、人群和场景。',
    fileName: '卖点导入模板.csv',
    fileType: 'csv',
    columns: ['产品型号', '价格', '产品slogan', '特色卖点', '主卖点', '辅助卖点', '目标人群', '目标场景'],
    sampleRows: [
      ['JRFH-2026', '299', '热饭自由', '低温慢热不破坏口感', '20 分钟快速加热', '分层防串味', '职场加班族', '办公室晚餐'],
      ['JRFH-2026', '299', '热饭自由', '三档温控', '加热均匀', '食品级内胆', '租房独居人群', '下班回家热饭'],
    ],
    instructions: '请保留表头；产品型号为 Brief 唯一匹配字段；同型号会追加新版本，不存在则新建 Brief v1.0。',
    status: 'active',
    updatedAt: '系统默认',
  },
};

const scriptTemplates = [
  { id: 'tpl_product_1', categoryId: 'product-intro', name: '痛点开场 + 功能证明', summary: '先打痛点，再用产品功能给出可信解决方案。', formula: '痛点共鸣 -> 产品出现 -> 功能验证 -> 使用结果 -> 轻 CTA', points: ['前 3 秒必须明确人群痛点', '中段用具体画面证明功能', '结尾给低压力行动指令'] },
  { id: 'tpl_product_2', categoryId: 'product-intro', name: '三段式卖点讲解', summary: '围绕主卖点、辅助卖点、使用场景展开。', formula: '产品定位 -> 主卖点 -> 辅助卖点 -> 场景落地', points: ['卖点不超过 3 个', '每个卖点绑定一个画面', '避免空泛形容词'] },
  { id: 'tpl_story_1', categoryId: 'creative-story', name: '误会反转剧情', summary: '通过误会制造停留，再用产品完成反转。', formula: '异常开场 -> 误会升级 -> 产品解释 -> 情绪反转', points: ['开头制造疑问', '冲突必须和产品能力相关', '反转后补充卖点'] },
  { id: 'tpl_story_2', categoryId: 'creative-story', name: '办公室救场', summary: '适合职场、通勤、家庭等真实场景。', formula: '场景压力 -> 角色求助 -> 产品救场 -> 结果展示', points: ['场景要具体', '人物动作要可拍', '结尾保留生活感'] },
  { id: 'tpl_benefit_1', categoryId: 'benefit-talk', name: '限时福利口播', summary: '适合优惠券、赠品和活动倒计时。', formula: '福利钩子 -> 产品价值 -> 使用门槛 -> 立即行动', points: ['福利信息前置', '不要夸大承诺', 'CTA 简短明确'] },
];

const buildGeneratedScript = (payload) => {
  const brief = payload.config?.brief || '当前产品 Brief';
  const duration = payload.config?.durationSeconds || '30';
  const modeTitle = payload.mode === 'template' ? '模板脚本' : payload.mode === 'original' ? 'AI 原创脚本' : '爆款复刻脚本';
  const rows = [
    { shot: '镜头 01', line: '你是不是也遇到过这个问题？', visual: '真实使用场景，人物面对痛点停顿。', duration: '3s', note: '强钩子，建立代入' },
    { shot: '镜头 02', line: brief.slice(0, 42) || '产品核心卖点出现。', visual: payload.config?.productVisual || '产品特写 + 使用动作。', duration: '8s', note: '承接产品 Brief' },
    { shot: '镜头 03', line: '关键是它把复杂操作变得很简单。', visual: '功能演示，字幕标注核心利益点。', duration: '10s', note: '证明卖点' },
    { shot: '镜头 04', line: '想要同款方案，可以先收藏再了解。', visual: '结果画面 + 轻 CTA。', duration: `${Math.max(Number(duration) - 21, 3)}s`, note: '收口转化' },
  ];
  return {
    id: `script_${Date.now()}`,
    title: `${modeTitle}_${formatDateTime()}`,
    sourceMode: payload.mode,
    content: rows.map((row) => `${row.shot}｜${row.line}｜${row.visual}`).join('\n'),
    rows,
  };
};

let scriptLibrary = [
  buildGeneratedScript({ mode: 'viral', config: { brief: '宠鲜鲜智能加热饭盒，20 分钟快速加热，分层不串味。', durationSeconds: '30', productVisual: '办公室加班场景 + 产品蒸汽特写' } }),
  buildGeneratedScript({ mode: 'template', config: { brief: '通勤便当盒，密封分层，适合健身和上班族。', durationSeconds: '35', productVisual: '通勤包取出便当盒' } }),
  buildGeneratedScript({ mode: 'original', config: { brief: '宠物外出喂食方案，主打便携和新鲜。', durationSeconds: '28', productVisual: '宠物户外短途出行' } }),
];

const toLibraryScript = (script, index = 0) => ({
  id: script.id,
  title: script.title,
  productName: index === 1 ? '通勤便当盒' : '宠鲜鲜智能加热饭盒',
  sourceType: script.sourceMode || 'original',
  status: '草稿',
  updatedAt: formatDateTime(new Date(Date.now() - index * 3600 * 1000)),
  summary: script.rows?.[0]?.note || 'AI 生成脚本',
  content: script.content,
  rows: script.rows || [],
});

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
  createProject: (params) => {
    const now = formatDateTime();
    const project = {
      id: `mock_project_${Date.now()}`,
      title: params?.title || '新建短视频脚本项目',
      product: '待填写产品',
      announcement: params?.announcement || '',
      avatarUrl: '',
      status: 'draft',
      currentStep: 'global',
      platform: '抖音',
      updatedAt: now,
      progress: 0,
    };
    projects = [project, ...projects];
    return wait(project, 220);
  },
  getProject: (projectId) => wait(projects.find((project) => project.id === projectId) || projects[0]),
  updateProject: (projectId, patch) => {
    projects = projects.map((project) => project.id === projectId ? { ...project, ...patch, updatedAt: formatDateTime() } : project);
    return wait(projects.find((project) => project.id === projectId) || projects[0]);
  },
  saveStep: (payload) => {
    const now = formatDateTime();
    stepStates[payload.projectId] = { ...(stepStates[payload.projectId] || {}), [payload.step]: { projectId: payload.projectId, step: payload.step, status: 'completed', data: payload.data || {}, savedAt: now } };

    if (payload.step === 'selling-points') {
      // Mirror selling-points step payload into active brief version data.
      ensureBriefStore(payload.projectId);
      const store = briefStores[payload.projectId];
      const activeBrief = store.briefs.find((b) => b.id === store.activeBriefId) || store.briefs[0];
      const activeVersion = activeBrief.versions.find((v) => v.id === activeBrief.activeVersionId) || activeBrief.versions[0];
      activeVersion.data = { ...(activeVersion.data || {}), ...(payload.data || {}) };
      activeVersion.updatedAt = now;
      activeBrief.updatedAt = now;
    }

    projects = projects.map((project) => project.id === payload.projectId ? { ...project, currentStep: payload.step, progress: Math.max(project.progress || 0, 11), updatedAt: now } : project);
    return wait({ projectId: payload.projectId, step: payload.step, savedAt: now, data: payload.data || {} }, 220);
  },
  getStep: (projectId, step) => wait(stepStates[projectId]?.[step] || { projectId, step, status: 'empty', data: null, savedAt: '' }),
  uploadFile: (payload) => {
    const now = formatDateTime();
    const result = { id: `upload_${Date.now()}`, type: payload.type, fileName: payload.fileName, status: 'uploaded', uploadedAt: now };
    if (payload.type === 'selling-point-script-asset') {
      sellingAssets = [{ id: result.id, name: payload.fileName, tag: '产品卖点脚本', main: payload.fileName, count: 1, targetGroups: [], status: '已入库', updatedAt: now, items: [{ id: `${result.id}_1`, content: payload.fileName, pointType: '主卖点', metadata: { source: 'upload' } }] }, ...sellingAssets];
    }
    if (payload.type === 'viral-link-script-asset') {
      viralAssets = [{ id: result.id, library: 'viral-script', name: payload.fileName, tag: '爆款脚本', status: '已入库', updatedAt: now, count: 0, summary: '上传脚本资产，待解析结构。', sections: [{ title: '脚本文案', content: '上传文件已入库，后续可解析为结构公式。' }] }, ...viralAssets];
    }
    return wait(result, 240);
  },
  getSellingAssets: () => wait(sellingAssets.map(toSellingListItem)),
  getSellingAssetDetail: (id) => wait(sellingAssets.find((asset) => asset.id === id) || sellingAssets[0]),
  optimizeBrief: (payload) => wait({ ...payload, summary: sellingSummary(payload) }, 360),

  scoreBrief: (payload, context = {}) => {
    const dimensions = [
      { name: '产品信息完整度', score: Math.min(100, (payload.productName ? 35 : 0) + (payload.productPrice ? 20 : 0) + (payload.productSlogan ? 20 : 0) + (payload.specialSellingPoint ? 25 : 0)), comment: payload.productName ? '产品基础信息已具备，可支撑脚本生成。' : '产品名称缺失，会影响后续脚本聚焦。' },
      { name: '主卖点清晰度', score: Math.min(100, (payload.mainSellingPoint?.length || 0) * 4), comment: payload.mainSellingPoint?.length > 12 ? '主卖点较明确，适合作为脚本核心记忆点。' : '主卖点偏短，建议补充具体利益点和使用结果。' },
      { name: '差异化竞争力', score: Math.min(100, (payload.specialSellingPoint?.length || 0) * 3), comment: payload.specialSellingPoint?.length > 20 ? '差异点表达较充分，可用于开头痛点对比。' : '差异化卖点不够具体，建议补充和竞品的区别。' },
      { name: '人群与场景匹配', score: Math.min(100, ((payload.suitableCrowd?.length || 0) + (payload.suitableScene?.length || 0)) * 3), comment: payload.suitableCrowd && payload.suitableScene ? '人群和场景都有描述，便于生成画面。' : '人群或场景不足，生成脚本可能泛化。' },
    ];
    const score = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);
    const risks = [];
    if (!payload.productName) risks.push('产品名称为空，模型无法稳定判断推广对象。');
    if (!payload.mainSellingPoint) risks.push('主卖点为空，脚本生成时缺少核心转化目标。');
    if (!payload.suitableCrowd || !payload.suitableScene) risks.push('人群或场景缺失，脚本画面可能不够具体。');
    const suggestions = [
      '将主卖点改写成“痛点 + 产品动作 + 用户收益”的一句话表达。',
      '补充一个最典型使用场景，方便后续生成分镜画面。',
      '把辅助卖点按重要程度排序，避免脚本里平均用力。',
    ];
    const summary = `大模型已按后台「Brief 评分检测」提示词完成评估，综合得分 ${score}/100。${score >= 80 ? '当前 Brief 可直接进入脚本生成。' : score >= 60 ? '当前 Brief 基本可用，建议按 AI 建议补强后再生成脚本。' : '当前 Brief 信息不足，建议先补齐核心卖点、人群和场景。'}`;
    const rawPreview = `Prompt: Brief 评分检测 v1.0\nModel: deepseek-chat\nBrief: ${context.briefName || payload.productName || '未命名 Brief'}\nVersion: ${context.version || payload.productVersion || '当前版本'}\nResult: score=${score}, risks=${risks.length}`;
    return wait({ score, summary, dimensions, suggestions, risks, modelProvider: 'DeepSeek 主模型', modelName: 'deepseek-chat', promptName: 'Brief 评分检测', promptVersion: 'v1.0', rawPreview }, 900);
  },

  compareBrief: (current, baseline, context = {}) => {
    const calcScore = (d) => Math.min(100, ((d.specialSellingPoint?.length > 10) ? 20 : 0) + ((d.mainSellingPoint?.length > 5) ? 30 : 0) + ((d.auxiliarySellingPoint?.length > 5) ? 15 : 0) + ((d.suitableCrowd?.length > 3) ? 20 : 0) + ((d.suitableScene?.length > 3) ? 15 : 0));
    const changes = [];
    const fields = [
      { key: 'specialSellingPoint', label: '特色卖点' },
      { key: 'mainSellingPoint', label: '主卖点' },
      { key: 'auxiliarySellingPoint', label: '辅助卖点' },
      { key: 'suitableCrowd', label: '适合人群' },
      { key: 'suitableScene', label: '适合场景' },
      { key: 'productPrice', label: '产品价格' },
      { key: 'productSlogan', label: '产品 Slogan' },
    ];
    fields.forEach(({ key, label }) => {
      const prev = baseline[key] || '';
      const curr = current[key] || '';
      if (curr !== prev) changes.push({ field: label, before: prev, after: curr, impact: curr.length > prev.length ? '信息更完整，可提升脚本生成约束力。' : '信息减少，生成时可能需要人工补充。' });
    });
    const score = calcScore(current);
    const baselineScore = calcScore(baseline);
    const summary = changes.length
      ? `大模型已按后台「Brief 版本对比检测」提示词完成分析：共识别 ${changes.length} 处关键变化，综合评分 ${baselineScore} → ${score}。重点关注卖点清晰度、目标人群匹配度和脚本生成风险。`
      : '两版本内容一致，未检测到变化。';
    const conclusion = score >= baselineScore ? '当前版本整体表达更完整，可作为后续脚本生成的推荐版本。' : '当前版本较基线版本信息有所弱化，建议补齐卖点和使用场景后再生成脚本。';
    const suggestions = changes.length
      ? ['保留新增的差异化卖点，并在脚本开头 3 秒内建立用户痛点。', '将主卖点拆成可拍摄的画面动作，避免停留在抽象表述。', '若目标人群或场景发生变化，请同步调整脚本模板和投放平台表达。']
      : ['两个版本差异较小，可直接沿用当前版本进入脚本生成。'];
    const risks = changes.filter((item) => !item.after).map((item) => `${item.field} 被清空，可能降低脚本生成质量。`);
    const rawPreview = `Prompt: Brief 版本对比检测 v1.2\nModel: deepseek-chat\nBrief: ${context.briefName || current.productName || '未命名 Brief'}\nVersions: ${context.baselineVersion || '基线'} -> ${context.currentVersion || '对比'}\nResult: ${summary}`;
    return wait({ ...current, summary, score, baselineScore, changes, modelProvider: 'DeepSeek 主模型', modelName: 'deepseek-chat', promptName: 'Brief 版本对比检测', promptVersion: 'v1.2', conclusion, suggestions, risks, rawPreview }, 900);
  },

  // --- Brief / Version store (per project) ---
  getProjectBriefStore: (projectId) => {
    ensureBriefStore(projectId);
    return wait(briefStores[projectId]);
  },
  createBrief: (projectId, payload) => {
    ensureBriefStore(projectId);
    const now = formatDateTime();
    const briefId = `brief_${Date.now()}`;
    const versionId = `ver_${Date.now()}`;
    const briefName = typeof payload === 'string' ? payload : (payload?.name || '未命名 Brief');
    const brief = {
      id: briefId,
      name: briefName,
      createdAt: now,
      updatedAt: now,
      activeVersionId: versionId,
      versions: [
        {
          id: versionId,
          label: 'v1.0',
          createdAt: now,
          updatedAt: now,
          data: {
            productName: '',
            brief: '',
            sellingPoints: [],
            primarySellingPoint: '',
            auxiliarySellingPoints: [],
            targetGroups: [],
            otherRequirements: '',
            productVersion: 'v1.0',
            productPrice: '',
            productSlogan: '',
            specialSellingPoint: '',
            mainSellingPoint: '',
            auxiliarySellingPoint: '',
            suitableCrowd: '',
            suitableScene: '',
            briefScore: 0,
          },
        },
      ],
    };
    briefStores[projectId].briefs = [brief, ...briefStores[projectId].briefs];
    briefStores[projectId].activeBriefId = briefId;
    return wait(briefStores[projectId], 220);
  },
  importBriefs: (projectId, file) => {
    ensureBriefStore(projectId);
    const now = formatDateTime();
    const briefId = `brief_import_${Date.now()}`;
    const versionId = `ver_import_${Date.now()}`;
    const data = {
      productName: '宠鲜鲜智能加热饭盒',
      brief: '低温慢热不破坏口感',
      sellingPoints: ['20 分钟快速加热', '分层防串味', '低温慢热不破坏口感'],
      primarySellingPoint: '20 分钟快速加热',
      auxiliarySellingPoints: ['分层防串味'],
      targetGroups: ['职场加班族'],
      otherRequirements: '',
      productVersion: 'v1.0',
      productPrice: '299',
      productSlogan: '热饭自由',
      specialSellingPoint: '低温慢热不破坏口感',
      mainSellingPoint: '20 分钟快速加热',
      auxiliarySellingPoint: '分层防串味',
      suitableCrowd: '职场加班族',
      suitableScene: '办公室晚餐',
      briefScore: 0,
    };
    briefStores[projectId].briefs = [{ id: briefId, name: '宠鲜鲜智能加热饭盒', createdAt: now, updatedAt: now, activeVersionId: versionId, versions: [{ id: versionId, label: 'v1.0', createdAt: now, updatedAt: now, data }] }, ...briefStores[projectId].briefs];
    briefStores[projectId].activeBriefId = briefId;
    return wait({ imported: 1, created: 1, versioned: 0, fileName: file.name, store: briefStores[projectId] }, 360);
  },
  createBriefVersion: (projectId, payload) => {
    ensureBriefStore(projectId);
    const store = briefStores[projectId];
    const brief = store.briefs.find((b) => b.id === payload.briefId);
    if (!brief) return wait(store);
    const now = formatDateTime();
    const versionId = `ver_${Date.now()}`;
    const activeVersion = brief.versions.find((v) => v.id === brief.activeVersionId) || brief.versions[0];
    const nextData = payload.seed === 'blank'
      ? {
        productName: '',
        brief: '',
        sellingPoints: [],
        primarySellingPoint: '',
        auxiliarySellingPoints: [],
        targetGroups: [],
        otherRequirements: '',
        productVersion: payload.label,
        productPrice: '',
        productSlogan: '',
        specialSellingPoint: '',
        mainSellingPoint: '',
        auxiliarySellingPoint: '',
        suitableCrowd: '',
        suitableScene: '',
        briefScore: 0,
      }
      : { ...activeVersion.data, productVersion: payload.label };

    brief.versions = [
      {
        id: versionId,
        label: payload.label,
        createdAt: now,
        updatedAt: now,
        data: nextData,
      },
      ...brief.versions,
    ];
    brief.activeVersionId = versionId;
    brief.updatedAt = now;
    store.activeBriefId = brief.id;
    return wait(store, 220);
  },
  getBriefVersions: (projectId, briefId) => {
    ensureBriefStore(projectId);
    const brief = briefStores[projectId].briefs.find((b) => b.id === briefId);
    return wait(brief?.versions || []);
  },
  setActiveBrief: (projectId, payload) => {
    ensureBriefStore(projectId);
    briefStores[projectId].activeBriefId = payload.briefId;
    return wait(briefStores[projectId]);
  },
  setActiveVersion: (projectId, payload) => {
    ensureBriefStore(projectId);
    const store = briefStores[projectId];
    const brief = store.briefs.find((b) => b.id === payload.briefId);
    if (!brief) return wait({ projectId, briefId: payload.briefId, activeBriefId: store.activeBriefId, activeVersionId: payload.versionId, brief: null, version: null });
    brief.activeVersionId = payload.versionId;
    brief.updatedAt = formatDateTime();
    store.activeBriefId = brief.id;
    const version = brief.versions.find((v) => v.id === payload.versionId) || brief.versions[0];
    return wait({ projectId, briefId: brief.id, activeBriefId: brief.id, activeVersionId: version.id, brief: { ...brief, versions: [version] }, version });
  },
  saveBriefVersion: (projectId, payload) => {
    ensureBriefStore(projectId);
    const store = briefStores[projectId];
    const brief = store.briefs.find((b) => b.id === payload.briefId);
    const now = formatDateTime();
    if (!brief) return wait({ projectId, briefId: payload.briefId, versionId: payload.versionId, savedAt: now });
    const ver = brief.versions.find((v) => v.id === payload.versionId);
    if (ver) {
      ver.data = { ...ver.data, ...payload.data };
      ver.score = payload.score ?? ver.score;
      ver.updatedAt = now;
    }
    brief.updatedAt = now;
    return wait({ projectId, briefId: payload.briefId, versionId: payload.versionId, savedAt: now });
  },
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
  getScriptFormats: () => wait(scriptFormats),
  extractViralCopy: (url) => wait({ sourceTitle: '加班冷饭痛点爆款视频', transcript: `我真的受够了每天加班只能吃冷饭。\n外卖等太久，微波炉又总排队。\n后来我换了这个加热饭盒，插电 20 分钟就能吃上热饭。\n分层放菜也不会串味，办公室吃饭终于不用将就。\n如果你也经常加班，可以试试这种方式。\n来源链接：${url}` }, 520),
  analyzeViralCopy: (transcript) => wait({ emotions: ['加班委屈', '效率焦虑', '被照顾感'], keyMessages: ['冷饭痛点', '20 分钟快速加热', '分层不串味', '办公室真实场景'], summary: `文案围绕“加班吃冷饭”的真实痛点展开，用低成本解决方案完成情绪转正。原文长度 ${transcript.length} 字。` }, 520),
  breakdownViralStructure: () => wait({ title: '冷饭痛点复刻结构', hook: '用“受够了”开场制造情绪张力', turningPoints: ['外卖等待与微波炉排队放大问题', '产品出现后给出确定性解决方案', '热饭入口完成情绪释放'], formula: '痛点控诉 -> 场景放大 -> 产品救场 -> 结果证明 -> 轻 CTA', sections: [{ title: '开头钩子', points: ['直接说出痛点', '语气真实不广告'] }, { title: '中段证明', points: ['用时间数字证明效率', '用分层画面证明体验'] }, { title: '结尾转化', points: ['用“可以试试”弱 CTA', '适合收藏/评论引导'] }] }, 520),
  getTemplateCategories: () => wait(scriptTemplateCategories),
  getTemplates: (categoryId) => wait(scriptTemplates.filter((item) => item.categoryId === categoryId)),
  getTemplateDetail: (templateId) => wait(scriptTemplates.find((item) => item.id === templateId) || scriptTemplates[0]),
  getImportTemplate: (code) => wait(importTemplates[code]),
  parseImportTemplate: async (code, file) => {
    const template = importTemplates[code];
    return wait({
      templateCode: code,
      fileName: file.name,
      rowCount: template.sampleRows.length,
      rows: template.sampleRows.map((row) => Object.fromEntries(template.columns.map((column, index) => [column, row[index] || '']))),
      fields: {
        productName: template.sampleRows[0]?.[0] || '',
        primarySellingPoint: template.sampleRows[0]?.[1] || '',
        auxiliarySellingPoint: template.sampleRows[0]?.[2] || '',
        targetGroups: template.sampleRows[0]?.[3] || '',
        suitableScene: template.sampleRows[0]?.[4] || '',
        specialSellingPoint: template.sampleRows[0]?.[5] || '',
        otherRequirements: template.sampleRows[0]?.[6] || '',
      },
    });
  },
  generateScriptDraft: (payload) => wait(buildGeneratedScript(payload), 680),
  saveGeneratedScript: (projectId, script) => {
    scriptLibrary = [{ ...script, id: script.id || `script_${Date.now()}` }, ...scriptLibrary];
    return wait({ savedAt: formatDateTime() }, 260);
  },
  getScriptLibrary: (category) => {
    const scripts = scriptLibrary.map(toLibraryScript).filter((item) => category === 'mine' || category === 'product' || item.sourceType === category);
    return wait({ category, total: scripts.length, scripts });
  },
  polishScript: (scriptId) => {
    const base = scriptLibrary.find((item) => item.id === scriptId) || scriptLibrary[0];
    const polished = {
      ...base,
      id: `${base.id}_polished`,
      title: `${base.title}_润色版`,
      content: `${base.content}\n\nAI 润色建议：开头更强钩子，中段增加画面动作，结尾 CTA 更轻。`,
      rows: (base.rows || []).map((row, index) => ({ ...row, line: index === 0 ? `先别急着划走，${row.line}` : row.line, note: `${row.note} / 已润色` })),
    };
    return wait(polished, 620);
  },
  savePolishedScript: (scriptId, script) => {
    scriptLibrary = [{ ...script, id: scriptId, title: script.title.replace(/_润色版$/, '') }, ...scriptLibrary.filter((item) => item.id !== scriptId)];
    return wait({ savedAt: formatDateTime() }, 260);
  },
  getTaskProgress: () => wait({ status: 'running', progress: 76, label: '正在生成镜号 03 视频片段' }, 220),
  exportVideo: () => wait({ fileName: '宠鲜鲜加热饭盒_成片.mp4', url: '#' }, 360),
  uploadAvatar: (projectId, file) => wait({ avatarUrl: `https://via.placeholder.com/120/1a3c2a/00D084?text=avatar` }, 300),
};
