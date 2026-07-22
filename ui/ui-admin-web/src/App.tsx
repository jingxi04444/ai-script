import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  BadgeCheck,
  Bell,
  Bot,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  Database,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageSquareText,
  MonitorCog,
  PackageCheck,
  RefreshCcw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  ToggleRight,
  UploadCloud,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';

type ModuleKey = 'dashboard' | 'frontend' | 'projects' | 'users' | 'models' | 'billing' | 'review' | 'materials' | 'system';
type DialogTone = 'default' | 'success' | 'danger';
type DialogState = {
  title: string;
  desc?: string;
  content: ReactNode;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
  onConfirm?: () => void;
};
type AdminActions = {
  openDialog: (dialog: DialogState) => void;
  closeDialog: () => void;
  notify: (message: string) => void;
};

const menuGroups: Array<{ title: string; items: Array<{ key: ModuleKey; label: string; icon: LucideIcon }> }> = [
  { title: '总览', items: [{ key: 'dashboard', label: '运营仪表盘', icon: LayoutDashboard }] },
  {
    title: '前台管理',
    items: [
      { key: 'frontend', label: '前台配置', icon: MonitorCog },
      { key: 'projects', label: '项目管理', icon: FolderKanban },
      { key: 'users', label: '用户与权限', icon: Users },
    ],
  },
  {
    title: 'AI能力',
    items: [
      { key: 'models', label: '大模型管理', icon: Bot },
    ],
  },
  {
    title: '商业化',
    items: [
      { key: 'billing', label: '会员与充值', icon: WalletCards },
      { key: 'review', label: '内容审核', icon: ClipboardCheck },
    ],
  },
  {
    title: '资源与系统',
    items: [
      { key: 'materials', label: '素材与模板', icon: PackageCheck },
      { key: 'system', label: '系统设置', icon: Settings },
    ],
  },
];

const moduleTitles: Record<ModuleKey, { title: string; desc: string }> = {
  dashboard: { title: '运营仪表盘', desc: '查看前台产品、用户、脚本、视频和收入的核心状态。' },
  frontend: { title: '前台配置', desc: '管理登录注册、首页入口、脚本生成器、会员充值和项目页展示规则。' },
  projects: { title: '项目管理', desc: '统一查看用户项目、Brief、脚本、AI 视频和继续编辑状态。' },
  users: { title: '用户与权限', desc: '管理用户、角色、会员身份、登录状态和后台操作权限。' },
  models: { title: '大模型管理', desc: '管理模型供应商、模型启停、场景路由、调用额度和异常降级。' },
  billing: { title: '会员与充值', desc: '配置会员套餐、充值档位、支付方式和订单记录。' },
  review: { title: '内容审核', desc: '审核脚本、素材、AI 视频、原创性和合规风险。' },
  materials: { title: '素材与模板', desc: '管理前台可用的模板、素材库、上传限制和资源标签。' },
  system: { title: '系统设置', desc: '维护后台账号、操作日志、开关策略和服务状态。' },
};

const projectRows = [
  { name: '加热饭盒-抖音推广', owner: '运营一组', status: '进行中', brief: 3, scripts: 6, videos: 4, updated: '2025-05-19 14:30' },
  { name: '宠物饮水机-618投放', owner: '宠物类目', status: '已发布', brief: 2, scripts: 5, videos: 3, updated: '2025-05-18 10:22' },
  { name: '护眼台灯-种草视频', owner: '家居类目', status: '进行中', brief: 2, scripts: 4, videos: 2, updated: '2025-05-17 16:45' },
  { name: '母婴消毒柜-平台模板', owner: '母婴家电', status: '审核中', brief: 3, scripts: 6, videos: 4, updated: '2025-05-16 11:08' },
];

const userRows = [
  { name: '林雨薇', phone: '138****0921', plan: '年度会员', balance: '¥268.00', state: '正常', last: '2026-06-09 19:22' },
  { name: '王辰', phone: '186****7106', plan: '季度会员', balance: '¥82.00', state: '正常', last: '2026-06-09 18:40' },
  { name: '周启明', phone: '155****3342', plan: '免费用户', balance: '¥0.00', state: '限制中', last: '2026-06-08 23:11' },
  { name: '赵念', phone: '177****6520', plan: '月度会员', balance: '¥19.00', state: '正常', last: '2026-06-08 16:05' },
];

const auditRows = [
  { title: 'AI原创脚本_职场饭盒', type: '脚本', risk: '低风险', status: '待复核', owner: '内容审核' },
  { title: '露营灯-户外视频', type: 'AI视频', risk: '中风险', status: '待处理', owner: '合规审核' },
  { title: '宠物饮水机卖点素材', type: '素材', risk: '低风险', status: '已通过', owner: '素材审核' },
  { title: '筋膜枪运动文案', type: '脚本', risk: '高风险', status: '需修改', owner: '合规审核' },
];

const modelRows = [
  { name: '文本主模型', provider: 'OpenAI 网关', scene: '脚本生成 / 润色', status: '启用', latency: '1.2s', quota: '82%', cost: '¥0.18/千字' },
  { name: '图像理解模型', provider: '视觉网关', scene: '产品图解析', status: '启用', latency: '1.8s', quota: '64%', cost: '¥0.12/次' },
  { name: '审核风控模型', provider: '合规网关', scene: '内容审核', status: '启用', latency: '0.9s', quota: '45%', cost: '¥0.05/次' },
  { name: '备用降级模型', provider: '私有部署', scene: '异常兜底', status: '备用', latency: '2.6s', quota: '18%', cost: '¥0.03/千字' },
];

