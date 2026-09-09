import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, ArrowDownUp, CheckCircle2, Copy, Edit3, Eye, EyeOff, Film, Layers, Loader2, Palette, Plus, RefreshCcw, Search, Sparkles, Trash2, Users } from 'lucide-react';
import { creativeResourceApi, type CreativeResource, type CreativeResourceStatus, type CreativeResourceType } from '../../api/creativeResource';
import type { PageResult } from '../../api';
import { EmptyState, Modal, Pagination } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import CreativeResourceCover from './CreativeResourceCover';
import CharacterResourceSetSummary from './CharacterResourceSetSummary';
import { characterResourceViews } from './characterReferenceSet';
import { createCreativeResourceForm, creativeResourceError, creativeResourcePayload, creativeTypeDescriptions, creativeTypeLabels } from './creativeResourceForm';
import './creative-resources.css';

const CreativeResourceEditor = lazy(() => import('./CreativeResourceEditor'));
const CharacterResourcePreview = lazy(() => import('./CharacterResourcePreview'));
const types = [{ type: 'character', icon: Users, english: 'CHARACTERS' }, { type: 'style', icon: Palette, english: 'STYLES' }, { type: 'effect', icon: Sparkles, english: 'EFFECTS' }] as const;
interface Filters { keyword: string; category: string; status: CreativeResourceStatus | '' }
interface EditorState { key: number; resource?: CreativeResource; duplicate?: boolean }
const emptyFilters: Filters = { keyword: '', category: '', status: '' };

