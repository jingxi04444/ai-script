import { FormEvent, useEffect, useState } from 'react';
import { mockApi } from './mock.js';

type AdminUser = {
  id: string;
  name: string;
  role: string;
  tenantScope: string;
  permissions: string[];
};

type Toast = {
  message: string;
  tone: 'success' | 'warning' | 'info';
};

type AdminModal = {
  title: string;
  description: string;
  confirmText?: string;
  fields?: Array<{ name: string; label: string; placeholder?: string; type?: string; defaultValue?: string }>;
  file?: { label: string; accept: string };
  onConfirm: (payload: Record<string, FormDataEntryValue>, file: File | null) => Promise<void> | void;
} | null;

const menus = [
  { id: 'dashboard', label: '数据概览', path: '/admin/dashboard' },
  { id: 'parsing', label: '解析管理', path: '/admin/parsing' },
  { id: 'knowledge', label: '知识库', path: '/admin/knowledge' },
  { id: 'audit', label: '审核工作流', path: '/admin/audit' },
  { id: 'materials', label: '素材项目库', path: '/admin/materials' },
  { id: 'analytics', label: '投放数据', path: '/admin/analytics' },
  { id: 'system', label: '系统权限', path: '/admin/system' },
];

const navigate = (path: string) => {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

function usePathname() {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const handlePop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);
  return path;
}

export default function App() {
  const path = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, tone: Toast['tone'] = 'success') => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 2200);
  };

  useEffect(() => {
    mockApi.getCurrentUser().then((data: AdminUser) => setUser(data));
  }, []);

  if (path === '/' || path === '/admin') {
    navigate('/admin/dashboard');
  }

  if (path.startsWith('/admin/login') || !user) {
    return <AdminLoginPage onDone={(nextUser) => { setUser(nextUser); navigate('/admin/dashboard'); }} />;
  }

  return <AdminLayout user={user} path={path} toast={toast} showToast={showToast} />;
}

function AdminLoginPage({ onDone }: { onDone: (user: AdminUser) => void }) {
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    const result = await mockApi.login(Object.fromEntries(new FormData(event.currentTarget))) as { user: AdminUser };
    setLoading(false);
    onDone(result.user);
  };

  return (
    <main className="admin-login">
      <section className="login-copy">
        <span>Admin Web / Production</span>
        <h1>后台管理控制台</h1>
        <p>面向超级管理员、品牌管理员、审核员和技术运维，所有接口先由 mock.js 模拟。</p>
      </section>
      <form className="login-card" onSubmit={submit}>
        <h2>管理员登录</h2>
        <label>账号<input name="account" defaultValue="admin@ai-script.local" /></label>
        <label>密码<input name="password" type="password" defaultValue="123456" /></label>
        <button disabled={loading}>{loading ? '登录中...' : '进入后台'}</button>
      </form>
    </main>
  );
}

function AdminLayout({ user, path, toast, showToast }: { user: AdminUser; path: string; toast: Toast | null; showToast: (message: string, tone?: Toast['tone']) => void }) {
  const active = menus.find((item) => path.startsWith(item.path))?.id || 'dashboard';
  const visibleMenus = menus.filter((item) => user.permissions.includes(item.id));
  const currentTitle = menus.find((item) => item.id === active)?.label || '数据概览';
  const [modal, setModal] = useState<AdminModal>(null);

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-brand">AI 脚本平台</div>
        <p>模块化单体后台</p>
        <nav>
          {visibleMenus.map((item) => <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => navigate(item.path)}>{item.label}</button>)}
        </nav>
      </aside>
      <section className="admin-main">
        <header className="admin-header">
          <div>
            <span>当前模块</span>
            <h1>{currentTitle}</h1>
          </div>
          <div className="admin-user"><strong>{user.name}</strong><span>{user.role} / {user.tenantScope}</span><button onClick={() => navigate('/admin/login')}>退出</button></div>
        </header>
        {toast && <div className={`toast ${toast.tone}`}>{toast.message}</div>}
        <AdminPage active={active} showToast={showToast} openModal={setModal} />
        <AdminActionModal modal={modal} onClose={() => setModal(null)} />
      </section>
    </main>
  );
}