function App() {
  const [isAuthed, setIsAuthed] = useState(() => window.localStorage.getItem('ai-script-admin-auth') === '1');
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [toast, setToast] = useState('');
  const activeInfo = moduleTitles[activeModule];

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const actions = useMemo<AdminActions>(() => ({
    openDialog: setDialog,
    closeDialog: () => setDialog(null),
    notify: setToast,
  }), []);

  const login = () => {
    window.localStorage.setItem('ai-script-admin-auth', '1');
    setIsAuthed(true);
    setToast('登录成功，欢迎进入后台');
  };

  const logout = () => {
    window.localStorage.removeItem('ai-script-admin-auth');
    setIsAuthed(false);
  };

  if (!isAuthed) {
    return <>
      <AdminLogin onLogin={login} />
      <Toast message={toast} />
    </>;
  }

  return <main className={isSidebarCollapsed ? 'admin-shell collapsed' : 'admin-shell'}>
    <AdminSidebar active={activeModule} onChange={setActiveModule} collapsed={isSidebarCollapsed} />
    <section className="admin-main">
      <AdminTopbar
        title={activeInfo.title}
        desc={activeInfo.desc}
        onLogout={logout}
        onMenu={() => setIsSidebarCollapsed((value) => !value)}
        actions={actions}
      />
      <AdminContent active={activeModule} actions={actions} />
    </section>
    <AdminDialog dialog={dialog} onClose={() => setDialog(null)} />
    <Toast message={toast} />
  </main>;
}

function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [account, setAccount] = useState('admin@ai-script.local');
  const [password, setPassword] = useState('admin123');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');

  const requestCode = () => {
    setCode('4829');
    setMessage('验证码已生成：4829');
  };

  const submit = () => {
    if (!account || !password || !code) {
      setMessage('请填写账号、密码和验证码');
      return;
    }
    onLogin();
  };

  return <main className="admin-login-shell">
    <section className="admin-login-brand">
      <div className="admin-brand-mark"><Sparkles size={36} /></div>
      <span>AI Script Admin</span>
      <h1>后台管理平台</h1>
      <p>管理前台创作流程、用户会员、充值支付、内容审核、项目和系统配置。</p>
      <div className="login-feature-grid">
        <span><ShieldCheck size={18} />权限隔离</span>
        <span><Database size={18} />配置中心</span>
        <span><ClipboardCheck size={18} />审核闭环</span>
      </div>
    </section>
    <section className="admin-login-card">
      <header><span>Admin Login</span><h2>管理员登录</h2></header>
      <label><span>账号</span><input value={account} onChange={(event) => setAccount(event.target.value)} placeholder="admin@ai-script.local" /></label>
      <label><span>密码</span><input value={password} onChange={(event) => setPassword(event.target.value)} type="password" placeholder="请输入管理员密码" /></label>
      <label><span>验证码</span><div className="admin-code-row"><input value={code} onChange={(event) => setCode(event.target.value)} placeholder="输入验证码" /><button onClick={requestCode}>获取</button></div></label>
      {message && <p className="form-hint">{message}</p>}
      <button className="admin-login-button" onClick={submit}><Lock size={19} />登录后台</button>
    </section>
  </main>;
}

function AdminSidebar({ active, onChange, collapsed }: { active: ModuleKey; onChange: (key: ModuleKey) => void; collapsed: boolean }) {
  return <aside className="admin-sidebar">
    <header className="admin-logo">
      <div><Sparkles size={22} /></div>
      {!collapsed && <span>AI Script</span>}
    </header>
    <nav>
      {menuGroups.map((group) => <section key={group.title}>
        {!collapsed && <p>{group.title}</p>}
        {group.items.map((item) => {
          const Icon = item.icon;
          return <button
            key={item.key}
            className={active === item.key ? 'active' : ''}
            onClick={() => onChange(item.key)}
            title={item.label}
          >
            <Icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </button>;
        })}
      </section>)}
    </nav>
    <footer>
      <BadgeCheck size={18} />
      {!collapsed && <div><strong>系统在线</strong><span>Mock Console v0.1</span></div>}
    </footer>
  </aside>;
}

