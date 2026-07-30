import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BadgeCheck,
  Bell,
  Bot,
  ChevronDown,
  ClipboardCheck,
  Database,
  FileText,
  FolderKanban,
  Image,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  ScrollText,
  LogOut,
  Menu,
  Monitor,
  Settings,
  Search,
  Sparkles,
  UploadCloud,
  ShieldCheck,
  Users,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { authApi, type AdminUser } from '../../api/auth';
import { useAdminShell, AdminShellProvider } from './adminShell';

type MenuItem = { label: string; path: string; icon: LucideIcon };

const menuGroups: Array<{ title: string; items: MenuItem[] }> = [
  { title: '总览', items: [{ label: '运营仪表盘', path: '/dashboard', icon: LayoutDashboard }] },
  {
    title: '前台管理',
    items: [
      { label: '前台配置', path: '/frontend', icon: Monitor },
      { label: '页面视觉', path: '/system/page-visual', icon: Image },
      { label: '项目管理', path: '/projects', icon: FolderKanban },
      { label: '用户与权限', path: '/users', icon: Users },
    ],
  },
  {
    title: '卖点 Brief',
    items: [
      { label: '卖点 Brief 管理', path: '/brief-management', icon: ClipboardCheck },
    ],
  },
  {
    title: 'AI与商业化',
    items: [
      { label: '大模型管理', path: '/models', icon: Bot },
      { label: '会员与额度', path: '/billing', icon: WalletCards },
      { label: '支付订单', path: '/payments/orders', icon: ScrollText },
      { label: '内容审核', path: '/review', icon: ClipboardCheck },
    ],
  },
  {
    title: '资源与模板',
    items: [
      { label: '脚本生成器', path: '/script-generator-management', icon: Sparkles },
      { label: 'AI智能脚本管理', path: '/ai-script-management', icon: Bot },
      { label: '脚本模板库管理', path: '/templates', icon: Database },
      { label: 'Prompt 模板', path: '/prompt-templates', icon: FileText },
      { label: '导入模板', path: '/import-templates', icon: UploadCloud },
    ],
  },
  {
    title: '系统管理',
    items: [
      { label: '角色管理', path: '/system/roles', icon: KeyRound },
      { label: '权限管理', path: '/system/permissions', icon: ListChecks },
      { label: '配置字典', path: '/system/config-dictionary', icon: Database },
      { label: '业务配置', path: '/system/site-config', icon: Settings },
      { label: '操作日志', path: '/system/logs', icon: ScrollText },
    ],
  },
];

const routeMeta: Record<string, { title: string; desc: string }> = {
  '/dashboard': { title: '运营仪表盘', desc: '查看用户、项目、脚本和视频的核心数据。' },
  '/frontend': { title: '前台配置', desc: '管理前台租户、品牌和基础展示配置。' },
  '/projects': { title: '项目管理', desc: '按项目查看用户协作、脚本与视频产出。' },
  '/users': { title: '用户与权限', desc: '维护用户、账号状态、会员等级和基础权限。' },
  '/models': { title: '大模型管理', desc: '配置 Provider、模型路由和服务状态。' },
  '/billing': { title: '会员与额度', desc: '调整用户额度、余额和订阅能力。' },
  '/payments/orders': { title: '支付订单', desc: '查看支付订单、回调状态和履约结果。' },
  '/review': { title: '内容审核', desc: '管理内容审核流程和合规提醒。' },
  '/script-generator-management': { title: '脚本生成器', desc: '集中管理爆款复刻解析、文案整理和脚本生成。' },
  '/ai-script-management': { title: 'AI智能脚本管理', desc: '维护大类、子类和两级通用提示词。' },
  '/templates': { title: '脚本模板库管理', desc: '维护前台脚本模板库中的可复用模板。' },
  '/brief-management/detection-prompts': { title: 'Brief 检测提示词', desc: '维护产品卖点 Brief 检测使用的提示词和返回结构。' },
  '/brief-management/import-template': { title: '卖点 Brief 导入模板', desc: '维护卖点 Brief 批量导入模板文件。' },
  '/brief-management': { title: '卖点 Brief 管理', desc: '集中维护 Brief 检测提示词和批量导入模板。' },
  '/brief-management/script-formats': { title: '脚本格式（产品和剧情类）', desc: '维护产品类和剧情类脚本的输出格式。' },
  '/prompt-templates': { title: 'Prompt 模板', desc: '维护系统 Prompt 模板和场景策略。' },
  '/import-templates': { title: '导入模板', desc: '维护前台可下载和导入的数据模板。' },
  '/system/roles': { title: '角色管理', desc: '维护后台角色和权限组。' },
  '/system/permissions': { title: '权限管理', desc: '维护权限菜单和操作项。' },
  '/system/page-visual': { title: '页面视觉', desc: '集中维护用户端页面图标、图片、模块名称和展示文案。' },
  '/system/config-dictionary': { title: '配置字典', desc: '按树形结构维护系统配置 Key、Value、类型和状态。' },
  '/system/site-config': { title: '业务配置', desc: '配置爆款解析案例和 AI 智能脚本分类提示词。' },
  '/system/home-banners': { title: '首页轮播', desc: '维护用户端首页轮播图片、文案、跳转和展示顺序。' },
  '/system/script-formats': { title: '脚本格式', desc: '维护脚本输出格式和格式要求。' },
  '/system/logs': { title: '操作日志', desc: '查看后台操作记录和接口结果。' },
};

function AdminLayoutShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const { notify } = useAdminShell();

  const isAuthenticated = Boolean(localStorage.getItem('admin_token'));
  const currentMeta = useMemo(() => {
    const matched = Object.entries(routeMeta)
      .sort(([a], [b]) => b.length - a.length)
      .find(([path]) => location.pathname.startsWith(path));
    return matched?.[1] ?? { title: '管理后台', desc: 'AI Script 管理后台' };
  }, [location.pathname]);

  useEffect(() => {
    if (!isAuthenticated && location.pathname !== '/login') {
      navigate('/login');
    }
  }, [isAuthenticated, location.pathname, navigate]);

  useEffect(() => {
    if (!isAuthenticated) return;
    authApi.getAdminInfo().then(setAdmin).catch(() => setAdmin(null));
  }, [isAuthenticated]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore logout errors
    }
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  return (
    <div className={`admin-shell ${collapsed ? 'is-collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark"><BadgeCheck size={18} /></div>
          {!collapsed && (
            <div className="sidebar-brand-text">
              <strong>AI Script</strong>
              <span>Admin Console</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuGroups.map((group) => (
            <section key={group.title} className="sidebar-group">
              {!collapsed ? <p className="sidebar-group-title">{group.title}</p> : null}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = location.pathname.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    className={`sidebar-item ${active ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                    title={item.label}
                    type="button"
                  >
                    <Icon size={18} />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </button>
                );
              })}
            </section>
          ))}
        </nav>

        <button className="sidebar-footer" type="button" onClick={() => notify('系统在线，接口已连接')}>
          <ShieldCheck size={18} />
          {!collapsed ? (
            <div>
              <strong>系统在线</strong>
              <span>API Ready</span>
            </div>
          ) : null}
        </button>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button className="topbar-menu" aria-label="折叠菜单" onClick={() => setCollapsed((value) => !value)} type="button">
            <Menu size={20} />
          </button>
          <div className="topbar-title">
            <h1>{currentMeta.title}</h1>
            <p>{currentMeta.desc}</p>
          </div>
          <label className="topbar-search">
            <Search size={18} />
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') notify(keyword ? `搜索：${keyword}` : '请输入搜索关键词');
              }}
              placeholder="搜索用户 / 项目 / 配置"
            />
          </label>
          <div className="topbar-actions">
            <button className="icon-btn" type="button" onClick={() => notify('当前暂无新通知')} aria-label="通知">
              <Bell size={19} />
            </button>
            <button className="logout-btn" type="button" onClick={handleLogout}>
              <LogOut size={18} />
              <span>{admin?.username || '管理员'}</span>
              <ChevronDown size={16} />
            </button>
          </div>
        </header>

        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const AdminLayout = () => {
  return (
    <AdminShellProvider>
      <AdminLayoutShell />
    </AdminShellProvider>
  );
};

export default AdminLayout;