function AdminPage({ active, showToast, openModal }: { active: string; showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  if (active === 'dashboard') return <DashboardPage />;
  if (active === 'parsing') return <ParsingPage showToast={showToast} openModal={openModal} />;
  if (active === 'knowledge') return <KnowledgeBasePage showToast={showToast} openModal={openModal} />;
  if (active === 'audit') return <AuditWorkflowPage showToast={showToast} openModal={openModal} />;
  if (active === 'materials') return <MaterialsPage showToast={showToast} openModal={openModal} />;
  if (active === 'analytics') return <AnalyticsPage />;
  return <SystemManagementPage showToast={showToast} openModal={openModal} />;
}

function DashboardPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { mockApi.getDashboard().then((result: any) => setData(result)); }, []);
  return <section className="page-stack"><div className="metric-grid">{(data?.metrics || []).map((metric: any) => <MetricCard key={metric.label} {...metric} />)}</div><Panel title="异步任务队列"><DataTable columns={['队列', '运行中', '失败', '成功率']} rows={(data?.queues || []).map((item: any) => [item.name, item.running, item.failed, item.successRate])} /></Panel></section>;
}

function ParsingPage({ showToast, openModal }: { showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { mockApi.getParsingLogs().then((data: any[]) => setLogs(data)); }, []);
  return <Panel title="数据采集与解析管理" action={<div className="action-pair"><button onClick={() => openModal({ title: '解析 API 配置', description: '模拟配置第三方解析服务商、超时时间和重试次数。', confirmText: '保存配置', fields: [{ name: 'provider', label: '服务商', defaultValue: '主解析 API' }, { name: 'timeout', label: '超时时间', defaultValue: '8s' }, { name: 'retry', label: '重试次数', defaultValue: '2' }], onConfirm: async (payload) => { await mockApi.saveProviderConfig(payload); showToast('解析 API 配置已保存。'); } })}>配置 API</button><button onClick={() => showToast('已测试主解析 API，状态可用。')}>测试连通性</button></div>}><DataTable columns={['品牌', '平台', '链接', '状态', '耗时', '时间', '操作']} rows={logs.map((log) => [log.brand, log.platform, log.url, log.status, log.cost, log.time, <button className="inline-action" onClick={async () => { await mockApi.retryParsingLog(log.id); showToast('解析任务已重新入队。'); }}>重试</button>])} /></Panel>;
}