function AdminTopbar({
  title,
  desc,
  onLogout,
  onMenu,
  actions,
}: {
  title: string;
  desc: string;
  onLogout: () => void;
  onMenu: () => void;
  actions: AdminActions;
}) {
  const [keyword, setKeyword] = useState('');

  const showSearch = () => {
    actions.openDialog({
      title: '全局搜索',
      desc: keyword ? `搜索关键词：${keyword}` : '请输入关键词后可搜索项目、用户、订单和配置项。',
      content: <InfoList items={keyword ? ['项目：加热饭盒-抖音推广', '用户：林雨薇', '配置：前台登录拦截'] : ['暂无搜索关键词']} />,
      confirmText: '知道了',
    });
  };

  const showNotifications = () => {
    actions.openDialog({
      title: '通知中心',
      desc: '当前有 3 条待处理后台消息。',
      content: <InfoList items={['4 条内容审核待复核', '2 笔支付回调异常', '前台配置草稿未发布']} />,
      confirmText: '全部已读',
      onConfirm: () => actions.notify('通知已标记为已读'),
    });
  };

  const confirmLogout = () => {
    actions.openDialog({
      title: '退出后台',
      desc: '确认退出当前管理员账号吗？',
      content: <p className="dialog-copy">退出后需要重新登录才能访问后台管理平台。</p>,
      confirmText: '退出',
      tone: 'danger',
      onConfirm: onLogout,
    });
  };

  return <header className="admin-topbar">
    <button className="topbar-menu" aria-label="折叠菜单" onClick={onMenu}><Menu size={20} /></button>
    <div>
      <h1>{title}</h1>
      <p>{desc}</p>
    </div>
    <label className="admin-search">
      <Search size={18} />
      <input
        value={keyword}
        onChange={(event) => setKeyword(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') showSearch();
        }}
        placeholder="搜索用户 / 项目 / 订单 / 配置"
      />
    </label>
    <button className="icon-button" onClick={showNotifications} aria-label="通知中心"><Bell size={19} /></button>
    <button className="logout-button" onClick={confirmLogout}><LogOut size={18} />退出</button>
  </header>;
}

function AdminContent({ active, actions }: { active: ModuleKey; actions: AdminActions }) {
  const page = useMemo(() => {
    switch (active) {
      case 'frontend': return <FrontendConfigPage actions={actions} />;
      case 'projects': return <ProjectsPage actions={actions} />;
      case 'users': return <UsersPage actions={actions} />;
      case 'models': return <ModelsPage actions={actions} />;
      case 'billing': return <BillingPage actions={actions} />;
      case 'review': return <ReviewPage actions={actions} />;
      case 'materials': return <MaterialsPage actions={actions} />;
      case 'system': return <SystemPage actions={actions} />;
      default: return <DashboardPage actions={actions} />;
    }
  }, [active, actions]);

  return <div className="admin-content">{page}</div>;
}

function MetricCard({ icon, label, value, trend, onClick }: { icon: ReactNode; label: string; value: string; trend: string; onClick: () => void }) {
  return <button className="metric-card" onClick={onClick}>
    <span>{icon}</span>
    <div><p>{label}</p><strong>{value}</strong><em>{trend}</em></div>
  </button>;
}

function StatusBadge({ children, tone = 'green' }: { children: ReactNode; tone?: 'green' | 'blue' | 'orange' | 'purple' | 'gray' | 'red' }) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

function DashboardPage({ actions }: { actions: AdminActions }) {
  const openMetric = (title: string, value: string) => actions.openDialog({
    title,
    desc: '查看该指标的明细和运营趋势。',
    content: <InfoGrid rows={[['当前值', value], ['统计口径', '前台 Mock 数据'], ['更新时间', '2026-06-09 22:30']]} />,
    confirmText: '关闭',
  });

  return <section className="page-grid dashboard-page">
    <div className="metric-grid">
      <MetricCard icon={<Users size={22} />} label="前台用户" value="12,842" trend="较昨日 +8.2%" onClick={() => openMetric('前台用户', '12,842')} />
      <MetricCard icon={<FolderKanban size={22} />} label="项目总数" value="3,618" trend="本周新增 126" onClick={() => openMetric('项目总数', '3,618')} />
      <MetricCard icon={<FileText size={22} />} label="脚本生成" value="28,490" trend="成功率 97.6%" onClick={() => openMetric('脚本生成', '28,490')} />
      <MetricCard icon={<CreditCard size={22} />} label="会员收入" value="¥86,420" trend="月环比 +12.4%" onClick={() => openMetric('会员收入', '¥86,420')} />
    </div>
    <section className="panel-card chart-panel">
      <PanelHeader title="运营趋势" action="最近 7 天" onAction={() => actions.openDialog({
        title: '切换统计周期',
        desc: '选择仪表盘趋势的统计周期。',
        content: <SegmentOptions options={['最近 7 天', '最近 30 天', '本季度']} onSelect={(item) => actions.notify(`已切换到${item}`)} />,
        confirmText: '确认',
      })} />
      <div className="bar-chart">
        {[58, 72, 46, 84, 66, 92, 78].map((height, index) => <button key={index} style={{ height: `${height}%` }} onClick={() => actions.notify(`查看第 ${index + 1} 天数据`)} />)}
      </div>
    </section>
    <section className="panel-card">
      <PanelHeader title="待处理事项" action="12 条" onAction={() => actions.openDialog({
        title: '待处理事项',
        desc: '后台当前需要处理的核心事项。',
        content: <InfoList items={['内容审核待复核：4 条', '支付回调异常：2 笔', '前台配置发布：1 个草稿']} />,
        confirmText: '去处理',
        onConfirm: () => actions.notify('已定位到待处理列表'),
      })} />
      <div className="todo-list">
        <Todo icon={<ClipboardCheck size={18} />} title="内容审核待复核" desc="4 条脚本 / 视频存在合规风险" tone="orange" onClick={() => actions.notify('已打开审核事项')} />
        <Todo icon={<CreditCard size={18} />} title="支付回调异常" desc="2 笔订单需要重新同步" tone="red" onClick={() => actions.notify('已打开支付异常')} />
        <Todo icon={<MonitorCog size={18} />} title="前台配置发布" desc="首页入口配置等待上线" tone="green" onClick={() => actions.notify('已打开配置发布')} />
      </div>
    </section>
    <section className="panel-card full-span">
      <PanelHeader title="核心模块健康度" action="自动巡检" onAction={() => actions.openDialog({
        title: '自动巡检',
        desc: '系统会模拟检测前台、支付、审核与脚本服务。',
        content: <InfoGrid rows={[['登录注册', '正常'], ['脚本生成', '正常'], ['支付通道', '正常'], ['审核队列', '轻微积压']]} />,
        confirmText: '开始巡检',
        onConfirm: () => actions.notify('巡检已完成'),
      })} />
      <div className="health-grid">
        <HealthItem title="登录注册" value="99.9%" onClick={() => actions.notify('登录注册服务正常')} />
        <HealthItem title="脚本生成" value="97.6%" onClick={() => actions.notify('脚本生成服务正常')} />
        <HealthItem title="支付通道" value="99.2%" onClick={() => actions.notify('支付通道服务正常')} />
        <HealthItem title="审核队列" value="96.8%" onClick={() => actions.notify('审核队列存在轻微积压')} />
      </div>
    </section>
  </section>;
}

