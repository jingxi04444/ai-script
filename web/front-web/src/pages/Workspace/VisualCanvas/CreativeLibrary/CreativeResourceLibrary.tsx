import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AppstoreOutlined, ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined, CloseOutlined, HeartFilled, HeartOutlined, HistoryOutlined, LoadingOutlined, PictureOutlined, ReloadOutlined, SearchOutlined, UnorderedListOutlined, UserOutlined, BgColorsOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { creativeResourceApi } from '../../../../api/creativeResource';
import type { CreativeResource, CreativeResourceImage, CreativeResourceType } from '../../../../types/creativeResource';
import { creativeResourceLabels } from '../../../../types/creativeResource';
import { getApiErrorMessage } from '../../../../utils/apiError';
import { useCreativeCollection } from './useCreativeCollection';
import CreativeResourcePreview from './CreativeResourcePreview';
import './creative-resource-library.css';
import CharacterLibraryPanel from './CharacterLibraryPanel';
import CreativeImageLightbox from './CreativeImageLightbox';

interface CreativeResourceLibraryProps {
  initialType: CreativeResourceType;
  userId?: string;
  targetName?: string;
  replacing?: boolean;
  replacementViewLabel?: string;
  onClose: () => void;
  onApply: (resource: CreativeResource) => void;
}
const types: CreativeResourceType[] = ['character', 'style', 'effect'];
const typeIcons = { character: <UserOutlined aria-hidden />, style: <BgColorsOutlined aria-hidden />, effect: <ThunderboltOutlined aria-hidden /> };
const typeDescriptions = {
  character: '让每一个镜头，都认得同一个人。',
  style: '从光影到质感，建立作品的视觉语言。',
  effect: '选择运镜或特效提示词，在下游生成动态画面。',
};
const emptyCategories: Record<CreativeResourceType, string[]> = { character: [], style: [], effect: [] };