function KnowledgeBasePage({ showToast, openModal }: { showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [formulas, setFormulas] = useState<any[]>([]);
  useEffect(() => { mockApi.getFormulas().then((data: any[]) => setFormulas(data)); }, []);
  const importModal = (type: string, accept = '.csv,.xlsx') => openModal({ title: `导入${type}`, description: `请选择${type}文件，当前仅模拟上传和导入结果。`, confirmText: '开始导入', file: { label: `${type}文件`, accept }, onConfirm: async (_, file) => { if (!file) { showToast('请选择文件。', 'warning'); return; } const result = await mockApi.importKnowledgeFile({ type, fileName: file.name }) as { rows: number }; showToast(`${type}导入成功，共 ${result.rows} 条。`); } });
  return <section className="page-stack"><Panel title="结构公式库" action={<button onClick={() => openModal({ title: '新增结构公式', description: '手动录入通用爆款结构公式。', confirmText: '保存公式', fields: [{ name: 'name', label: '公式名称', placeholder: '例如：3 秒痛点 + 产品方案 + CTA' }, { name: 'platform', label: '适用平台', defaultValue: '抖音' }], onConfirm: () => showToast('结构公式已保存到 mock 知识库。') })}>新增公式</button>}><DataTable columns={['公式', '平台', '复用次数', '风险']} rows={formulas.map((item) => [item.name, item.platform, item.usage, item.risk])} /></Panel><div className="split-grid"><Panel title="合规词库" action={<button onClick={() => importModal('合规词库')}>导入词库</button>}><p>广告法高风险词、行业敏感词、替换建议统一管理。当前 mock 包含 324 条规则。</p></Panel><Panel title="产品卖点知识库" action={<button onClick={() => importModal('产品卖点库')}>导入卖点</button>}><p>按品牌隔离保存产品卖点、导入模板和历史版本，支持前台一键复用。</p></Panel></div></section>;
}

function AuditWorkflowPage({ showToast, openModal }: { showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [tasks, setTasks] = useState<any[]>([]);
  useEffect(() => { mockApi.getAuditTasks().then((data: any[]) => setTasks(data)); }, []);
  return <Panel title="审核工作流" action={<button onClick={() => showToast('待审核任务已按工作负载自动分配。')}>自动分配</button>}><DataTable columns={['脚本', '品牌', '提交人', '状态', '风险', '提交时间', '操作']} rows={tasks.map((task) => [task.script, task.brand, task.owner, task.status, task.risk, task.submittedAt, <div className="action-pair"><button className="inline-action" onClick={() => openModal({ title: '确认审核通过', description: `确认通过「${task.script}」？该操作会写入审核记录。`, confirmText: '确认通过', onConfirm: async () => { await mockApi.approveAuditTask(task.id); showToast('审核已通过。'); } })}>通过</button><button className="inline-action danger" onClick={() => openModal({ title: '驳回脚本', description: `请填写「${task.script}」的驳回原因，提交后会通知提交人。`, confirmText: '确认驳回', fields: [{ name: 'reason', label: '驳回原因', placeholder: '请输入原因' }], onConfirm: async () => { await mockApi.rejectAuditTask(task.id); showToast('审核已驳回。', 'warning'); } })}>驳回</button></div>])} /></Panel>;
}

function MaterialsPage({ showToast, openModal }: { showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [materials, setMaterials] = useState<any[]>([]);
  useEffect(() => { mockApi.getMaterials().then((data: any[]) => setMaterials(data)); }, []);
  return <Panel title="视频素材与项目库" action={<button onClick={() => openModal({ title: '上传素材', description: '上传视频片段、配音、场景图或参考素材。', confirmText: '上传素材', file: { label: '素材文件', accept: '.mp4,.png,.jpg,.mp3,.wav' }, onConfirm: async (_, file) => { if (!file) { showToast('请选择素材文件。', 'warning'); return; } showToast(`${file.name} 已上传到素材库。`); } })}>上传素材</button>}><DataTable columns={['素材', '类型', '品牌', '关联项目', '复用次数', '大小', '操作']} rows={materials.map((item) => [item.name, item.type, item.brand, item.project, item.usage, item.size, <div className="action-pair"><button className="inline-action" onClick={() => showToast(`正在预览 ${item.name}`)}>预览</button><button className="inline-action" onClick={async () => { await mockApi.downloadMaterial(item.id); showToast(`${item.name} 已创建下载任务。`); }}>下载</button><button className="inline-action danger" onClick={() => openModal({ title: '删除素材', description: `确认删除「${item.name}」？mock 会保留操作日志。`, confirmText: '确认删除', onConfirm: async () => { await mockApi.deleteMaterial(item.id); setMaterials((prev) => prev.filter((material) => material.id !== item.id)); showToast('素材已删除。', 'warning'); } })}>删除</button></div>])} /></Panel>;
}

function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { mockApi.getAnalytics().then((result: any) => setData(result)); }, []);
  return <section className="page-stack"><div className="metric-grid"><MetricCard label="播放量" value={data?.plays || '-'} delta="近 7 天" /><MetricCard label="互动率" value={data?.interactionRate || '-'} delta="高于均值" /><MetricCard label="订单数" value={data?.orders || '-'} delta="模拟数据" /><MetricCard label="ROI" value={data?.roi || '-'} delta="后续接平台" /></div><Panel title="A/B 测试报告"><p>当前 MVP 暂不实现真实投放数据，页面先保留报表结构。</p></Panel></section>;
}

function SystemManagementPage({ showToast, openModal }: { showToast: (message: string, tone?: Toast['tone']) => void; openModal: (modal: AdminModal) => void }) {
  const [tenants, setTenants] = useState<any[]>([]);
  useEffect(() => { mockApi.getTenants().then((data: any[]) => setTenants(data)); }, []);
  return <section className="page-stack"><Panel title="多租户管理" action={<button onClick={() => openModal({ title: '新增品牌租户', description: '模拟创建品牌租户，并写入系统操作日志。', confirmText: '创建租户', fields: [{ name: 'name', label: '品牌名称', placeholder: '请输入品牌名称' }, { name: 'contact', label: '联系人', placeholder: '请输入联系人' }], onConfirm: async (payload) => { await mockApi.createTenant(payload); setTenants((prev) => [{ id: `tenant_${Date.now()}`, name: String(payload.name || '新品牌'), users: 1, storage: '0GB', status: '启用' }, ...prev]); showToast('品牌租户已创建。'); } })}>新增租户</button>}><DataTable columns={['品牌租户', '用户数', '存储占用', '状态']} rows={tenants.map((tenant) => [tenant.name, tenant.users, tenant.storage, tenant.status])} /></Panel><div className="split-grid"><Panel title="角色权限" action={<button onClick={() => openModal({ title: '新增用户', description: '模拟创建用户并分配角色。', confirmText: '创建用户', fields: [{ name: 'name', label: '用户姓名' }, { name: 'role', label: '角色', defaultValue: '审核员' }], onConfirm: () => showToast('用户已创建并分配角色。') })}>新增用户</button>}><p>超级管理员、品牌管理员、审核员按模块授权，菜单由后端权限返回。</p></Panel><Panel title="操作日志"><p>登录、审核、导出、配置修改等关键操作必须不可删除。</p></Panel></div></section>;
}

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return <section className="panel"><div className="panel-head"><h2>{title}</h2>{action}</div>{children}</section>;
}