function FrontendConfigPage({ actions }: { actions: AdminActions }) {
  return <section className="page-grid config-page">
    <section className="panel-card full-span">
      <PanelHeader title="前台访问与账号设置" action="已启用登录拦截" onAction={() => actions.openDialog({
        title: '登录拦截策略',
        desc: '控制前台未登录用户是否可以访问页面。',
        content: <InfoList items={['首页可浏览，创作入口需要登录', '我的项目、工作台、会员充值需要登录', '刷新后保留前台登录态']} />,
        confirmText: '保存策略',
        onConfirm: () => actions.notify('登录拦截策略已保存'),
      })} />
      <div className="switch-grid">
        <ConfigSwitch title="访问前必须登录" desc="未登录用户访问首页、项目、工作台时跳转登录页" enabled actions={actions} />
        <ConfigSwitch title="允许手机号注册" desc="开启验证码注册流程，支持后续接真实短信服务" enabled actions={actions} />
        <ConfigSwitch title="记住登录状态" desc="前台登录态保存在本地，刷新后保持访问状态" enabled actions={actions} />
        <ConfigSwitch title="游客体验模式" desc="关闭后所有创作入口都需要账号权限" actions={actions} />
      </div>
    </section>
    <section className="panel-card">
      <PanelHeader title="首页入口配置" action="5 个入口" onAction={() => actions.notify('首页入口配置已展开')} />
      <div className="config-list">
        {['开始创作', 'Seedance2.0', '生图', '角色三视图', '剧本分集'].map((item, index) => <ConfigRow key={item} label={item} value={index === 0 ? '主按钮' : '普通入口'} actions={actions} />)}
      </div>
    </section>
    <section className="panel-card">
      <PanelHeader title="脚本生成器设置" action="3 个模式" onAction={() => actions.notify('脚本生成器模式已刷新')} />
      <div className="config-list">
        <ConfigRow label="爆款复刻" value="解析 + 结构分析" actions={actions} />
        <ConfigRow label="脚本模板库" value="模板选择 + 生成" actions={actions} />
        <ConfigRow label="AI原创" value="原创需求 + 配置" actions={actions} />
        <ConfigRow label="我的模板库" value="私有模板管理" actions={actions} />
      </div>
    </section>
    <section className="panel-card full-span">
      <PanelHeader title="发布策略" action="草稿" onAction={() => actions.notify('当前配置仍为草稿')} />
      <div className="publish-strip">
        <span>当前版本：Front UI v0.1</span>
        <span>影响页面：首页 / 我的项目 / 工作台 / 会员充值</span>
        <button onClick={() => actions.notify('草稿已保存')}>保存草稿</button>
        <button className="primary" onClick={() => actions.openDialog({
          title: '发布前台配置',
          desc: '发布后会同步影响前台页面展示和创作入口。',
          content: <InfoGrid rows={[['版本', 'Front UI v0.1'], ['影响页面', '首页 / 我的项目 / 工作台 / 会员充值'], ['发布人', 'admin@ai-script.local']]} />,
          confirmText: '确认发布',
          tone: 'success',
          onConfirm: () => actions.notify('前台配置已发布'),
        })}>发布配置</button>
      </div>
    </section>
  </section>;
}

