const wait = (value, delay = 260) => new Promise((resolve) => setTimeout(() => resolve(value), delay));

const currentUser = {
  id: 'u_1001',
  name: '林楠',
  tenantName: '北钥宠物生活',
  role: '品牌运营',
};

const projects = [
  {
    id: 'p_2406_001',
    title: '宠鲜鲜加热饭盒 - 职场加班版',
    product: '宠鲜鲜智能加热饭盒',
    status: 'scripting',
    currentStep: 'storyboard',
    platform: '抖音',
    updatedAt: '今天 14:20',
    progress: 44,
  },
  {
    id: 'p_2406_002',
    title: '分层便当盒 - 小红书测评',
    product: '分层便当盒',
    status: 'draft',
    currentStep: 'selling-points',
    platform: '小红书',
    updatedAt: '昨天 18:06',
    progress: 22,
  },
];

const sellingAssets = [
  { id: 'sp_1', name: '职场加班人群卖点包', tag: '高频复用', main: '20 分钟快速加热，办公室也能吃上热饭', count: 8 },
  { id: 'sp_2', name: '健康轻食场景库', tag: '已审核', main: '分层保鲜不串味，适合减脂餐和儿童餐', count: 6 },
  { id: 'sp_3', name: '便携餐具新品 Brief', tag: '本周新增', main: '小体积通勤友好，桌面收纳不占空间', count: 5 },
];

const sourceTemplates = [
  { id: 'daily', name: '生活痛点转化模板', structure: '痛点瞬间 + 情绪放大 + 产品介入 + 前后对比 + 轻 CTA' },
  { id: 'review', name: '测评种草模板', structure: '开箱悬念 + 三项实测 + 反差结果 + 适用人群总结' },
  { id: 'story', name: '剧情反转模板', structure: '误会冲突 + 尴尬升级 + 产品救场 + 人物关系缓和' },
];

const storyboard = [
  {
    id: 1,
    shot: '镜号 01',
    type: '特写',
    scene: '加班工位，冷掉的便当盒放在键盘旁，人物看向窗外城市灯光。',
    line: '加班到晚上，想吃一口热饭怎么就这么难？',
    duration: '3s',
    point: '痛点开场，建立职场场景代入',
    risk: '低',
  },
  {
    id: 2,
    shot: '镜号 02',
    type: '中景',
    scene: '插电启动加热饭盒，蒸汽升起，字幕强调 20 分钟快速加热。',
    line: '插电 20 分钟，办公室也能吃上刚热好的饭。',
    duration: '4s',
    point: '主卖点直出',
    risk: '低',
  },
  {
    id: 3,
    shot: '镜号 03',
    type: '近景',
    scene: '打开分层餐盒，米饭和配菜保持完整，人物吃下第一口后表情放松。',
    line: '分层不串味，忙一天也能认真吃顿热乎的。',
    duration: '3s',
    point: '辅助卖点自然植入',
    risk: '低',
  },
];

const assets = [
  { id: 'a1', name: '办公室夜景参考', type: '场景', status: '已绑定', tag: '镜号01' },
  { id: 'a2', name: '加热饭盒产品特写', type: '道具', status: '待确认', tag: '镜号02' },
  { id: 'a3', name: '温柔女声旁白', type: '音频', status: '已生成', tag: 'TTS' },
];

const clone = (value) => JSON.parse(JSON.stringify(value));

export const mockApi = {
  login: (payload) => wait({ token: 'mock-front-token', user: currentUser, payload }),
  register: (payload) => wait({ token: 'mock-front-token', user: { ...currentUser, name: payload.name || currentUser.name } }),
  getCurrentUser: () => wait(currentUser),
  getProjects: () => wait(clone(projects)),
  createProject: () => {
    const project = {
      id: `p_${Date.now()}`,
      title: '新建短视频脚本项目',
      product: '待填写产品',
      status: 'draft',
      currentStep: 'global',
      platform: '抖音',
      updatedAt: '刚刚',
      progress: 0,
    };
    projects.unshift(project);
    return wait(clone(project));
  },
  getProject: (id) => wait(clone(projects.find((item) => item.id === id) || projects[0])),
  saveStep: ({ projectId, step, data }) => wait({ projectId, step, savedAt: '刚刚', data }),
  uploadFile: ({ type, fileName }) => wait({ id: `file_${Date.now()}`, type, fileName, status: 'uploaded', uploadedAt: '刚刚' }, 420),
  downloadScript: (scriptName) => wait({ fileName: `${scriptName || '分镜脚本'}.xlsx`, url: '#' }, 320),
  shareScript: (scriptName) => wait({ title: scriptName, url: '/share/scripts/mock-share-token', scope: '只读分享' }, 320),
  getSellingAssets: () => wait(clone(sellingAssets)),
  optimizeBrief: (brief) => wait({
    ...brief,
    summary: 'AI 已提炼为：职场加班人群在晚间无法吃热饭，产品通过快速加热和分层防串味解决痛点。',
  }, 420),
  parseSourceLink: (url) => wait({
    url,
    title: '加班冷饭痛点爆款视频',
    account: '打工人的加热饭日记',
    metrics: '播放 126 万 / 点赞 8.2 万 / 收藏 1.7 万',
    structure: '3 秒冷饭痛点 + 产品快速加热 + 分层展示 + 轻 CTA',
    report: ['开头用真实加班场景建立共鸣', '中段突出加热速度和分层不串味', '结尾引导评论区领取优惠'],
  }, 520),
  getOriginalTemplates: () => wait(clone(sourceTemplates)),
  generateStoryboard: () => wait(clone(storyboard), 650),
  runCompliance: () => wait({ similarity: '38%', riskCount: 1, suggestion: '将“最适合”替换为“更适合”以降低广告法风险。' }),
  submitAudit: () => wait({ status: 'approved', message: '脚本已提交审核，当前模拟为自动通过。' }, 380),
  getAssets: () => wait(clone(assets)),
  getTaskProgress: () => wait({ status: 'running', progress: 76, label: '正在生成镜号 03 视频片段' }),
  exportVideo: () => wait({ fileName: '宠鲜鲜加热饭盒_职场加班版.mp4', url: '#' }, 460),
  getShareScript: () => wait({ title: '宠鲜鲜加热饭盒_职场加班版_v3', status: '已审核', scenes: clone(storyboard) }),
};