function MetricCard({ label, value, delta }: { label: string; value: string; delta: string }) {
  return <article className="metric-card"><span>{label}</span><strong>{value}</strong><em>{delta}</em></article>;
}

function DataTable({ columns, rows }: { columns: string[]; rows: any[][] }) {
  return <div className="table-wrap"><table><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function AdminActionModal({ modal, onClose }: { modal: AdminModal; onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFile(null);
    setLoading(false);
  }, [modal?.title]);

  if (!modal) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (modal.file && !file) return;
    setLoading(true);
    try {
      const payload = Object.fromEntries(new FormData(event.currentTarget));
      await modal.onConfirm(payload, file);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
      <form className="admin-modal-card" onSubmit={submit}>
        <div className="admin-modal-head">
          <div>
            <span>Mock Action</span>
            <h3>{modal.title}</h3>
          </div>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <p>{modal.description}</p>
        {modal.fields?.map((field) => (
          <label className="admin-modal-field" key={field.name}>
            <span>{field.label}</span>
            <input name={field.name} type={field.type || 'text'} placeholder={field.placeholder} defaultValue={field.defaultValue} />
          </label>
        ))}
        {modal.file && (
          <label className="admin-file-picker">
            <input type="file" accept={modal.file.accept} onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <strong>{file ? file.name : modal.file.label}</strong>
            <span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `支持格式：${modal.file.accept}`}</span>
          </label>
        )}
        <div className="admin-modal-actions">
          <button type="button" className="ghost-admin-button" onClick={onClose}>取消</button>
          <button disabled={loading || Boolean(modal.file && !file)}>{loading ? '处理中...' : modal.confirmText || '确认'}</button>
        </div>
      </form>
    </div>
  );
}
