const currentUser = {
  id: 'admin_001',
  name: '系统管理员',
  email: 'admin@ai-script.local',
  role: '超级管理员',
  tenantScope: '全部品牌',
  brandName: undefined,
  permissions: ['*'],
};

let apiProviders = [
  {
    id: 'api_001',
    providerName: 'DeepSeek API',
    providerType: 'llm',
    platform: 'deepseek',
    endpointUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKeyRef: 'env:DEEPSEEK_API_KEY',
    description: '用于 Brief 评分、版本对比和脚本生成的主力文本模型。',
    status: 'active',
    priority: 1,
    callCount: 12543,
    successRate: 99.2,
    avgResponseTime: 850,
  },
  {
    id: 'api_002',
    providerName: 'OpenAI GPT-4o Mini',
    providerType: 'llm',
    platform: 'openai',
    endpointUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKeyRef: 'env:OPENAI_API_KEY',
    description: 'LLM 备用模型，主供应商失败时可切换。',
    status: 'active',
    priority: 2,
    callCount: 8234,
    successRate: 98.8,
    avgResponseTime: 1200,
  },
  {
    id: 'api_003',
    providerName: '通义千问',
    providerType: 'llm',
    platform: 'dashscope',
    endpointUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    apiKeyRef: 'env:DASHSCOPE_API_KEY',
    description: '通义千问兼容接口，用于中文脚本生成与文案优化。',
    status: 'inactive',
    priority: 3,
    callCount: 3421,
    successRate: 97.5,
    avgResponseTime: 1500,
  },
  {
    id: 'api_004',
    providerName: 'Azure TTS',
    providerType: 'tts',
    platform: 'azure',
    endpointUrl: 'https://eastasia.tts.speech.microsoft.com',
    apiKeyRef: 'env:AZURE_TTS_KEY',
    description: '把脚本文案转换成配音音频。',
    status: 'active',
    priority: 1,
    callCount: 5678,
    successRate: 99.8,
    avgResponseTime: 450,
  },
  {
    id: 'api_005',
    providerName: 'SiliconFlow ASR',
    providerType: 'asr',
    platform: 'siliconflow',
    endpointUrl: 'https://api.siliconflow.cn/v1/audio/transcriptions',
    model: 'FunAudioLLM/SenseVoiceSmall',
    apiKeyRef: 'env:SILICONFLOW_API_KEY',
    description: '文案提取使用的视频语音转文字 Provider。',
    status: 'active',
    priority: 1,
    callCount: 128,
    successRate: 98.5,
    avgResponseTime: 2600,
  },
  {
    id: 'api_006',
    providerName: '主解析 API',
    providerType: 'parser',
    platform: 'multi-platform',
    endpointUrl: 'https://parser.example.com/parse',
    apiKeyRef: 'env:VIDEO_PARSE_API_KEY',
    description: '解析抖音、小红书等分享链接，返回视频地址、封面和标题。',
    status: 'active',
    priority: 1,
    callCount: 260,
    successRate: 96.2,
    avgResponseTime: 900,
  },
];