function ProjectsPage({ actions }: { actions: AdminActions }) {
  return <section className="panel-card page-panel">
    <TableToolbar
      title="项目列表"
      action="导出项目"
      onRefresh={() => actions.notify('项目列表已刷新')}
      onAction={() => actions.openDialog({
        title: '导出项目',
        desc: '选择导出字段并生成项目报表。',
        content: <InfoList items={['项目名称、状态、负责人', 'Brief 数、脚本数、AI 视频数', '最近更新时间']} />,
        confirmText: '开始导出',
        onConfirm: () => actions.notify('项目报表已生成'),
      })}
    />
    <div className="admin-table project-table">
      <div className="table-head"><span>项目名称</span><span>负责人</span><span>状态</span><span>Brief</span><span>脚本</span><span>AI视频</span><span>更新时间</span><span>操作</span></div>
      {projectRows.map((row) => <div className="table-row" key={row.name}>
        <strong>{row.name}</strong><span>{row.owner}</span><StatusBadge tone={row.status === '已发布' ? 'blue' : row.status === '审核中' ? 'purple' : 'green'}>{row.status}</StatusBadge><span>{row.brief}</span><span>{row.scripts}</span><span>{row.videos}</span><span>{row.updated}</span><button onClick={() => actions.openDialog({
          title: row.name,
          desc: '项目详情',
          content: <InfoGrid rows={[['负责人', row.owner], ['状态', row.status], ['Brief', String(row.brief)], ['脚本', String(row.scripts)], ['AI视频', String(row.videos)], ['更新时间', row.updated]]} />,
          confirmText: '继续编辑',
          onConfirm: () => actions.notify(`已进入 ${row.name}`),
        })}>查看</button>
      </div>)}
    </div>
  </section>;
}

function UsersPage({ actions }: { actions: AdminActions }) {
  return <section className="page-grid">
    <div className="metric-grid compact">
      <MetricCard icon={<Users size={22} />} label="注册用户" value="12,842" trend="本月 +1,280" onClick={() => actions.notify('查看注册用户趋势')} />
      <MetricCard icon={<BadgeCheck size={22} />} label="会员用户" value="2,936" trend="转化率 22.8%" onClick={() => actions.notify('查看会员转化趋势')} />
      <MetricCard icon={<ShieldCheck size={22} />} label="后台角色" value="8" trend="权限组稳定" onClick={() => actions.notify('查看角色权限')} />
    </div>
    <section className="panel-card full-span page-panel">
      <TableToolbar
        title="用户列表"
        action="新建用户"
        onRefresh={() => actions.notify('用户列表已刷新')}
        onAction={() => actions.openDialog({
          title: '新建用户',
          desc: '创建前台用户或后台协作账号。',
          content: <EditTextDialog label="用户名称" initialValue="新用户" onSave={(value) => actions.notify(`已创建用户：${value}`)} />,
          confirmText: '创建',
        })}
      />
      <div className="admin-table user-table">
        <div className="table-head"><span>用户</span><span>账号</span><span>会员</span><span>余额</span><span>状态</span><span>最近登录</span><span>操作</span></div>
        {userRows.map((row) => <div className="table-row" key={row.phone}>
          <strong>{row.name}</strong><span>{row.phone}</span><span>{row.plan}</span><span>{row.balance}</span><StatusBadge tone={row.state === '正常' ? 'green' : 'red'}>{row.state}</StatusBadge><span>{row.last}</span><button onClick={() => actions.openDialog({
            title: `管理用户：${row.name}`,
            desc: '可调整会员、余额、状态和权限。',
            content: <InfoGrid rows={[['账号', row.phone], ['会员', row.plan], ['余额', row.balance], ['状态', row.state], ['最近登录', row.last]]} />,
            confirmText: row.state === '正常' ? '限制账号' : '解除限制',
            tone: row.state === '正常' ? 'danger' : 'success',
            onConfirm: () => actions.notify(`${row.name} 状态已更新`),
          })}>管理</button>
        </div>)}
      </div>
    </section>
  </section>;
}

