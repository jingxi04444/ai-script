import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  RefreshCcw,
  Store,
  Trash2,
} from 'lucide-react';
import {
  marketFunctionApi,
  type MarketFunctionItem,
  type MarketFunctionPayload,
  type MarketFunctionType,
} from '../../api/marketFunction';
import { EmptyState, Modal, PageHeader, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import './market-functions-page.css';

const emptyForm: MarketFunctionPayload = {
  code: '',
  title: '',
  summary: '',
  description: '',
  badge: '',
  icon: 'sparkles',
  coverUrl: '',
  featureType: 'builtin',
  route: '/market/',
  category: '',
  tags: [],
  sortOrder: 100,
  status: 0,
};

const iconOptions = [
  { value: 'flame', label: '火焰 / 爆款' },
  { value: 'sparkles', label: '灵感 / AI' },
  { value: 'search', label: '搜索 / 发现' },
  { value: 'chart', label: '数据 / 分析' },
  { value: 'video', label: '视频 / 创作' },
  { value: 'link', label: '链接 / 解析' },
  { value: 'bolt', label: '效率 / 工具' },
];

const toPayload = (item: MarketFunctionItem): MarketFunctionPayload => ({
  code: item.code,
  title: item.title,
  summary: item.summary,
  description: item.description || '',
  badge: item.badge || '',
  icon: item.icon || 'sparkles',
  coverUrl: item.coverUrl || '',
  featureType: item.featureType,
  route: item.route,
  category: item.category || '',
  tags: item.tags || [],
  sortOrder: item.sortOrder,
  status: item.status,
});

const MarketFunctionsPage = () => {
  const { notify } = useAdminShell();
  const [items, setItems] = useState<MarketFunctionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MarketFunctionItem | null>(null);
  const [form, setForm] = useState<MarketFunctionPayload>(emptyForm);
  const [tagText, setTagText] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MarketFunctionItem | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await marketFunctionApi.list();
      setItems(Array.isArray(result) ? result : []);
    } catch {
      notify('市场功能加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setTagText('');
    setEditorOpen(true);
  };

  const openEdit = (item: MarketFunctionItem) => {
    setEditing(item);
    setForm(toPayload(item));
    setTagText((item.tags || []).join(', '));
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorOpen(false);
    setEditing(null);
  };

  const save = async () => {
    if (saving) return;
    if (!form.code.trim() || !form.title.trim() || !form.summary.trim() || !form.route.trim()) {
      notify('请填写功能编码、名称、简介和入口');
      return;
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.code.trim())) {
      notify('功能编码仅支持小写字母、数字和连字符');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        code: form.code.trim(),
        title: form.title.trim(),
        summary: form.summary.trim(),
        route: form.route.trim(),
        tags: tagText.split(/[,，]/).map((tag) => tag.trim()).filter(Boolean),
      };
      const saved = editing
        ? await marketFunctionApi.update(editing.id, payload)
        : await marketFunctionApi.create(payload);
      setItems((current) => {
        const next = editing
          ? current.map((item) => item.id === saved.id ? saved : item)
          : [...current, saved];
        return next.sort((left, right) => left.sortOrder - right.sortOrder);
      });
      notify(editing ? '市场功能已更新' : '市场功能已创建');
      closeEditor();
    } catch (error) {
      notify((error as { message?: string })?.message || '市场功能保存失败');
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (item: MarketFunctionItem) => {
    if (busyId) return;
    setBusyId(item.id);
    try {
      const saved = await marketFunctionApi.update(item.id, {
        ...toPayload(item),
        status: item.status === 1 ? 0 : 1,
      });
      setItems((current) => current.map((row) => row.id === saved.id ? saved : row));
      notify(saved.status === 1 ? '功能已上架到用户市场' : '功能已从用户市场下架');
    } catch (error) {
      notify((error as { message?: string })?.message || '状态更新失败');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget || busyId) return;
    setBusyId(deleteTarget.id);
    try {
      await marketFunctionApi.remove(deleteTarget.id);
      setItems((current) => current.filter((item) => item.id !== deleteTarget.id));
      notify('市场功能已删除');
      setDeleteTarget(null);
    } catch (error) {
      notify((error as { message?: string })?.message || '删除失败');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-stack market-functions-page">
      <PageHeader
        title="市场功能管理"
        description="控制用户端市场展示哪些能力。只有“已上架”功能会出现在用户市场，顺序由上架排序值决定。"
        actions={(
          <div className="toolbar-group">
            <button className="toolbar-btn" type="button" onClick={() => void load()} disabled={loading}>
              <RefreshCcw size={16} />刷新
            </button>
            <button className="toolbar-btn primary" type="button" onClick={openCreate}>
              <Plus size={16} />新增功能
            </button>
          </div>
        )}
      />

      <section className="market-functions-summary">
        <div><span>全部功能</span><strong>{items.length}</strong></div>
        <div><span>已上架</span><strong>{items.filter((item) => item.status === 1).length}</strong></div>
        <p>用户端只读取已上架列表。草稿可以继续编辑，不会暴露给用户。</p>
      </section>

      <SectionCard title="功能列表" description="修改状态后立即影响用户端市场。">
        {loading ? (
          <div className="market-functions-state">正在加载市场功能...</div>
        ) : items.length === 0 ? (
          <EmptyState
            title="还没有市场功能"
            description="新增并上架第一个功能后，用户端市场会自动显示。"
            icon={<Store size={24} />}
            action={<button className="toolbar-btn primary" type="button" onClick={openCreate}>新增功能</button>}
          />
        ) : (
          <div className="market-functions-list">
            <div className="market-functions-row head">
              <span>功能</span><span>分类</span><span>入口</span><span>排序</span><span>状态</span><span>操作</span>
            </div>
            {items.map((item) => (
              <article className="market-functions-row" key={item.id}>
                <div className="market-function-title">
                  <span className={`market-function-icon icon-${item.icon}`}>{item.title.slice(0, 1)}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.code}</small>
                  </div>
                  {item.badge ? <em>{item.badge}</em> : null}
                </div>
                <span>{item.category || '未分类'}</span>
                <span className="market-function-entry" title={item.route}>
                  {item.featureType === 'external' ? '外部链接' : '站内功能'} · {item.route}
                </span>
                <span>{item.sortOrder}</span>
                <StatusBadge tone={item.status === 1 ? 'green' : 'gray'}>
                  {item.status === 1 ? '已上架' : '草稿'}
                </StatusBadge>
                <div className="market-function-actions">
                  <button type="button" onClick={() => void togglePublished(item)} disabled={busyId === item.id}>
                    {item.status === 1 ? <EyeOff size={15} /> : <Eye size={15} />}
                    {item.status === 1 ? '下架' : '上架'}
                  </button>
                  <button type="button" onClick={() => openEdit(item)}><Pencil size={15} />编辑</button>
                  <button className="danger" type="button" onClick={() => setDeleteTarget(item)}><Trash2 size={15} /></button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <Modal
        open={editorOpen}
        title={editing ? '编辑市场功能' : '新增市场功能'}
        description="功能编码创建后不建议修改；站内入口必须以 /market/ 开头。"
        onClose={closeEditor}
        size="lg"
        footer={(
          <>
            <button className="modal-btn" type="button" onClick={closeEditor} disabled={saving}>取消</button>
            <button className="modal-btn primary" type="button" onClick={() => void save()} disabled={saving}>
              {saving ? '保存中' : '保存功能'}
            </button>
          </>
        )}
      >
        <div className="market-function-form">
          <div className="field-grid">
            <label className="field"><span>功能名称</span><input value={form.title} maxLength={120} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="例如：品类爆款链接" /></label>
            <label className="field"><span>功能编码</span><input value={form.code} maxLength={80} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="category-viral-links" /></label>
            <label className="field"><span>功能分类</span><input value={form.category || ''} maxLength={60} onChange={(event) => setForm({ ...form, category: event.target.value })} placeholder="内容灵感 / 数据分析" /></label>
            <label className="field"><span>卡片图标</span><select value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })}>{iconOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <label className="field"><span>功能类型</span><select value={form.featureType} onChange={(event) => setForm({ ...form, featureType: event.target.value as MarketFunctionType })}><option value="builtin">站内功能</option><option value="external">外部链接</option></select></label>
            <label className="field"><span>排序值</span><input type="number" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: Number(event.target.value) || 0 })} /></label>
            <label className="field"><span>角标</span><input value={form.badge || ''} maxLength={40} onChange={(event) => setForm({ ...form, badge: event.target.value })} placeholder="HOT / NEW / BETA" /></label>
            <label className="field"><span>状态</span><select value={form.status} onChange={(event) => setForm({ ...form, status: Number(event.target.value) })}><option value={0}>保存草稿</option><option value={1}>直接上架</option></select></label>
          </div>
          <label className="field"><span>功能入口</span><input value={form.route} maxLength={1000} onChange={(event) => setForm({ ...form, route: event.target.value })} placeholder="/market/category-viral-links 或 https://..." /></label>
          <label className="field"><span>卡片简介</span><textarea value={form.summary} maxLength={500} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="展示在用户市场卡片上的简短介绍" /></label>
          <label className="field"><span>功能说明</span><textarea value={form.description || ''} maxLength={5000} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="可选，用于后续详情页或运营说明" /></label>
          <label className="field"><span>标签</span><input value={tagText} onChange={(event) => setTagText(event.target.value)} placeholder="爆款链接, 品类测评, 短视频" /></label>
          <label className="field"><span>封面图片地址</span><input value={form.coverUrl || ''} onChange={(event) => setForm({ ...form, coverUrl: event.target.value })} placeholder="可选，https://...；留空使用默认图形封面" /></label>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        title="删除市场功能"
        description="删除后该功能会从后台和用户市场消失，历史链接将无法访问。"
        onClose={() => setDeleteTarget(null)}
        footer={(
          <>
            <button className="modal-btn" type="button" onClick={() => setDeleteTarget(null)}>取消</button>
            <button className="modal-btn danger" type="button" onClick={() => void remove()} disabled={Boolean(busyId)}>确认删除</button>
          </>
        )}
      >
        <EmptyState
          title={deleteTarget?.title || '该功能'}
          description="确认删除这个市场功能？如果只是暂时隐藏，建议使用“下架”。"
          icon={<ArrowUpRight size={22} />}
        />
      </Modal>
    </div>
  );
};

export default MarketFunctionsPage;