let importTemplates = [
  {
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
];

const parseProviders = [
  { id: 'parse_001', platform: '抖音', apiName: 'TikTok Parser Pro', status: 'active', callCount: 15234, successRate: 96.8 },
  { id: 'parse_002', platform: '小红书', apiName: 'XHS Extract API', status: 'active', callCount: 9876, successRate: 94.2 },
  { id: 'parse_003', platform: '视频号', apiName: 'WeChat Video Parser', status: 'inactive', callCount: 4532, successRate: 91.5 },
];

let promptTemplates = [
  {
    id: 'prompt_brief_score',
    scene: 'brief_score',
    name: 'Brief 评分检测',
    version: 'v1.0',
    providerId: 'api_001',
    providerName: 'DeepSeek 主模型',
    model: 'deepseek-chat',
    systemPrompt: '你是资深短视频增长策略师，请对单个产品 Brief 做质量评分，重点评估信息完整度、主卖点清晰度、差异化竞争力、人群与场景匹配度，并给出可执行优化建议。',
    userPromptTemplate: '产品 Brief：{{briefName}}\n版本：{{version}}\nBrief 内容：{{brief}}\n请输出综合评分、维度评分、检测结论、风险提醒和优化建议。',
    outputSchema: '{ "score": 0, "summary": "", "dimensions": [{ "name": "", "score": 0, "comment": "" }], "suggestions": [], "risks": [] }',
    status: 'active',
    updatedAt: '2026-05-28 17:05:00',
  },
  {
    id: 'prompt_brief_compare',
    scene: 'brief_compare',
    name: 'Brief 版本对比检测',
    version: 'v1.2',
    providerId: 'api_001',
    providerName: 'DeepSeek 主模型',
    model: 'deepseek-chat',
    systemPrompt: '你是资深短视频增长策略师，请对两个产品 Brief 版本做结构化差异检测，重点判断卖点清晰度、目标人群匹配度、脚本生成风险和优化建议。',
    userPromptTemplate: '产品 Brief：{{briefName}}\n基线版本：{{baselineVersion}}\n对比版本：{{currentVersion}}\n基线内容：{{baselineBrief}}\n对比内容：{{currentBrief}}\n请输出评分、关键变化、风险和建议。',
    outputSchema: '{ "score": 0, "baselineScore": 0, "summary": "", "changes": [{ "field": "", "before": "", "after": "", "impact": "" }], "suggestions": [], "risks": [], "conclusion": "" }',
    status: 'active',
    updatedAt: '2026-05-28 16:50:00',
  },
];

const apiContracts = [
  {
    module: '认证',
    name: '后台登录',
    method: 'POST',
    path: '/api/admin/auth/login',
    requestParams: { account: 'admin@ai-script.local', password: '123456', rememberMe: true },
    responseBody: { token: 'admin:<userId>', user: currentUser },
    description: '管理员登录并返回后台会话。',
  },
  {
    module: '认证',
    name: '当前用户',
    method: 'GET',
    path: '/api/admin/auth/current-user',
    requestParams: {},
    responseBody: currentUser,
    description: '根据 Authorization token 返回当前后台用户。',
  },
  {
    module: '菜单',
    name: '动态菜单',
    method: 'GET',
    path: '/api/admin/menus',
    requestParams: {},
    responseBody: { list: 'AdminMenuItem[]' },
    description: '后台侧边栏菜单，前端按 enabled、permission、order 渲染。',
  },
  {
    module: '数据概览',
    name: '运营总览',
    method: 'GET',
    path: '/api/admin/dashboard/overview',
    requestParams: { range: '7d' },
    responseBody: { headline: 'DashboardOverview.headline', stats: 'DashboardStat[]', trends: 'TrendPoint[]' },
    description: '后台首页运营指标、趋势图和系统状态。',
  },
  {
    module: 'API 管理',
    name: 'Provider 列表',
    method: 'GET',
    path: '/api/admin/api-providers',
    requestParams: { providerType: 'llm', status: 'active' },
    responseBody: { list: 'ApiProvider[]' },
    description: '查询模型、TTS、解析等外部 API Provider。',
  },
  {
    module: 'API 管理',
    name: '新增 Provider',
    method: 'POST',
    path: '/api/admin/api-providers',
    requestParams: { providerName: 'DeepSeek', providerType: 'llm', platform: 'deepseek', endpointUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', apiKeyRef: 'env:DEEPSEEK_API_KEY', priority: 1 },
    responseBody: { id: 'api_001', status: 'active' },
    description: '新增 OpenAI-compatible 或其他供应商配置，密钥建议传 env 引用。',
  },
  {
    module: 'API 管理',
    name: '更新 Provider 状态',
    method: 'PATCH',
    path: '/api/admin/api-providers/{id}/status',
    requestParams: { status: 'active' },
    responseBody: { id: 'api_001', status: 'active' },
    description: '启用或停用模型、TTS、解析等外部 API Provider。',
  },
  {
    module: 'API 管理',
    name: '解析 Provider 列表',
    method: 'GET',
    path: '/api/admin/parse-providers',
    requestParams: {},
    responseBody: { list: 'ParseProvider[]' },
    description: '查询视频解析 API Provider 状态和调用指标。',
  },
  {
    module: 'API 管理',
    name: '接口契约列表',
    method: 'GET',
    path: '/api/admin/api-contracts',
    requestParams: {},
    responseBody: { list: 'ApiContract[]' },
    description: '返回后台当前对接接口格式，供前后端联调查看。',
  },
  {
    module: 'API 管理',
    name: '提示词模板列表',
    method: 'GET',
    path: '/api/admin/prompt-templates',
    requestParams: { scene: 'brief_compare' },
    responseBody: { list: 'PromptTemplate[]' },
    description: '配置大模型业务场景提示词，前台 Brief 对比检测等功能按启用模板调用。',
  },
  {
    module: 'API 管理',
    name: '更新提示词模板',
    method: 'PATCH',
    path: '/api/admin/prompt-templates/{id}',
    requestParams: { systemPrompt: '...', userPromptTemplate: '...', outputSchema: '{...}', status: 'active' },
    responseBody: { id: 'prompt_brief_score', status: 'active' },
    description: '保存业务场景大模型提示词配置。',
  },
  {
    module: '产品 Brief',
    name: '大模型评分检测',
    method: 'POST',
    path: '/api/product-brief/score',
    requestParams: { brief: 'ProductBriefInput', context: { briefName: '产品名', version: 'v1.0' } },
    responseBody: { score: 86, summary: 'AI 结论', dimensions: 'BriefScoreDimension[]', suggestions: 'string[]', risks: 'string[]', rawPreview: 'string' },
    description: '后端读取启用的 Brief 评分提示词，调用已启用大模型 Provider 后返回前台评分预览结果。',
  },
  {
    module: '产品 Brief',
    name: '大模型对比检测',
    method: 'POST',
    path: '/api/product-brief/compare',
    requestParams: { current: 'ProductBriefInput', baseline: 'ProductBriefInput', context: { briefName: '产品名', baselineVersion: 'v1.0', currentVersion: 'v2.0' } },
    responseBody: { score: 86, baselineScore: 72, summary: 'AI 结论', changes: 'BriefChange[]', suggestions: 'string[]', risks: 'string[]', rawPreview: 'string' },
    description: '后端读取启用的 Brief 对比提示词，调用已启用大模型 Provider 后返回前台预览结果。',
  },
  {
    module: '知识库',
    name: '知识库列表',
    method: 'GET',
    path: '/api/admin/knowledge-base',
    requestParams: { keyword: '痛点', tab: 'structure' },
    responseBody: { structureFormulas: 'StructureFormula[]', productKnowledge: 'ProductKnowledge[]', materialTags: 'MaterialTag[]' },
    description: '查询结构公式、产品卖点知识库和素材标签体系。',
  },
  {
    module: '审核',
    name: '审核任务总览',
    method: 'GET',
    path: '/api/admin/audit/overview',
    requestParams: { status: 'pending' },
    responseBody: { stats: 'AuditStat[]', tasks: 'AuditTask[]', history: 'AuditHistory[]' },
    description: '获取审核工作台统计、待审任务和审核记录。',
  },
  {
    module: '审核',
    name: '提交审核结果',
    method: 'POST',
    path: '/api/admin/audit/tasks/{taskId}/review',
    requestParams: { result: 'approved', comment: '内容合规，通过' },
    responseBody: { success: true },
    description: '审核员提交通过或驳回意见。',
  },
  {
    module: '项目',
    name: '项目列表',
    method: 'GET',
    path: '/api/admin/projects',
    requestParams: { keyword: '保温杯', brand: '品牌A', status: 'completed' },
    responseBody: { list: 'AdminProject[]' },
    description: '查询所有品牌的视频制作项目。',
  },
  {
    module: '用户',
    name: '用户列表',
    method: 'GET',
    path: '/api/admin/users',
    requestParams: { keyword: '张三', role: '品牌管理员', status: 'active' },
    responseBody: { list: 'ManagedUser[]' },
    description: '用户账号和权限管理。',
  },
  {
    module: '用户',
    name: '新增用户',
    method: 'POST',
    path: '/api/admin/users',
    requestParams: { name: '张三', email: 'zhangsan@example.com', role: '品牌管理员', brand: '品牌A' },
    responseBody: { id: 'user_001', status: 'active' },
    description: '创建后台用户账号。',
  },
  {
    module: '用户',
    name: '更新用户状态',
    method: 'POST',
    path: '/api/admin/users/{id}/enable 或 /api/admin/users/{id}/disable',
    requestParams: {},
    responseBody: { id: 'user_001', status: 'inactive' },
    description: '启用或禁用后台用户账号。',
  },
  {
    module: '权限',
    name: '角色权限列表',
    method: 'GET',
    path: '/api/admin/roles',
    requestParams: {},
    responseBody: { list: 'RolePermission[]' },
    description: '查询角色权限包和关联用户数量。',
  },
  {
    module: '日志',
    name: '操作日志',
    method: 'GET',
    path: '/api/admin/operation-logs',
    requestParams: { keyword: 'API', module: 'API管理', status: 'success', page: 1, pageSize: 10 },
    responseBody: { list: 'OperationLog[]', total: 6, page: 1, pageSize: 10 },
    description: '查询用户关键操作行为。',
  },
];

const menus = [
  { id: 'dashboard', label: '数据概览', icon: 'dashboard', path: '/admin/dashboard', enabled: true, order: 10, permission: 'dashboard' },
  { id: 'knowledge', label: '知识库', icon: 'book', path: '/admin/knowledge', enabled: true, order: 30, permission: 'knowledge' },
  { id: 'audit', label: '审核工作流', icon: 'shield', path: '/admin/audit', enabled: true, order: 40, permission: 'audit' },
  { id: 'materials', label: '项目管理', icon: 'folder', path: '/admin/materials', enabled: true, order: 50, permission: 'materials' },
  { id: 'analytics', label: '投放数据', icon: 'chart', path: '/admin/analytics', enabled: true, order: 60, permission: 'analytics' },
  { id: 'llm', label: '大模型管理', icon: 'cpu', path: '/admin/llm', enabled: true, order: 70, permission: 'llm' },
  { id: 'users', label: '用户管理', icon: 'users', path: '/admin/users', enabled: true, order: 80, permission: 'users' },
  { id: 'roles', label: '角色权限', icon: 'key', path: '/admin/roles', enabled: true, order: 90, permission: 'roles' },
  { id: 'logs', label: '操作日志', icon: 'list', path: '/admin/logs', enabled: true, order: 100, permission: 'logs' },
  { id: 'system', label: '系统字典', icon: 'settings', path: '/admin/system', enabled: true, order: 110, permission: 'system' },
];

const dashboard = {
  headline: {
    totalOutput: 245,
    approvalRate: '91%',
    description: '聚合脚本生产、视频生成、品牌活跃和审核压力，帮助运营团队快速识别今日瓶颈。',
  },
  stats: [
    { title: '今日脚本生成', value: '156', change: '+12.5%', trend: 'up', tone: '#2563eb', bg: '#eff6ff', icon: 'file', meta: '较昨日多 17 条' },
    { title: '今日视频生成', value: '89', change: '+8.3%', trend: 'up', tone: '#16a34a', bg: '#f0fdf4', icon: 'video', meta: '平均耗时 11 分钟' },
    { title: '活跃品牌数', value: '24', change: '+3', trend: 'up', tone: '#f97316', bg: '#fff7ed', icon: 'users', meta: '6 个品牌高频使用' },
    { title: '待审核任务', value: '12', change: '-2', trend: 'down', tone: '#dc2626', bg: '#fef2f2', icon: 'shield', meta: '最久等待 38 分钟' },
  ],
  trends: [
    { name: '周一', scriptCount: 45, videoCount: 32, approvedCount: 28 },
    { name: '周二', scriptCount: 52, videoCount: 38, approvedCount: 35 },
    { name: '周三', scriptCount: 48, videoCount: 42, approvedCount: 39 },
    { name: '周四', scriptCount: 61, videoCount: 45, approvedCount: 41 },
    { name: '周五', scriptCount: 55, videoCount: 48, approvedCount: 44 },
    { name: '周六', scriptCount: 38, videoCount: 28, approvedCount: 25 },
    { name: '周日', scriptCount: 42, videoCount: 35, approvedCount: 32 },
  ],
  platformDistribution: [
    { name: '抖音', count: 234 },
    { name: '小红书', count: 156 },
    { name: '视频号', count: 98 },
    { name: '快手', count: 67 },
  ],
  systemMetrics: [
    { label: 'CPU 使用率', value: 45, color: '#2563eb', detail: '运行平稳' },
    { label: '内存使用率', value: 62, color: '#f97316', detail: '缓存命中提升' },
    { label: '存储使用率', value: 78, color: '#dc2626', detail: '建议本周归档' },
  ],
};

const knowledge = {
  structureFormulas: [
    { id: 'formula_001', name: '痛点-方案-效果', platform: '抖音', category: '快消品', useCount: 234, successRate: 87.5, createTime: '2026-03-15' },
    { id: 'formula_002', name: '开门见山-卖点展示-限时优惠', platform: '小红书', category: '美妆', useCount: 189, successRate: 92.3, createTime: '2026-04-01' },
    { id: 'formula_003', name: '场景代入-产品植入-行动号召', platform: '抖音', category: '生活用品', useCount: 156, successRate: 85.8, createTime: '2026-04-10' },
  ],
  productKnowledge: [
    { id: 'product_001', productName: '宠鲜鲜智能加热饭盒', brand: '北钥宠物生活', corePoints: '分仓保鲜,低温慢热,宠物友好材质', tags: ['核心卖点', '功能卖点'], updateTime: '2026-05-10' },
    { id: 'product_002', productName: '分层便当盒', brand: '北钥宠物生活', corePoints: '防串味,可微波,轻量便携', tags: ['场景化卖点', '测评卖点'], updateTime: '2026-05-12' },
  ],
  materialTags: [
    { id: 'tag_001', name: '产品特写', count: 456, category: '景别类型' },
    { id: 'tag_002', name: '场景全景', count: 234, category: '景别类型' },
    { id: 'tag_003', name: '情绪激昂', count: 189, category: '情绪标签' },
    { id: 'tag_004', name: '温馨治愈', count: 167, category: '情绪标签' },
  ],
  originalTemplates: [
    { id: 'tpl_001', name: '产品介绍模板库', structure: '痛点开场 -> 产品亮相 -> 卖点证明 -> 轻 CTA', scenario: '产品介绍模板库', prompt: '适合新品讲解、功能说明和转化承接。', platform: '抖音', status: 'active', updatedAt: '2026-05-29' },
    { id: 'tpl_002', name: '好爽排比式模板库', structure: '连续爽点排比 -> 核心卖点放大 -> 使用场景叠加 -> 结果收束', scenario: '好爽排比式模板库', prompt: '适合节奏强、口播密集的卖点表达。', platform: '抖音', status: 'active', updatedAt: '2026-05-29' },
  ],
};

let auditTasks = [
  { id: 'audit_001', scriptName: '保温杯新品推广脚本', brand: '品牌A', submitter: '张三', submitTime: '2026-05-13 10:30', status: 'pending', stage: '运营审核', priority: 'high' },
  { id: 'audit_002', scriptName: '美白精华618活动', brand: '品牌B', submitter: '李四', submitTime: '2026-05-13 09:15', status: 'reviewing', stage: '法务审核', priority: 'normal' },
  { id: 'audit_003', scriptName: '智能手表功能介绍', brand: '品牌C', submitter: '王五', submitTime: '2026-05-12 16:45', status: 'approved', stage: '已完成', priority: 'normal' },
  { id: 'audit_004', scriptName: '健身器材促销', brand: '品牌A', submitter: '赵六', submitTime: '2026-05-12 14:20', status: 'rejected', stage: '运营审核', priority: 'low' },
];

let auditHistory = [
  { id: 'history_001', scriptName: '保温杯新品推广脚本', auditor: '审核员A', stage: '运营审核', result: 'approved', comment: '内容合规，通过', time: '2026-05-13 11:30' },
  { id: 'history_002', scriptName: '美白精华618活动', auditor: '审核员B', stage: '法务审核', result: 'pending', comment: '需确认功效描述', time: '2026-05-13 10:00' },
];

const projects = [
  { id: 'project_001', name: '保温杯新品推广', brand: '品牌A', status: 'completed', creator: '张三', createTime: '2026-05-10', scriptCount: 3, videoCount: 2, thumbnail: 'https://images.unsplash.com/photo-1523575708161-ad0fc2a9b951?w=400&h=300&fit=crop' },
  { id: 'project_002', name: '美白精华618活动', brand: '品牌B', status: 'generating', creator: '李四', createTime: '2026-05-12', scriptCount: 2, videoCount: 1, thumbnail: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=400&h=300&fit=crop' },
  { id: 'project_003', name: '智能手表功能介绍', brand: '品牌C', status: 'reviewing', creator: '王五', createTime: '2026-05-13', scriptCount: 1, videoCount: 0, thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop' },
  { id: 'project_004', name: '健身器材促销', brand: '品牌A', status: 'draft', creator: '赵六', createTime: '2026-05-11', scriptCount: 1, videoCount: 0, thumbnail: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=300&fit=crop' },
];

let users = [
  { id: 'user_001', name: '张三', email: 'zhangsan@example.com', role: '超级管理员', brand: '-', status: 'active', lastLogin: '2026-05-13 10:30', createTime: '2025-01-15' },
  { id: 'user_002', name: '李四', email: 'lisi@example.com', role: '品牌管理员', brand: '品牌A', status: 'active', lastLogin: '2026-05-13 09:15', createTime: '2025-03-20' },
  { id: 'user_003', name: '王五', email: 'wangwu@example.com', role: '审核员', brand: '品牌B', status: 'active', lastLogin: '2026-05-12 16:45', createTime: '2025-06-10' },
  { id: 'user_004', name: '赵六', email: 'zhaoliu@example.com', role: '品牌管理员', brand: '品牌C', status: 'inactive', lastLogin: '2026-05-01 14:20', createTime: '2025-08-05' },
];

const roles = [
  { id: 'role_001', name: '超级管理员', permissions: ['全部权限'], userCount: 2, color: 'error' },
  { id: 'role_002', name: '品牌管理员', permissions: ['知识库管理', '项目管理', '素材管理', '数据查看'], userCount: 8, color: 'primary' },
  { id: 'role_003', name: '审核员', permissions: ['审核管理', '数据查看'], userCount: 15, color: 'warning' },
];

const logs = [
  { id: 'log_001', user: '张三', action: '创建API配置', module: 'API管理', detail: '添加了 DeepSeek API 配置', ip: '192.168.1.100', time: '2026-05-13 10:30:25', status: 'success' },
  { id: 'log_002', user: '李四', action: '审核脚本', module: '审核工作流', detail: '审核通过: 保温杯新品推广脚本', ip: '192.168.1.101', time: '2026-05-13 10:15:42', status: 'success' },
  { id: 'log_003', user: '王五', action: '添加知识库', module: '知识库管理', detail: '添加结构公式: 痛点-方案-效果', ip: '192.168.1.102', time: '2026-05-13 09:45:18', status: 'success' },
  { id: 'log_004', user: '赵六', action: '删除用户', module: '用户管理', detail: '删除用户: 测试账号01', ip: '192.168.1.103', time: '2026-05-13 09:30:55', status: 'warning' },
  { id: 'log_005', user: '张三', action: '修改API配置', module: 'API管理', detail: '更新 OpenAI API 优先级', ip: '192.168.1.100', time: '2026-05-13 09:10:33', status: 'success' },
  { id: 'log_006', user: 'System', action: 'API调用失败', module: '系统监控', detail: '通义千问调用超时', ip: '-', time: '2026-05-13 08:55:12', status: 'error' },
];

function delay(value) {
  return new Promise((resolve) => window.setTimeout(() => resolve(structuredClone(value)), 180));
}

function containsKeyword(item, keyword) {
  if (!keyword) return true;
  return JSON.stringify(item).toLowerCase().includes(String(keyword).toLowerCase());
}

function auditOverview() {
  return {
    stats: [
      { label: '待审核', value: auditTasks.filter((item) => item.status === 'pending').length, color: '#f97316' },
      { label: '审核中', value: auditTasks.filter((item) => item.status === 'reviewing').length, color: '#2563eb' },
      { label: '今日已审', value: 23, color: '#16a34a' },
      { label: '驳回', value: auditTasks.filter((item) => item.status === 'rejected').length, color: '#dc2626' },
    ],
    tasks: auditTasks,
    history: auditHistory,
  };
}

export const mockApi = {
  login(payload) {
    if (!payload.account || !payload.password) {
      return Promise.reject(new Error('请输入账号和密码'));
    }

    return delay({ token: `admin:${currentUser.id}`, user: currentUser });
  },
  getCurrentUser() {
    return delay(currentUser);
  },
  getMenus() {
    return delay(menus);
  },
  getDashboardOverview() {
    return delay(dashboard);
  },
  getApiProviders() {
    return delay(apiProviders);
  },
  createApiProvider(payload) {
    const provider = {
      id: `api_${Date.now()}`,
      status: 'active',
      callCount: 0,
      successRate: 100,
      avgResponseTime: 0,
      ...payload,
    };
    apiProviders = [provider, ...apiProviders];
    return delay(provider);
  },
  updateApiProvider(id, payload) {
    apiProviders = apiProviders.map((item) => (item.id === id ? { ...item, ...payload } : item));
    return delay(apiProviders.find((item) => item.id === id));
  },
  updateApiProviderStatus(id, status) {
    apiProviders = apiProviders.map((item) => (item.id === id ? { ...item, status } : item));
    return delay(apiProviders.find((item) => item.id === id));
  },
  getParseProviders() {
    return delay(parseProviders);
  },
  getApiContracts() {
    return delay(apiContracts);
  },
  getPromptTemplates() {
    return delay(promptTemplates);
  },
  updatePromptTemplate(id, payload) {
    promptTemplates = promptTemplates.map((item) => (item.id === id ? { ...item, ...payload, updatedAt: '刚刚' } : item));
    return delay(promptTemplates.find((item) => item.id === id));
  },
  getKnowledgeBase(query = {}) {
    const keyword = query.keyword;
    return delay({
      structureFormulas: knowledge.structureFormulas.filter((item) => containsKeyword(item, keyword)),
      productKnowledge: knowledge.productKnowledge.filter((item) => containsKeyword(item, keyword)),
      materialTags: knowledge.materialTags.filter((item) => containsKeyword(item, keyword)),
      originalTemplates: knowledge.originalTemplates.filter((item) => containsKeyword(item, keyword)),
    });
  },
  createOriginalTemplate(payload) {
    const item = { id: `tpl_${Date.now()}`, updatedAt: '刚刚', ...payload };
    knowledge.originalTemplates = [item, ...knowledge.originalTemplates];
    return delay(item);
  },
  updateOriginalTemplate(id, payload) {
    knowledge.originalTemplates = knowledge.originalTemplates.map((item) => (item.id === id ? { ...item, ...payload, updatedAt: '刚刚' } : item));
    return delay(knowledge.originalTemplates.find((item) => item.id === id));
  },
  deleteOriginalTemplate(id) {
    knowledge.originalTemplates = knowledge.originalTemplates.map((item) => (item.id === id ? { ...item, status: 'inactive', updatedAt: '刚刚' } : item));
    return delay({ id, status: 'inactive' });
  },
  getAuditOverview() {
    return delay(auditOverview());
  },
  reviewTask(payload) {
    const task = auditTasks.find((item) => item.id === payload.taskId);
    if (task) {
      task.status = payload.result;
      task.stage = '已完成';
      auditHistory = [
        {
          id: `history_${Date.now()}`,
          scriptName: task.scriptName,
          auditor: currentUser.name,
          stage: task.stage,
          result: payload.result,
          comment: payload.comment,
          time: '刚刚',
        },
        ...auditHistory,
      ];
    }
    return delay({ success: true });
  },
  getProjects(query = {}) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 12);
    const filtered = projects.filter((item) => containsKeyword(item, query.keyword) && (!query.status || item.status === query.status) && (!query.brand || item.brand === query.brand));
    return delay({ list: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize });
  },
  getProjectDetail(id) {
    const project = projects.find((item) => item.id === id) || projects[0];
    return delay({
      project: { ...project, productName: '智能保温杯', platform: '抖音', currentStep: '脚本生成', progress: 72 },
      briefs: [
        {
          id: 'brief_001',
          productName: '智能保温杯',
          primarySellingPoint: '长效保温 + 温度显示',
          targetGroups: ['通勤上班族', '户外运动人群'],
          otherRequirements: '突出冬季通勤和办公室热饮场景。',
          briefText: '面向通勤上班族，突出长效保温、杯盖温度显示和轻量便携。',
          status: 'draft',
          version: 2,
          updatedAt: '刚刚',
          sellingPoints: [
            { id: 'sp_001', content: '12 小时长效保温', pointType: 'primary', order: 1 },
            { id: 'sp_002', content: '杯盖实时温度显示', pointType: 'auxiliary', order: 2 },
          ],
        },
      ],
      scripts: [
        {
          id: 'script_001',
          name: '智能保温杯_通勤场景脚本',
          status: 'draft',
          auditStatus: 'not_submitted',
          versionNo: 1,
          versionTitle: 'v1 初稿',
          updatedAt: '刚刚',
          content: { content: '冷风通勤，热饮刚好入口。' },
          shots: [
            { shot: '镜头 01', type: '特写', scene: '清晨地铁站，人物握着保温杯。', line: '冬天通勤，最怕热饮很快变冷。', duration: '3s', note: '痛点开场', risk: 'low' },
            { shot: '镜头 02', type: '近景', scene: '杯盖显示温度，打开有热气。', line: '看得到温度，入口刚刚好。', duration: '4s', note: '卖点展示', risk: 'low' },
          ],
        },
      ],
    });
  },
  getUsers(query = {}) {
    return delay(users.filter((item) => containsKeyword(item, query.keyword) && (!query.status || item.status === query.status) && (!query.role || item.role === query.role)));
  },
  createUser(payload) {
    const user = {
      id: `user_${Date.now()}`,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      brand: payload.brand || '-',
      status: 'active',
      lastLogin: '-',
      createTime: '刚刚',
    };
    users = [user, ...users];
    return delay(user);
  },
  updateUserStatus(id, status) {
    users = users.map((item) => (item.id === id ? { ...item, status } : item));
    return delay(users.find((item) => item.id === id));
  },
  getRoles() {
    return delay(roles);
  },
  getOperationLogs(query = {}) {
    const page = Number(query.page || 1);
    const pageSize = Number(query.pageSize || 10);
    const filtered = logs.filter((item) => containsKeyword(item, query.keyword) && (!query.module || query.module === 'all' || item.module === query.module) && (!query.status || query.status === 'all' || item.status === query.status));
    return delay({
      list: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
    });
  },
  getImportTemplates() {
    return delay(importTemplates);
  },
  updateImportTemplate(code, payload) {
    importTemplates = importTemplates.map((item) => (item.code === code ? { ...item, ...payload, updatedAt: '刚刚' } : item));
    return delay(importTemplates.find((item) => item.code === code));
  },
};
