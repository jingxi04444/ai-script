const wait = (value, delay = 240) => new Promise((resolve) => setTimeout(() => resolve(value), delay));
const clone = (value) => JSON.parse(JSON.stringify(value));

const adminUser = {
  id: 'admin_001',
  name: '系统管理员',
  role: '超级管理员',
  tenantScope: '全部品牌',
  permissions: ['dashboard', 'parsing', 'knowledge', 'audit', 'materials', 'analytics', 'llm', 'users', 'roles', 'logs', 'system'],
};

let adminMenus = [
  { id: 'dashboard', label: '数据概览', path: '/admin/dashboard', permission: 'dashboard', enabled: true, order: 10 },
  { id: 'parsing', label: '解析管理', path: '/admin/parsing', permission: 'parsing', enabled: true, order: 20 },
  { id: 'knowledge', label: '知识库', path: '/admin/knowledge', permission: 'knowledge', enabled: true, order: 30 },
  { id: 'audit', label: '审核工作流', path: '/admin/audit', permission: 'audit', enabled: true, order: 40 },
  { id: 'materials', label: '素材项目库', path: '/admin/materials', permission: 'materials', enabled: true, order: 50 },
  { id: 'analytics', label: '投放数据', path: '/admin/analytics', permission: 'analytics', enabled: true, order: 60 },
  { id: 'llm', label: '大模型配置', path: '/admin/llm', permission: 'llm', enabled: true, order: 70 },
  { id: 'users', label: '用户管理', path: '/admin/users', permission: 'users', enabled: true, order: 80 },
  { id: 'roles', label: '角色权限', path: '/admin/roles', permission: 'roles', enabled: true, order: 90 },
  { id: 'logs', label: '操作日志', path: '/admin/logs', permission: 'logs', enabled: true, order: 100 },
  { id: 'system', label: '系统权限', path: '/admin/system', permission: 'system', enabled: true, order: 110 },
];

const dashboard = {
  metrics: [
    { label: '今日项目', value: '128', delta: '+18%' },
    { label: '待审核脚本', value: '36', delta: '+6' },
    { label: '解析成功率', value: '97.8%', delta: '+2.1%' },
    { label: '素材总量', value: '8,420', delta: '+214' },
  ],
  queues: [
    { name: 'script-generation', running: 18, failed: 2, successRate: '98.1%' },
    { name: 'parsing', running: 6, failed: 1, successRate: '97.8%' },
    { name: 'export', running: 4, failed: 0, successRate: '99.2%' },
  ],
};

const parsingLogs = [
  { id: 'log_1', brand: '北钥宠物生活', platform: '抖音', url: 'douyin.com/video/7423', status: '成功', cost: '1.8s', time: '14:20' },
  { id: 'log_2', brand: '轻食研究所', platform: '小红书', url: 'xiaohongshu.com/explore/98', status: '失败', cost: '5.2s', time: '13:44' },
  { id: 'log_3', brand: '城市通勤', platform: '抖音', url: 'douyin.com/video/7419', status: '成功', cost: '2.1s', time: '12:09' },
];

const formulas = [
  { id: 'f1', name: '3 秒痛点 + 产品方案 + 轻 CTA', platform: '抖音', usage: 142, risk: '低' },
  { id: 'f2', name: '测评开箱 + 三项实测 + 人群总结', platform: '小红书', usage: 88, risk: '低' },
  { id: 'f3', name: '剧情误会 + 产品救场 + 情绪反转', platform: '视频号', usage: 51, risk: '中' },
];

const auditTasks = [
  { id: 'a_1', script: '宠鲜鲜加热饭盒_职场加班版_v3', brand: '北钥宠物生活', owner: '林楠', status: '待运营审核', risk: '1 处词库风险', submittedAt: '今天 14:20' },
  { id: 'a_2', script: '轻食便当盒_小红书测评_v1', brand: '轻食研究所', owner: '陈舟', status: '法务复核', risk: '原创度 62%', submittedAt: '今天 11:03' },
  { id: 'a_3', script: '通勤杯_剧情反转_v2', brand: '城市通勤', owner: '小禾', status: '待分配', risk: '低风险', submittedAt: '昨天 18:40' },
];

const materials = [
  { id: 'm1', name: '办公室夜景参考', type: '场景图', brand: '北钥宠物生活', project: '加热饭盒', usage: 12, size: '4.2MB' },
  { id: 'm2', name: '温柔女声旁白', type: '音频', brand: '北钥宠物生活', project: '加热饭盒', usage: 8, size: '1.6MB' },
  { id: 'm3', name: '分层餐盒特写', type: '视频片段', brand: '轻食研究所', project: '轻食便当盒', usage: 21, size: '18MB' },
];

const tenants = [
  { id: 't1', name: '北钥宠物生活', users: 18, storage: '82GB', status: '启用' },
  { id: 't2', name: '轻食研究所', users: 9, storage: '36GB', status: '启用' },
  { id: 't3', name: '城市通勤', users: 14, storage: '54GB', status: '试用' },
];

const adminAccounts = [
  { id: 'u1', name: '许燃', account: 'xuran@ai-script.local', role: '超级管理员', tenantScope: '全部品牌', status: '启用', lastLogin: '今天 09:12' },
  { id: 'u2', name: '唐雨', account: 'tangyu@ai-script.local', role: '品牌管理员', tenantScope: '北钥宠物生活', status: '启用', lastLogin: '昨天 18:42' },
  { id: 'u3', name: '周南', account: 'zhounan@ai-script.local', role: '审核员', tenantScope: '轻食研究所', status: '停用', lastLogin: '周一 11:05' },
];