function ModelsPage({ actions }: { actions: AdminActions }) {
  return <section className="page-grid models-page">
    <div className="metric-grid compact">
      <MetricCard icon={<Bot size={22} />} label="今日模型调用" value="86,420" trend="成功率 98.4%" onClick={() => actions.notify('查看模型调用趋势')} />
      <MetricCard icon={<Activity size={22} />} label="平均响应" value="1.36s" trend="较昨日 -0.18s" onClick={() => actions.notify('查看响应耗时')} />
      <MetricCard icon={<CreditCard size={22} />} label="今日成本" value="¥1,284" trend="预算使用 62%" onClick={() => actions.notify('查看模型成本')} />
    </div>
    <section className="panel-card">
      <PanelHeader title="供应商接入" action="3 个通道" onAction={() => actions.openDialog({
        title: '新增模型供应商',
        desc: '接入外部 API 网关或私有化部署模型。',
        content: <InfoList items={['填写供应商名称和 API Key', '设置请求地址、超时和并发限制', '绑定可用场景和预算策略']} />,
        confirmText: '新增供应商',
        onConfirm: () => actions.notify('供应商接入草稿已创建'),
      })} />
      <div className="provider-grid">
        <ProviderCard title="OpenAI 网关" desc="文本生成、脚本润色、结构化输出" status="运行中" actions={actions} />
        <ProviderCard title="视觉网关" desc="产品图解析、画面理解、素材识别" status="运行中" actions={actions} />
        <ProviderCard title="私有部署" desc="降级兜底、敏感内容内网处理" status="备用" actions={actions} />
      </div>
    </section>
    <section className="panel-card">
      <PanelHeader title="场景路由策略" action="自动路由" onAction={() => actions.openDialog({
        title: '编辑路由策略',
        desc: '按前台业务场景分配模型和备用模型。',
        content: <InfoGrid rows={[['AI原创脚本', '文本主模型'], ['产品图解析', '图像理解模型'], ['内容审核', '审核风控模型'], ['异常降级', '备用降级模型']]} />,
        confirmText: '保存路由',
        onConfirm: () => actions.notify('模型路由策略已保存'),
      })} />
      <div className="model-route-grid">
        <ConfigSwitch title="失败自动降级" desc="主模型异常时自动切到备用模型" enabled actions={actions} />
        <ConfigSwitch title="超预算保护" desc="达到日预算 90% 后限制高成本模型" enabled actions={actions} />
        <ConfigSwitch title="审核强制扫描" desc="生成内容进入审核模型复检" enabled actions={actions} />
        <ConfigSwitch title="灰度新模型" desc="仅对测试账号开放新模型路由" actions={actions} />
      </div>
    </section>
    <section className="panel-card full-span page-panel">
      <TableToolbar
        title="模型列表"
        action="新增模型"
        onRefresh={() => actions.notify('模型列表已刷新')}
        onAction={() => actions.openDialog({
          title: '新增模型',
          desc: '添加一个可被前台创作流程调用的大模型。',
          content: <EditTextDialog label="模型名称" initialValue="新模型" onSave={(value) => actions.notify(`模型名称：${value}`)} />,
          confirmText: '保存模型',
          onConfirm: () => actions.notify('新模型已保存'),
        })}
      />
      <div className="admin-table model-table">
        <div className="table-head"><span>模型名称</span><span>供应商</span><span>适用场景</span><span>状态</span><span>平均耗时</span><span>额度</span><span>成本</span><span>操作</span></div>
        {modelRows.map((row) => <div className="table-row" key={row.name}>
          <strong>{row.name}</strong>
          <span>{row.provider}</span>
          <span>{row.scene}</span>
          <StatusBadge tone={row.status === '启用' ? 'green' : 'orange'}>{row.status}</StatusBadge>
          <span>{row.latency}</span>
          <span>{row.quota}</span>
          <span>{row.cost}</span>
          <button onClick={() => actions.openDialog({
            title: `配置${row.name}`,
            desc: '调整模型供应商、适用场景、启停状态和预算。',
            content: <InfoGrid rows={[['供应商', row.provider], ['适用场景', row.scene], ['状态', row.status], ['平均耗时', row.latency], ['额度', row.quota], ['成本', row.cost]]} />,
            confirmText: '保存配置',
            onConfirm: () => actions.notify(`${row.name}配置已保存`),
          })}>配置</button>
        </div>)}
      </div>
    </section>
  </section>;
}

function BillingPage({ actions }: { actions: AdminActions }) {
  const [selectedAmount, setSelectedAmount] = useState('¥100');

  return <section className="page-grid billing-page">
    <section className="panel-card">
      <PanelHeader title="会员套餐" action="3 个套餐" onAction={() => actions.notify('会员套餐配置已刷新')} />
      <div className="plan-admin-grid">
        <PlanAdmin name="月度会员" price="¥39" desc="短期项目冲刺" actions={actions} />
        <PlanAdmin name="季度会员" price="¥99" desc="稳定投放团队" actions={actions} />
        <PlanAdmin name="年度会员" price="¥299" desc="推荐展示套餐" active actions={actions} />
      </div>
    </section>
    <section className="panel-card">
      <PanelHeader title="充值档位" action="4 个档位" onAction={() => actions.notify('充值档位已同步')} />
      <div className="amount-admin-grid">
        {['¥50', '¥100', '¥300', '¥500'].map((item) => <button
          key={item}
          className={selectedAmount === item ? 'active' : ''}
          onClick={() => {
            setSelectedAmount(item);
            actions.notify(`已选中充值档位 ${item}`);
          }}
        >{item}</button>)}
      </div>
    </section>
    <section className="panel-card full-span">
      <PanelHeader title="支付通道" action="微信 / 支付宝 / 余额" onAction={() => actions.notify('支付通道状态正常')} />
      <div className="payment-channel-grid">
        <PaymentChannel name="微信支付" state="启用" rate="99.6%" actions={actions} />
        <PaymentChannel name="支付宝" state="启用" rate="99.4%" actions={actions} />
        <PaymentChannel name="余额支付" state="启用" rate="100%" actions={actions} />
      </div>
    </section>
  </section>;
}

function ReviewPage({ actions }: { actions: AdminActions }) {
  return <section className="panel-card page-panel">
    <TableToolbar
      title="审核队列"
      action="批量处理"
      onRefresh={() => actions.notify('审核队列已刷新')}
      onAction={() => actions.openDialog({
        title: '批量处理',
        desc: '对低风险待复核内容执行批量通过。',
        content: <InfoList items={['低风险脚本：1 条', '低风险素材：1 条', '中高风险内容仍需人工处理']} />,
        confirmText: '批量通过',
        tone: 'success',
        onConfirm: () => actions.notify('低风险内容已批量通过'),
      })}
    />
    <div className="admin-table review-table">
      <div className="table-head"><span>内容标题</span><span>类型</span><span>风险</span><span>状态</span><span>处理人</span><span>操作</span></div>
      {auditRows.map((row) => <div className="table-row" key={row.title}>
        <strong>{row.title}</strong><span>{row.type}</span><StatusBadge tone={row.risk === '高风险' ? 'red' : row.risk === '中风险' ? 'orange' : 'green'}>{row.risk}</StatusBadge><span>{row.status}</span><span>{row.owner}</span><button onClick={() => actions.openDialog({
          title: `审核：${row.title}`,
          desc: `${row.type} 内容审核`,
          content: <InfoGrid rows={[['类型', row.type], ['风险等级', row.risk], ['状态', row.status], ['处理人', row.owner], ['审核建议', row.risk === '高风险' ? '退回修改' : '可人工确认通过']]} />,
          confirmText: row.risk === '高风险' ? '退回修改' : '通过审核',
          tone: row.risk === '高风险' ? 'danger' : 'success',
          onConfirm: () => actions.notify(`${row.title} 已处理`),
        })}>审核</button>
      </div>)}
    </div>
  </section>;
}

