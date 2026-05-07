const wait = (value, delay = 240) => new Promise((resolve) => setTimeout(() => resolve(value), delay));
const clone = (value) => JSON.parse(JSON.stringify(value));

const adminUser = {
  id: 'admin_001',
  name: '系统管理员',
  role: '超级管理员',
  tenantScope: '全部品牌',
  permissions: ['dashboard', 'parsing', 'knowledge', 'audit', 'materials', 'analytics', 'system'],
};

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

export const mockApi = {
  login: (payload) => wait({ token: 'mock-admin-token', user: adminUser, payload }),
  getCurrentUser: () => wait(adminUser),
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
  getAnalytics: () => wait({ plays: '326.8 万', interactionRate: '8.7%', orders: '2,418', roi: '2.4' }),
};