const roles = [
  { id: 'r1', name: '超级管理员', description: '可管理全部租户、菜单、权限和系统配置', userCount: 2, permissions: ['dashboard', 'parsing', 'knowledge', 'audit', 'materials', 'analytics', 'llm', 'users', 'roles', 'logs', 'system'], status: '启用' },
  { id: 'r2', name: '品牌管理员', description: '可管理本品牌知识库、项目、素材和审核记录', userCount: 9, permissions: ['dashboard', 'knowledge', 'audit', 'materials', 'analytics'], status: '启用' },
  { id: 'r3', name: '审核员', description: '仅可处理分配给自己的脚本审核任务', userCount: 6, permissions: ['audit'], status: '启用' },
];

let llmProviders = [
  { id: 'llm_1', providerName: 'DeepSeek OpenAI Compatible', platform: 'deepseek', endpointUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', priority: 10, timeoutMs: 60000, retryCount: 2, status: 'enabled', apiKeyRef: 'env:DEEPSEEK_API_KEY', temperature: 0.3, maxTokens: 3000 },
  { id: 'llm_2', providerName: 'Qwen DashScope Compatible', platform: 'qwen', endpointUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus', priority: 20, timeoutMs: 60000, retryCount: 2, status: 'enabled', apiKeyRef: 'env:DASHSCOPE_API_KEY', temperature: 0.3, maxTokens: 3000 },
  { id: 'llm_3', providerName: 'OpenAI Compatible Fallback', platform: 'openai', endpointUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', priority: 30, timeoutMs: 60000, retryCount: 2, status: 'enabled', apiKeyRef: 'env:OPENAI_API_KEY', temperature: 0.3, maxTokens: 3000 },
];

const operationLogs = [
  { id: 'op1', operator: '系统管理员', module: '动态菜单配置', action: '更新菜单排序', ip: '127.0.0.1', time: '今天 14:32', result: '成功' },
  { id: 'op2', operator: '唐雨', module: '审核工作流', action: '通过脚本审核', ip: '10.12.8.24', time: '今天 11:20', result: '成功' },
  { id: 'op3', operator: '许燃', module: '用户管理', action: '停用用户', ip: '10.12.8.12', time: '昨天 19:08', result: '成功' },
];

export const mockApi = {
  login: (payload) => wait({ token: 'mock-admin-token', user: adminUser, payload }),
  getCurrentUser: () => wait(adminUser),
  getMenus: () => wait(clone(adminMenus.sort((a, b) => a.order - b.order))),
  updateMenus: (payload) => {
    adminMenus = payload.menus.map((item, index) => ({ ...item, order: item.order ?? (index + 1) * 10 }));
    return wait({ menus: clone(adminMenus.sort((a, b) => a.order - b.order)), updatedAt: '刚刚' }, 360);
  },
  getDashboard: () => wait(clone(dashboard)),
  getParsingLogs: () => wait(clone(parsingLogs)),
  retryParsingLog: (id) => wait({ id, status: '重试中' }),
  saveProviderConfig: (payload) => wait({ id: `provider_${Date.now()}`, status: '已保存', payload }, 360),
  importKnowledgeFile: ({ type, fileName }) => wait({ id: `import_${Date.now()}`, type, fileName, rows: 128, status: '导入成功' }, 420),
  getFormulas: () => wait(clone(formulas)),
  getAuditTasks: () => wait(clone(auditTasks)),
  approveAuditTask: (id) => wait({ id, status: '已通过', message: '审核任务已通过并写入操作日志。' }),
  rejectAuditTask: (id) => wait({ id, status: '已驳回', message: '审核任务已驳回，已通知提交人。' }),
  getMaterials: () => wait(clone(materials)),
  deleteMaterial: (id) => wait({ id, status: 'deleted' }, 320),
  downloadMaterial: (id) => wait({ id, fileName: '素材包.zip', url: '#' }, 260),
  getTenants: () => wait(clone(tenants)),
  createTenant: (payload) => wait({ id: `tenant_${Date.now()}`, status: 'created', payload }, 360),
  getAdminUsers: () => wait(clone(adminAccounts)),
  createAdminUser: (payload) => wait({ id: `admin_${Date.now()}`, status: 'created', payload }, 360),
  disableAdminUser: (id) => wait({ id, status: 'disabled' }, 280),
  getRoles: () => wait(clone(roles)),
  createRole: (payload) => wait({ id: `role_${Date.now()}`, status: 'created', payload }, 360),
  getOperationLogs: () => wait(clone(operationLogs)),
  getLlmProviders: () => wait(clone(llmProviders.sort((a, b) => a.priority - b.priority))),
  createLlmProvider: (payload) => {
    const provider = {
      id: `llm_${Date.now()}`,
      providerName: String(payload.providerName || 'OpenAI-compatible Provider'),
      platform: String(payload.platform || 'custom'),
      endpointUrl: String(payload.endpointUrl || payload.apiBaseUrl || ''),
      model: String(payload.model || ''),
      priority: Number(payload.priority || 100),
      timeoutMs: Number(payload.timeoutMs || 60000),
      retryCount: Number(payload.retryCount || 2),
      status: String(payload.status || 'enabled'),
      apiKeyRef: String(payload.apiKeyRef || payload.apiKey || '***'),
      temperature: Number(payload.temperature || 0.3),
      maxTokens: Number(payload.maxTokens || 3000),
    };
    llmProviders = [provider, ...llmProviders];
    return wait({ id: provider.id, status: 'created', provider }, 360);
  },
  disableLlmProvider: (id) => {
    llmProviders = llmProviders.map((provider) => provider.id === id ? { ...provider, status: 'disabled' } : provider);
    return wait({ id, status: 'disabled' }, 260);
  },
  getAnalytics: () => wait({ plays: '326.8 万', interactionRate: '8.7%', orders: '2,418', roi: '2.4' }),
};