function MaterialsPage({ actions }: { actions: AdminActions }) {
  return <section className="page-grid materials-page">
    {[
      ['平台模板库', '128 个模板', FileText],
      ['产品素材库', '3,420 个素材', UploadCloud],
      ['角色与道具', '860 个资产', PackageCheck],
      ['提示词策略', '42 条规则', MessageSquareText],
    ].map(([title, meta, Icon]) => {
      const MaterialIcon = Icon as LucideIcon;
      return <article className="material-card" key={title as string}>
        <MaterialIcon size={28} />
        <strong>{title}</strong>
        <span>{meta}</span>
        <button onClick={() => actions.openDialog({
          title: `管理${title}`,
          desc: '维护前台可使用的素材和模板资源。',
          content: <InfoGrid rows={[['资源数量', meta as string], ['同步范围', '前台创作工作台'], ['审核策略', '上传后自动扫描']]} />,
          confirmText: '进入管理',
          onConfirm: () => actions.notify(`已进入${title}`),
        })}>管理</button>
      </article>;
    })}
    <section className="panel-card full-span">
      <PanelHeader title="素材上传限制" action="前台同步" onAction={() => actions.notify('素材限制已同步到前台')} />
      <div className="config-list two-cols">
        <ConfigRow label="产品画面" value="JPG / PNG，建议 16:9" actions={actions} />
        <ConfigRow label="视频素材" value="MP4，单文件 500MB 内" actions={actions} />
        <ConfigRow label="合规扫描" value="上传后自动进入审核" actions={actions} />
        <ConfigRow label="命名规范" value="项目名_场景_版本" actions={actions} />
      </div>
    </section>
  </section>;
}

function SystemPage({ actions }: { actions: AdminActions }) {
  return <section className="page-grid system-page">
    <section className="panel-card">
      <PanelHeader title="后台账号" action="6 人在线" onAction={() => actions.notify('后台在线账号已刷新')} />
      <div className="config-list">
        <ConfigRow label="超级管理员" value="2 人" actions={actions} />
        <ConfigRow label="运营管理员" value="8 人" actions={actions} />
        <ConfigRow label="审核管理员" value="5 人" actions={actions} />
        <ConfigRow label="只读观察员" value="12 人" actions={actions} />
      </div>
    </section>
    <section className="panel-card">
      <PanelHeader title="服务状态" action="正常" onAction={() => actions.notify('服务状态已巡检')} />
      <div className="config-list">
        <ConfigRow label="Mock API" value="正常" actions={actions} />
        <ConfigRow label="支付回调" value="待接入" actions={actions} />
        <ConfigRow label="短信服务" value="待接入" actions={actions} />
        <ConfigRow label="对象存储" value="正常" actions={actions} />
      </div>
    </section>
    <section className="panel-card full-span">
      <PanelHeader title="操作日志" action="最近 24 小时" onAction={() => actions.notify('已筛选最近 24 小时日志')} />
      <div className="log-list">
        <LogItem name="admin@ai-script.local" action="发布前台配置" time="2026-06-09 21:44" onClick={() => actions.notify('查看配置发布日志')} />
        <LogItem name="reviewer01" action="通过脚本审核" time="2026-06-09 20:16" onClick={() => actions.notify('查看审核日志')} />
        <LogItem name="ops_manager" action="调整年度会员价格" time="2026-06-09 18:52" onClick={() => actions.notify('查看价格调整日志')} />
      </div>
    </section>
  </section>;
}

