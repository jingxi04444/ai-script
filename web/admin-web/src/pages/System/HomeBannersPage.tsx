import { useEffect, useMemo, useState } from 'react';
import { Edit3, Eye, EyeOff, Image, Plus, RefreshCcw, Trash2, UploadCloud } from 'lucide-react';
import { systemApi, type HomeBanner } from '../../api/system';
import { uploadApi } from '../../api/upload';
import { EmptyState, Modal, PageHeader, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import { optionalNumberFromInput } from '../../utils/form';
import './home-banners-page.css';

const createEmptyBanner = (sortOrder: number): HomeBanner => ({
  title: '',
  subtitle: '',
  imageUrl: '',
  imageKey: '',
  linkUrl: '/workspace',
  sortOrder,
  status: 1,
});

const getNextSortOrder = (rows: HomeBanner[]) => {
  const maxSort = rows.reduce((max, item) => Math.max(max, Number(item.sortOrder ?? 0)), 0);
  return maxSort > 0 ? Math.ceil((maxSort + 10) / 10) * 10 : 10;
};

const sortBanners = (rows: HomeBanner[]) => [...rows].sort((left, right) => {
  const leftSort = Number(left.sortOrder ?? 0);
  const rightSort = Number(right.sortOrder ?? 0);
  if (leftSort !== rightSort) return leftSort - rightSort;
  return String(left.id ?? '').localeCompare(String(right.id ?? ''));
});

interface HomeBannersPageProps {
  embedded?: boolean;
}

const HomeBannersPage = ({ embedded = false }: HomeBannersPageProps) => {
  const { notify } = useAdminShell();
  const [items, setItems] = useState<HomeBanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HomeBanner | null>(null);

  const load = async () => {
    setLoading(true);
    try { setItems(await systemApi.getHomeBanners()); }
    catch { notify('轮播列表加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const rows = useMemo(() => sortBanners(items), [items]);

  const openCreateModal = () => {
    setEditingId(null);
    setDraft(createEmptyBanner(getNextSortOrder(items)));
    setEditorOpen(true);
  };

  const openEditModal = (index: number) => {
    const item = rows[index];
    if (!item) return;
    if (!item.id) return notify('轮播项缺少 ID，无法编辑');
    setEditingId(item.id);
    setDraft({ ...item });
    setEditorOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setEditorOpen(false);
    setEditingId(null);
    setDraft(null);
  };

  const updateDraft = (changes: Partial<HomeBanner>) => {
    setDraft((current) => (current ? { ...current, ...changes } : current));
  };

  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.title.trim()) return notify('轮播标题不能为空');
    setSaving(true);
    try {
      const saved = editingId
        ? await systemApi.updateHomeBanner(editingId, draft)
        : await systemApi.createHomeBanner(draft);
      setItems((current) => {
        const next = editingId
          ? current.map((value) => (value.id === editingId ? saved : value))
          : [...current, saved];
        return sortBanners(next);
      });
      notify('轮播项已保存');
      setEditorOpen(false);
      setEditingId(null);
      setDraft(null);
    } catch {
      notify('轮播项保存失败');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (index: number) => {
    const item = rows[index];
    if (!item?.id) return notify('轮播项缺少 ID，无法删除');
    try {
      await systemApi.deleteHomeBanner(item.id);
      setItems((current) => current.filter((value) => value.id !== item.id));
      notify('轮播项已删除');
    } catch { notify('轮播项删除失败'); }
  };

  const toggleStatus = async (index: number) => {
    const item = rows[index];
    if (!item?.id) return notify('轮播项缺少 ID，无法切换状态');
    const nextStatus = item.status === 0 ? 1 : 0;
    try {
      const saved = await systemApi.updateHomeBanner(item.id, { ...item, status: nextStatus });
      setItems((current) => sortBanners(current.map((value) => (value.id === item.id ? saved : value))));
      notify(nextStatus === 1 ? '轮播已启用' : '轮播已停用');
    } catch {
      notify('状态更新失败');
    }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    try {
      const result = await uploadApi.uploadFile(file);
      updateDraft({ imageUrl: result.url, imageKey: result.objectKey });
      notify('图片上传成功，请保存轮播项');
    } catch { notify('图片上传失败'); }
  };

  const headerActions = (
    <>
      <button className="toolbar-btn" type="button" onClick={load}><RefreshCcw size={16} />{loading ? '加载中' : '刷新'}</button>
      <button className="toolbar-btn primary" type="button" onClick={openCreateModal}><Plus size={16} />新增轮播</button>
    </>
  );

  return (
    <div className={`${embedded ? 'home-banners-embedded' : 'page-stack'} home-banners-page`}>
      {!embedded && <PageHeader
        title="首页轮播"
        description="独立维护用户端首页轮播图，启用项按排序值从小到大展示。"
        actions={headerActions}
      />}
      <SectionCard title="轮播项" description="维护图片、标题、副标题、跳转和排序，保存后同步到用户端首页。" action={embedded ? headerActions : undefined}>
        {rows.length ? (
          <div className="admin-table home-banner-table">
            <div className="table-head home-banner-table-head">
              <span>图片</span>
              <span>标题</span>
              <span>副标题</span>
              <span>图片 URL</span>
              <span>跳转地址</span>
              <span>排序</span>
              <span>状态</span>
              <span>操作</span>
            </div>
            {rows.map((item, index) => (
              <div className={`table-row home-banner-row ${item.status === 0 ? 'is-off' : ''}`} key={item.id || `banner-${index}`}>
                <div className="home-banner-thumb">
                  {item.imageUrl ? <img src={item.imageUrl} alt={item.title || '轮播图'} /> : <div className="home-banner-thumb-empty"><Image size={18} /><span>占位</span></div>}
                </div>
                <strong className="home-banner-title" title={item.title || '未命名轮播'}>{item.title || '未命名轮播'}</strong>
                <span className="home-banner-text" title={item.subtitle || '—'}>{item.subtitle || '—'}</span>
                <span className="home-banner-text home-banner-url" title={item.imageUrl || '—'}>{item.imageUrl || '—'}</span>
                <span className="home-banner-text home-banner-url" title={item.linkUrl || '—'}>{item.linkUrl || '—'}</span>
                <span className="home-banner-sort">{item.sortOrder ?? 0}</span>
                <StatusBadge tone={item.status === 0 ? 'gray' : 'green'}>{item.status === 0 ? '停用' : '启用'}</StatusBadge>
                <div className="table-actions home-banner-actions">
                  <button className="table-btn" type="button" onClick={() => openEditModal(index)}><Edit3 size={14} />编辑</button>
                  <button className="table-btn" type="button" onClick={() => toggleStatus(index)}>{item.status === 0 ? <><Eye size={14} />启用</> : <><EyeOff size={14} />停用</>}</button>
                  <button className="table-btn danger" type="button" onClick={() => remove(index)}><Trash2 size={14} />删除</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={loading ? '加载中…' : '暂无轮播项'} description="点击“新增轮播”创建首页展示内容。" icon={<Image size={22} />} />
        )}
      </SectionCard>

      <Modal
        open={editorOpen}
        size="lg"
        title={editingId ? '编辑轮播' : '新增轮播'}
        description="请在弹窗中编辑轮播信息，保存后同步到首页展示。"
        onClose={closeModal}
        footer={(
          <>
            <button className="modal-btn" type="button" onClick={closeModal}>取消</button>
            <button className="modal-btn primary" type="button" onClick={saveDraft} disabled={saving}>{saving ? '保存中' : '保存'}</button>
          </>
        )}
      >
        <div className="home-banner-modal">
          <div className="home-banner-cover">
            <div className="home-banner-preview-large">
              {draft?.imageUrl ? <img src={draft.imageUrl} alt={draft.title || '轮播预览'} /> : <div className="home-banner-preview-empty"><Image size={28} /><span>暂无图片</span></div>}
            </div>
            <div className="home-banner-cover-actions">
              <label className="toolbar-btn upload-btn home-banner-upload">
                <UploadCloud size={15} />上传图片
                <input type="file" hidden accept="image/*" onChange={(event) => upload(event.target.files?.[0])} />
              </label>
              <p>支持直接上传图片，上传后会自动填充图片 URL 和图片 Key。</p>
            </div>
          </div>

          <div className="field-grid home-banner-form-grid">
            <label className="field">
              <span>标题</span>
              <input value={draft?.title || ''} onChange={(event) => updateDraft({ title: event.target.value })} placeholder="请输入轮播标题" />
            </label>
            <label className="field">
              <span>副标题</span>
              <input value={draft?.subtitle || ''} onChange={(event) => updateDraft({ subtitle: event.target.value })} placeholder="请输入副标题" />
            </label>
            <label className="field field-span-2">
              <span>图片 URL</span>
              <input value={draft?.imageUrl || ''} onChange={(event) => updateDraft({ imageUrl: event.target.value })} placeholder="请输入图片地址" />
            </label>
            <label className="field field-span-2">
              <span>图片 Key</span>
              <input value={draft?.imageKey || ''} onChange={(event) => updateDraft({ imageKey: event.target.value })} placeholder="上传后自动填充，也可手动维护" />
            </label>
            <label className="field field-span-2">
              <span>跳转地址</span>
              <input value={draft?.linkUrl || ''} onChange={(event) => updateDraft({ linkUrl: event.target.value })} placeholder="/workspace 或 https://..." />
            </label>
            <label className="field">
              <span>排序值</span>
              <input type="number" value={draft?.sortOrder ?? ''} onChange={(event) => updateDraft({ sortOrder: optionalNumberFromInput(event.target.value) })} />
            </label>
            <label className="field">
              <span>状态</span>
              <select value={draft?.status ?? 1} onChange={(event) => updateDraft({ status: Number(event.target.value) })}>
                <option value={1}>启用</option>
                <option value={0}>停用</option>
              </select>
            </label>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HomeBannersPage;