export default function CreativeResourceLibrary({ initialType, userId, targetName, replacing = false, replacementViewLabel, onClose, onApply }: CreativeResourceLibraryProps) {
  const [type, setType] = useState(initialType);
  const [scope, setScope] = useState<'all' | 'favorites' | 'recent'>('all');
  const [keyword, setKeyword] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState(emptyCategories);
  const [layout, setLayout] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [items, setItems] = useState<CreativeResource[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CreativeResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [localWarning, setLocalWarning] = useState('');
  const [retry, setRetry] = useState(0);
  const [applying, setApplying] = useState(false);
  const [previewImage, setPreviewImage] = useState<CreativeResourceImage | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const operationRef = useRef(false);
  const previewImageRef = useRef(previewImage);
  const collection = useCreativeCollection(userId);
  const localIds = scope === 'favorites' ? collection.favorites : collection.recent;
  const localIdsKey = scope === 'all' ? '' : localIds.join(',');
  onCloseRef.current = onClose;
  previewImageRef.current = previewImage;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    const backdrop = dialogRef.current?.parentElement;
    const background = Array.from(document.body.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element !== backdrop);
    const previousInert = background.map(element => element.inert);
    background.forEach(element => { element.inert = true; });
    document.body.style.overflow = 'hidden';
    searchRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopImmediatePropagation();
        if (previewImageRef.current) { setPreviewImage(null); return; }
        if (!operationRef.current) onCloseRef.current();
      }
      if (event.key === 'Tab') {
        const focusRoot = previewImageRef.current ? document.querySelector<HTMLElement>('.creative-image-lightbox') : dialogRef.current;
        const focusable = Array.from(focusRoot?.querySelectorAll<HTMLElement>('button:not(:disabled), input, select, summary, [tabindex="0"], video[controls]') || []).filter(element => element.getClientRects().length);
        const first = focusable[0]; const last = focusable[focusable.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === focusRoot)) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = overflow;
      background.forEach((element, index) => { element.inert = previousInert[index]; });
      if (previousFocus?.isConnected) previousFocus.focus();
      else document.querySelector<HTMLElement>('[aria-label="素材与图片"]')?.focus();
    };
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => { setSearch(keyword.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timeout);
  }, [keyword]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setLocalWarning(''); setDetail(null); setSelectedId(null); setItems([]);
    const load = async () => {
      if (scope === 'all') return creativeResourceApi.list({ type, keyword: search || undefined, category: category || undefined, page, pageSize: 18 }, controller.signal);
      const results = await Promise.allSettled((localIdsKey ? localIdsKey.split(',') : []).map(id => creativeResourceApi.get(id, controller.signal)));
      if (controller.signal.aborted) return null;
      const valid = results.flatMap(result => result.status === 'fulfilled' ? [result.value] : []);
      if (results.some(result => result.status === 'rejected')) {
        if (!valid.length && results.length) throw new Error('本机记录中的资源暂不可用，请重试或浏览全部资源');
        setLocalWarning('部分本机记录对应的资源已下架或暂不可用');
      }
      const filtered = valid.filter(item => item.type === type && (!category || item.category === category)
        && (!search || `${item.name} ${item.description} ${item.tags.join(' ')}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())));
      return { list: filtered.slice((page - 1) * 18, page * 18), total: filtered.length, pages: Math.ceil(filtered.length / 18) };
    };
    void load().then(result => {
      if (controller.signal.aborted || !result) return;
      setItems(result.list); setTotal(result.total); setPages(result.pages); setSelectedId(result.list[0]?.id || null);
      setCategories(current => ({ ...current, [type]: [...new Set([...current[type], ...result.list.map(item => item.category).filter(Boolean)])] }));
    }).catch(cause => { if (!controller.signal.aborted) { setError(getApiErrorMessage(cause, '资源库加载失败，请重试')); setTotal(0); setPages(0); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [category, localIdsKey, page, retry, scope, search, type]);

  useEffect(() => {
    if (!selectedId) { setDetail(null); setDetailLoading(false); setDetailError(''); return; }
    const controller = new AbortController();
    setDetailLoading(true); setDetailError(''); setDetail(null);
    void creativeResourceApi.get(selectedId, controller.signal).then(resource => {
      if (!controller.signal.aborted) setDetail(resource);
    }).catch(cause => { if (!controller.signal.aborted) setDetailError(getApiErrorMessage(cause, '资源详情加载失败')); })
      .finally(() => { if (!controller.signal.aborted) setDetailLoading(false); });
    return () => controller.abort();
  }, [selectedId, retry]);

  const apply = useCallback(async () => {
    if (!detail || operationRef.current) return;
    operationRef.current = true; setApplying(true); setDetailError('');
    try {
      const current = await creativeResourceApi.get(detail.id);
      onApply(current); collection.recordUse(current.id); onCloseRef.current();
    } catch (cause) { setDetailError(getApiErrorMessage(cause, '资源应用失败，请重试')); }
    finally { operationRef.current = false; setApplying(false); }
  }, [collection, detail, onApply]);

  return createPortal(<div className="creative-library-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !applying) onClose(); }}>
    <div ref={dialogRef} className={`creative-library${type === 'character' ? ' is-character-library' : ''}`} role="dialog" aria-modal="true" aria-labelledby="creative-library-title" tabIndex={-1}>
      <header className="creative-library-header">
        <div className="creative-library-brand"><span><AppstoreOutlined /></span><div><small>CREATIVE LIBRARY</small><h2 id="creative-library-title">创意资源库</h2></div></div>
        <div className="creative-type-tabs" role="tablist" aria-label="资源类型">{types.map(item => <button type="button" key={item} role="tab" aria-selected={type === item} disabled={applying || (replacing && item !== initialType)} title={replacing && item !== initialType ? '更换资源时保持原节点类型；关闭后可从工具栏打开其它资源库' : undefined} onClick={() => { setType(item); setCategory(''); setPage(1); }}>{typeIcons[item]}{creativeResourceLabels[item]}库</button>)}</div>
        <button type="button" className="creative-close" disabled={applying} aria-label="关闭创意资源库" onClick={onClose}><CloseOutlined /></button>
      </header>
      {type === 'character' ? <CharacterLibraryPanel
        detail={detail} items={items} selectedId={selectedId} loading={loading} detailLoading={detailLoading}
        error={error} detailError={detailError} warning={collection.storageError || localWarning}
        categories={categories.character} category={category} keyword={keyword} scope={scope}
        favorites={collection.favorites} total={total} page={page} pages={pages} applying={applying}
        targetName={targetName} replacing={replacing} replacementViewLabel={replacementViewLabel} isDemo={creativeResourceApi.isDemo} searchRef={searchRef}
        onCategoryChange={value => { setCategory(value); setPage(1); }} onKeywordChange={setKeyword}
        onScopeChange={value => { setScope(value); setPage(1); }} onSelect={setSelectedId}
        onFavorite={collection.toggleFavorite} onPreviewImage={setPreviewImage}
        onApply={() => { void apply(); }} onRetry={() => setRetry(value => value + 1)} onPageChange={setPage}
      /> : <div className="creative-library-body">
        <nav className="creative-sidebar" aria-label="资源分类">
          <small>发现灵感</small>
          <button className={scope === 'all' ? 'is-active' : ''} onClick={() => { setScope('all'); setPage(1); }}><AppstoreOutlined aria-hidden />全部{creativeResourceLabels[type]}</button>
          <button aria-label="我的收藏（本机）" className={scope === 'favorites' ? 'is-active' : ''} onClick={() => { setScope('favorites'); setPage(1); }}><HeartOutlined aria-hidden />我的收藏<em>本机</em></button>
          <button aria-label="最近使用（本机）" className={scope === 'recent' ? 'is-active' : ''} onClick={() => { setScope('recent'); setPage(1); }}><HistoryOutlined aria-hidden />最近使用<em>本机</em></button>
          <div className="creative-sidebar-line" /><small>分类筛选</small>
          <button className={!category ? 'is-selected' : ''} onClick={() => { setCategory(''); setPage(1); }}>全部分类{!category ? <CheckOutlined aria-hidden /> : null}</button>
          {categories[type].map(item => <button key={item} className={category === item ? 'is-selected' : ''} onClick={() => { setCategory(item); setPage(1); }}>{item}{category === item ? <CheckOutlined aria-hidden /> : null}</button>)}
          <div className="creative-sidebar-note"><span>{creativeResourceApi.isDemo ? '演示资源' : '精选资源，持续更新'}</span><p>选择喜欢的资源，让灵感在画布中延续。</p></div>
        </nav>
        <main className="creative-catalog">
          <div className="creative-mobile-filters">
            <select aria-label="资源范围" value={scope} onChange={event => { setScope(event.target.value as typeof scope); setPage(1); }}><option value="all">全部资源</option><option value="favorites">我的收藏（本机）</option><option value="recent">最近使用（本机）</option></select>
            <select aria-label="资源分类筛选" value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="">全部分类</option>{categories[type].map(item => <option key={item}>{item}</option>)}</select>
          </div>
          <div className="creative-catalog-heading"><span>CURATED / {type.toUpperCase()}</span><h3>{scope === 'favorites' ? '收藏的灵感' : scope === 'recent' ? '最近用过的资源' : `${creativeResourceLabels[type]}，是创作的开始`}</h3><p>{typeDescriptions[type]}</p></div>
          <div className="creative-catalog-toolbar"><label><SearchOutlined /><input ref={searchRef} aria-label="搜索创意资源" placeholder={`搜索${creativeResourceLabels[type]}名称、标签…`} value={keyword} onChange={event => setKeyword(event.target.value)} /></label><div className="creative-layout-switch"><button aria-label="网格视图" aria-pressed={layout === 'grid'} onClick={() => setLayout('grid')}><AppstoreOutlined /></button><button aria-label="列表视图" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}><UnorderedListOutlined /></button></div></div>
          <div className="creative-catalog-meta"><span>{loading ? '正在整理资源…' : `${total} 项${scope === 'all' ? '精选' : '匹配'}资源`}</span><span>{scope !== 'all' ? '仅记录在当前账户的本机浏览器' : creativeResourceApi.isDemo ? 'DEMO · 本地示例' : '已发布资源'}</span></div>
          {collection.storageError || localWarning ? <div className="creative-inline-warning" role="status">{collection.storageError || localWarning}</div> : null}
          {loading ? <div className="creative-loading" role="status"><LoadingOutlined spin /><span>正在加载{creativeResourceLabels[type]}库</span></div>
            : error ? <div className="creative-empty" role="alert"><PictureOutlined /><h4>资源库暂不可用</h4><p>{error}</p><button onClick={() => setRetry(value => value + 1)}><ReloadOutlined aria-hidden />重新加载</button></div>
              : !items.length ? <div className="creative-empty"><SearchOutlined /><h4>{scope === 'favorites' ? '还没有匹配的收藏' : scope === 'recent' ? '还没有使用记录' : '没有找到匹配的资源'}</h4><p>{scope === 'all' ? '试试其他关键词或分类。' : '浏览全部资源，收藏或应用后会显示在这里。'}</p><button onClick={() => { setKeyword(''); setSearch(''); setCategory(''); setScope('all'); setPage(1); }}>浏览全部资源</button></div>
                : <div className={`creative-card-grid is-${layout} type-${type}`} aria-label={`${creativeResourceLabels[type]}资源列表`}>
                  {items.map(item => <div className={`creative-card${selectedId === item.id ? ' is-selected' : ''}`} key={item.id}>
                    <button className="creative-card-select" aria-label={`查看${creativeResourceLabels[type]}：${item.name}`} aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}>
                      <span className="creative-card-image"><img src={item.coverUrl} alt={item.name} loading="lazy" />{selectedId === item.id ? <i><CheckOutlined /></i> : null}</span>
                      <span className="creative-card-copy"><strong>{item.name}</strong><small>{item.category || creativeResourceLabels[type]} · {item.tags.slice(0, 2).join(' / ')}</small><em>{item.description}</em></span>
                    </button>
                    <button className={`creative-card-favorite${collection.favorites.includes(item.id) ? ' is-saved' : ''}`} aria-label={`${collection.favorites.includes(item.id) ? '取消收藏' : '收藏'}：${item.name}`} onClick={() => collection.toggleFavorite(item.id)}>{collection.favorites.includes(item.id) ? <HeartFilled /> : <HeartOutlined />}</button>
                  </div>)}
                </div>}
          {pages > 1 ? <nav className="creative-pagination" aria-label="资源分页"><button aria-label="上一页资源" disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ArrowLeftOutlined /></button><span>{page} / {pages}</span><button aria-label="下一页资源" disabled={page >= pages} onClick={() => setPage(value => value + 1)}><ArrowRightOutlined /></button></nav> : null}
        </main>
        {detailLoading ? <aside className="creative-detail creative-loading" role="status"><LoadingOutlined spin /><span>正在载入详情</span></aside>
          : detail ? <div className="creative-detail-wrap">{detailError ? <div className="creative-inline-warning" role="alert">{detailError}<button onClick={() => setRetry(value => value + 1)}>重试</button></div> : null}<CreativeResourcePreview key={detail.id} resource={detail} favorite={collection.favorites.includes(detail.id)} applying={applying} targetName={targetName} onFavorite={() => collection.toggleFavorite(detail.id)} onApply={() => { void apply(); }} /></div>
            : <aside className="creative-detail creative-empty">{detailError ? <><h4>详情暂不可用</h4><p role="alert">{detailError}</p><button onClick={() => setRetry(value => value + 1)}>重新加载</button></> : <><PictureOutlined /><p>选择一项资源，查看完整预览</p></>}</aside>}
      </div>}
    </div>
    {previewImage ? <CreativeImageLightbox key={previewImage.url} image={previewImage} onClose={() => setPreviewImage(null)} /> : null}
  </div>, document.body);
}