function PanelHeader({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return <header className="panel-head"><h2>{title}</h2><button onClick={onAction}>{action}<ChevronDown size={16} /></button></header>;
}

function TableToolbar({ title, action, onRefresh, onAction }: { title: string; action: string; onRefresh: () => void; onAction: () => void }) {
  return <header className="table-toolbar"><h2>{title}</h2><div><button onClick={onRefresh}><RefreshCcw size={16} />刷新</button><button className="primary" onClick={onAction}>{action}</button></div></header>;
}

function Todo({ icon, title, desc, tone, onClick }: { icon: ReactNode; title: string; desc: string; tone: 'green' | 'orange' | 'red'; onClick: () => void }) {
  return <button className={`todo-item ${tone}`} onClick={onClick}><span>{icon}</span><div><strong>{title}</strong><p>{desc}</p></div></button>;
}

function HealthItem({ title, value, onClick }: { title: string; value: string; onClick: () => void }) {
  return <button className="health-item" onClick={onClick}><Activity size={18} /><span>{title}</span><strong>{value}</strong></button>;
}

function ConfigSwitch({ title, desc, enabled = false, actions }: { title: string; desc: string; enabled?: boolean; actions: AdminActions }) {
  const [isEnabled, setIsEnabled] = useState(enabled);
  return <button
    className={isEnabled ? 'config-switch active' : 'config-switch'}
    onClick={() => {
      const next = !isEnabled;
      setIsEnabled(next);
      actions.notify(`${title}已${next ? '开启' : '关闭'}`);
    }}
  >
    <ToggleRight size={28} className={isEnabled ? 'enabled' : ''} />
    <div><strong>{title}</strong><p>{desc}</p></div>
  </button>;
}

function ConfigRow({ label, value, actions }: { label: string; value: string; actions: AdminActions }) {
  const [currentValue, setCurrentValue] = useState(value);

  return <article className="config-row">
    <span>{label}</span>
    <strong>{currentValue}</strong>
    <button onClick={() => actions.openDialog({
      title: `编辑${label}`,
      desc: '修改后会先保存为后台配置草稿。',
      content: <EditTextDialog label={label} initialValue={currentValue} onSave={setCurrentValue} />,
      confirmText: '保存',
      onConfirm: () => actions.notify(`${label}已保存`),
    })}>编辑</button>
  </article>;
}

function PlanAdmin({ name, price, desc, active = false, actions }: { name: string; price: string; desc: string; active?: boolean; actions: AdminActions }) {
  return <article className={active ? 'plan-admin active' : 'plan-admin'}>
    <strong>{name}</strong>
    <b>{price}</b>
    <span>{desc}</span>
    <button onClick={() => actions.openDialog({
      title: `配置${name}`,
      desc: '调整会员价格、权益和推荐状态。',
      content: <InfoGrid rows={[['套餐', name], ['价格', price], ['说明', desc], ['前台展示', active ? '推荐展示' : '普通展示']]} />,
      confirmText: '保存配置',
      onConfirm: () => actions.notify(`${name}配置已保存`),
    })}>配置</button>
  </article>;
}

function PaymentChannel({ name, state, rate, actions }: { name: string; state: string; rate: string; actions: AdminActions }) {
  return <article className="payment-channel">
    <CreditCard size={22} />
    <strong>{name}</strong>
    <StatusBadge>{state}</StatusBadge>
    <span>成功率 {rate}</span>
    <button onClick={() => actions.openDialog({
      title: `设置${name}`,
      desc: '配置支付通道开关、回调地址和展示顺序。',
      content: <InfoGrid rows={[['状态', state], ['成功率', rate], ['回调状态', '待接真实后端'], ['前台展示', '会员弹窗 / 充值弹窗']]} />,
      confirmText: '保存设置',
      onConfirm: () => actions.notify(`${name}设置已保存`),
    })}>设置</button>
  </article>;
}

function LogItem({ name, action, time, onClick }: { name: string; action: string; time: string; onClick: () => void }) {
  return <button className="log-item" onClick={onClick}><CheckCircle2 size={18} /><strong>{name}</strong><span>{action}</span><time>{time}</time></button>;
}

function InfoList({ items }: { items: string[] }) {
  return <div className="dialog-list">
    {items.map((item) => <div key={item}><CheckCircle2 size={16} /><span>{item}</span></div>)}
  </div>;
}

function InfoGrid({ rows }: { rows: Array<[string, string]> }) {
  return <div className="dialog-grid">
    {rows.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
  </div>;
}

function SegmentOptions({ options, onSelect }: { options: string[]; onSelect: (option: string) => void }) {
  const [active, setActive] = useState(options[0]);
  return <div className="segment-options">
    {options.map((option) => <button
      key={option}
      className={active === option ? 'active' : ''}
      onClick={() => {
        setActive(option);
        onSelect(option);
      }}
    >{option}</button>)}
  </div>;
}

function EditTextDialog({ label, initialValue, onSave }: { label: string; initialValue: string; onSave: (value: string) => void }) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    onSave(value);
  }, [onSave, value]);

  return <label className="dialog-field">
    <span>{label}</span>
    <input value={value} onChange={(event) => setValue(event.target.value)} />
  </label>;
}

function AdminDialog({ dialog, onClose }: { dialog: DialogState | null; onClose: () => void }) {
  if (!dialog) return null;

  const confirm = () => {
    dialog.onConfirm?.();
    onClose();
  };

  return <div className="dialog-backdrop" onClick={onClose}>
    <section className="dialog-card" onClick={(event) => event.stopPropagation()}>
      <header>
        <div>
          <h2>{dialog.title}</h2>
          {dialog.desc && <p>{dialog.desc}</p>}
        </div>
        <button aria-label="关闭弹窗" onClick={onClose}><X size={20} /></button>
      </header>
      <div className="dialog-body">{dialog.content}</div>
      <footer>
        <button onClick={onClose}>{dialog.cancelText || '取消'}</button>
        <button className={dialog.tone === 'danger' ? 'danger' : 'primary'} onClick={confirm}>{dialog.confirmText || '确认'}</button>
      </footer>
    </section>
  </div>;
}

function Toast({ message }: { message: string }) {
  return <div className={message ? 'admin-toast show' : 'admin-toast'}>{message}</div>;
}

export default App;