export default function CreativeResourcesPage() {
  const { notify } = useAdminShell();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedType = searchParams.get('type');
  const type: CreativeResourceType = requestedType === 'style' || requestedType === 'effect' ? requestedType : 'character';
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [applied, setApplied] = useState<Filters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const [data, setData] = useState<PageResult<CreativeResource> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [characterPreview, setCharacterPreview] = useState<CreativeResource | null>(null);
  const [removeTarget, setRemoveTarget] = useState<CreativeResource | null>(null);
  const [busyId, setBusyId] = useState('');
  const requestRef = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const operationRef = useRef(false);
  const editorSequence = useRef(0);

  const load = useCallback(async () => {
    requestRef.current?.abort();
    const controller = new AbortController(); requestRef.current = controller;
    setLoading(true); setError(''); setData(null);
    try {
      const result = await creativeResourceApi.list({ type, category: applied.category || undefined, status: applied.status || undefined, keyword: applied.keyword || undefined, page, pageSize }, controller.signal);
      if (controller.signal.aborted || !mounted.current) return;
      if (!result || !Array.isArray(result.list)) throw new Error('接口未返回有效的资源列表');
      if (page > 1 && !result.list.length && result.total > 0) { setPage(Math.max(1, Math.ceil(result.total / pageSize))); return; }
      if (page > 1 && result.total === 0) { setPage(1); return; }
      setData(result);
    } catch (cause) { if (!controller.signal.aborted && mounted.current) setError(creativeResourceError(cause, '资源列表加载失败，请稍后重试')); }
    finally { if (!controller.signal.aborted && mounted.current) setLoading(false); }
  }, [applied.category, applied.keyword, applied.status, page, pageSize, type]);
  const latestLoad = useRef(load);
  latestLoad.current = load;

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; requestRef.current?.abort(); }; }, []);
  useEffect(() => { void load(); return () => requestRef.current?.abort(); }, [load]);
  const openEditor = (resource?: CreativeResource, duplicate = false) => setEditor({ key: ++editorSequence.current, resource, duplicate });
  const switchType = (next: CreativeResourceType) => {
    setFilters(emptyFilters); setApplied(emptyFilters); setPage(1);
    setSearchParams({ type: next }, { replace: true });
  };
  const toggleStatus = async (resource: CreativeResource) => {
    if (operationRef.current) return;
    const next = resource.status === 'published' ? 'draft' : 'published';
    let payload;
    try { payload = creativeResourcePayload({ ...createCreativeResourceForm(resource.type, resource), status: next }); }
    catch (cause) { notify(creativeResourceError(cause, '请先补充发布信息')); openEditor(resource); return; }
    operationRef.current = true; setBusyId(resource.id);
    try {
      await creativeResourceApi.update(resource.id, payload);
      if (!mounted.current) return;
      const views = resource.type === 'character' ? characterResourceViews(resource.gallery) : null;
      notify(next === 'published' ? views && views.count < 4 ? `资源已发布；角色套图 ${views.count}/4，建议继续补齐参考` : '资源已发布，用户端可见' : '资源已下架并转为草稿');
      void latestLoad.current();
    } catch (cause) { if (mounted.current) notify(creativeResourceError(cause, '状态更新失败，请重试')); }
    finally { operationRef.current = false; if (mounted.current) setBusyId(''); }
  };
  const remove = async () => {
    if (!removeTarget || operationRef.current) return;
    operationRef.current = true; setBusyId(removeTarget.id);
    try {
      await creativeResourceApi.remove(removeTarget.id);
      if (!mounted.current) return;
      notify('资源已从平台目录移除'); setRemoveTarget(null); void latestLoad.current();
    } catch (cause) { if (mounted.current) notify(creativeResourceError(cause, '删除失败，请重试')); }
    finally { operationRef.current = false; if (mounted.current) setBusyId(''); }
  };
  const categories = [...new Set((data?.list || []).map(item => item.category).filter(Boolean))];
  const hasFilters = Boolean(applied.keyword || applied.category || applied.status);

  return <div className="creative-resources-page">
    <header className="creative-page-header"><div><span className="creative-eyebrow"><Layers size={14} /> PLATFORM CREATIVE LIBRARY</span><h2>创意资源库<span>把好创意，变成可复用的资源。</span></h2><p>统一维护角色、视觉风格与特效，发布后供用户在画布中选择引用。</p></div><button type="button" className="toolbar-btn primary" onClick={() => openEditor()}><Plus size={17} />新建{creativeTypeLabels[type]}</button></header>

    <nav className="creative-type-tabs" aria-label="资源类型">{types.map(item => <button type="button" key={item.type} className={type === item.type ? 'active' : ''} aria-pressed={type === item.type} onClick={() => switchType(item.type)}><span className="creative-type-icon"><item.icon size={21} /></span><span><strong>{creativeTypeLabels[item.type]}</strong><small>{item.english}</small></span>{type === item.type ? <i /> : null}</button>)}</nav>

    <section className="creative-library-panel" aria-label={`${creativeTypeLabels[type]}资源列表`}>
      <div className="creative-library-heading"><div><h3>{creativeTypeLabels[type]}资源{data ? <span>{data.total}</span> : null}</h3><p>{creativeTypeDescriptions[type]}</p></div><span className="creative-public-note"><CheckCircle2 size={14} />平台公共目录 · 草稿仅后台可见</span></div>
      <form className="creative-filters" onSubmit={event => { event.preventDefault(); setApplied({ ...filters, keyword: filters.keyword.trim(), category: filters.category.trim() }); setPage(1); }}>
        <label className="creative-search"><Search size={17} /><input aria-label="搜索创意资源" maxLength={100} value={filters.keyword} onChange={event => setFilters(current => ({ ...current, keyword: event.target.value }))} placeholder={`搜索${creativeTypeLabels[type]}名称、编码或描述`} /></label>
        <input className="creative-category-filter" aria-label="筛选分类" maxLength={80} list="creative-category-options" value={filters.category} onChange={event => setFilters(current => ({ ...current, category: event.target.value }))} placeholder="全部分类 / 输入分类" /><datalist id="creative-category-options">{categories.map(category => <option key={category} value={category} />)}</datalist>
        <select aria-label="筛选发布状态" value={filters.status} onChange={event => setFilters(current => ({ ...current, status: event.target.value as Filters['status'] }))}><option value="">全部状态</option><option value="published">已发布</option><option value="draft">草稿</option></select>
        <button className="toolbar-btn" type="submit"><Search size={15} />筛选</button><button type="button" className="creative-refresh" title="刷新列表" aria-label="刷新资源列表" disabled={loading} onClick={() => { void load(); }}><RefreshCcw size={17} className={loading ? 'creative-spin' : ''} /></button>
      </form>
      {hasFilters ? <div className="creative-filter-summary"><span>当前筛选：{[applied.keyword && `“${applied.keyword}”`, applied.category, applied.status && (applied.status === 'published' ? '已发布' : '草稿')].filter(Boolean).join(' · ')}</span><button type="button" onClick={() => { setFilters(emptyFilters); setApplied(emptyFilters); setPage(1); }}>清除筛选</button></div> : null}

      {loading ? <div className="creative-loading" role="status"><Loader2 size={23} className="creative-spin" /><strong>正在加载{creativeTypeLabels[type]}资源…</strong><span>从平台资源目录读取最新内容</span></div> : error ? <div className="creative-list-error" role="alert"><AlertCircle size={30} /><h3>资源暂时没有加载出来</h3><p>{error}</p><button type="button" className="toolbar-btn" onClick={() => { void load(); }}><RefreshCcw size={16} />重新加载</button></div> : data?.list.length ? <div className="creative-resource-grid">{data.list.map(resource => <article className="creative-resource-card" key={resource.id}>
        <button type="button" className="creative-card-preview" aria-label={`查看与编辑${resource.name}`} disabled={Boolean(busyId)} onClick={() => openEditor(resource)}><CreativeResourceCover url={resource.coverUrl} name={resource.name} /><span className={`creative-state is-${resource.status}`}><i />{resource.status === 'published' ? '已发布' : '草稿'}</span>{resource.previewVideoUrl ? <span className="creative-has-video"><Film size={12} />视频</span> : null}<span className="creative-preview-overlay"><Eye size={18} />预览与编辑</span></button>
        {resource.type === 'character' ? <CharacterResourceSetSummary gallery={resource.gallery || []} name={resource.name} disabled={Boolean(busyId)} onPreview={() => setCharacterPreview(resource)} /> : null}
        <div className="creative-card-body"><div className="creative-card-meta"><span>{resource.category || '未分类'}</span><span title="排序值越小越靠前"><ArrowDownUp size={11} />{resource.sortOrder}</span></div><h4 title={resource.name}>{resource.name}</h4><p>{resource.description || '尚未填写资源描述'}</p><div className="creative-card-tags">{(resource.tags || []).slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}{(resource.tags?.length || 0) > 3 ? <span>+{resource.tags.length - 3}</span> : null}</div><small className="creative-card-code" title={resource.code}>{resource.code}</small></div>
        <footer className="creative-card-actions"><button type="button" disabled={Boolean(busyId)} onClick={() => openEditor(resource)}><Edit3 size={14} />编辑</button><button type="button" className={resource.status === 'published' ? '' : 'creative-publish'} disabled={Boolean(busyId)} onClick={() => { void toggleStatus(resource); }}>{busyId === resource.id ? <Loader2 size={14} className="creative-spin" /> : resource.status === 'published' ? <EyeOff size={14} /> : <Eye size={14} />}{resource.status === 'published' ? '下架' : '发布'}</button><span /><button type="button" aria-label={`复制${resource.name}`} title="复制为新草稿" disabled={Boolean(busyId)} onClick={() => openEditor(resource, true)}><Copy size={15} /></button><button type="button" className="creative-delete-action" aria-label={`删除${resource.name}`} title="删除资源" disabled={Boolean(busyId)} onClick={() => setRemoveTarget(resource)}><Trash2 size={15} /></button></footer>
      </article>)}</div> : <EmptyState title={hasFilters ? '没有符合条件的资源' : `还没有${creativeTypeLabels[type]}资源`} description={hasFilters ? '试试其他关键词或清除筛选条件。' : '创建第一份资源，审核并发布后即可在用户端使用。'} icon={<Layers size={29} />} action={<button type="button" className="toolbar-btn" onClick={() => hasFilters ? (setFilters(emptyFilters), setApplied(emptyFilters), setPage(1)) : openEditor()}>{hasFilters ? '清除筛选' : `新建${creativeTypeLabels[type]}资源`}</button>} />}

      {data && !loading && !error ? <div className="creative-pagination"><label>每页<select aria-label="每页资源数" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }}><option value={12}>12 条</option><option value={24}>24 条</option><option value={48}>48 条</option></select></label><Pagination page={page} pageSize={pageSize} total={data.total} onChange={setPage} /></div> : null}
    </section>

    {editor ? <Suspense fallback={<div className="creative-editor-loading" role="status"><Loader2 size={22} className="creative-spin" />正在打开资源编辑器…</div>}><CreativeResourceEditor key={editor.key} type={type} resource={editor.resource} duplicate={editor.duplicate} onClose={() => setEditor(null)} onSaved={saved => { setEditor(null); notify(saved.status === 'published' ? '资源已保存并发布' : '草稿已保存'); if (saved.type !== type) switchType(saved.type); else void load(); }} /></Suspense> : null}
    {characterPreview ? <Suspense fallback={<div className="creative-editor-loading" role="status"><Loader2 size={22} className="creative-spin" />正在打开角色套图…</div>}><CharacterResourcePreview name={characterPreview.name} gallery={characterPreview.gallery || []} onClose={() => setCharacterPreview(null)} onEdit={() => { openEditor(characterPreview); setCharacterPreview(null); }} /></Suspense> : null}
    <Modal open={Boolean(removeTarget)} title="移除这个资源？" description="资源将从平台公共目录中移除，不会删除文件存储中的原始素材。" onClose={() => { if (!busyId) setRemoveTarget(null); }} size="sm" closeOnBackdrop={!busyId} footer={<><button type="button" className="toolbar-btn" disabled={Boolean(busyId)} onClick={() => setRemoveTarget(null)}>保留资源</button><button type="button" className="toolbar-btn creative-danger-button" disabled={Boolean(busyId)} onClick={() => { void remove(); }}>{busyId ? <Loader2 size={15} className="creative-spin" /> : <Trash2 size={15} />}确认删除</button></>}><p className="creative-delete-copy">{removeTarget?.name}</p></Modal>
  </div>;
}
