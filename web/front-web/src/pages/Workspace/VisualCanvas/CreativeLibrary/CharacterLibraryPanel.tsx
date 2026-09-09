import { useRef, useState, type RefObject } from 'react';
import { ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined, HeartFilled, HeartOutlined, HistoryOutlined, LoadingOutlined, PictureOutlined, PlusOutlined, SearchOutlined, ZoomInOutlined } from '@ant-design/icons';
import type { CreativeResource, CreativeResourceImage } from '../../../../types/creativeResource';
import { resolveCharacterViews } from './characterViews';
import { characterResourceImages } from '../../../../utils/workflowCreativeResource';
import './character-library-panel.css';

interface CharacterLibraryPanelProps {
  detail: CreativeResource | null;
  items: CreativeResource[];
  selectedId: string | null;
  loading: boolean;
  detailLoading: boolean;
  error: string;
  detailError: string;
  warning: string;
  categories: string[];
  category: string;
  keyword: string;
  scope: 'all' | 'favorites' | 'recent';
  favorites: string[];
  total: number;
  page: number;
  pages: number;
  applying: boolean;
  targetName?: string;
  replacing?: boolean;
  replacementViewLabel?: string;
  isDemo: boolean;
  searchRef: RefObject<HTMLInputElement>;
  onCategoryChange: (category: string) => void;
  onKeywordChange: (keyword: string) => void;
  onScopeChange: (scope: 'all' | 'favorites' | 'recent') => void;
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onPreviewImage: (image: CreativeResourceImage) => void;
  onApply: () => void;
  onRetry: () => void;
  onPageChange: (page: number) => void;
}

export default function CharacterLibraryPanel(props: CharacterLibraryPanelProps) {
  const { detail, items, loading, detailLoading, error, detailError, categories, category, keyword, scope, favorites, applying, targetName } = props;
  const [failedUrls, setFailedUrls] = useState<Set<string>>(() => new Set());
  const railRef = useRef<HTMLDivElement>(null);
  const resolved = detail ? resolveCharacterViews(detail.gallery) : null;
  const imageCount = detail ? characterResourceImages(detail).length : 0;
  const applyLabel = props.replacementViewLabel ? '替换当前图片' : props.replacing ? '应用整套角色' : targetName ? '应用并连接' : '应用到画布';
  const shiftRail = (direction: number) => railRef.current?.scrollBy({ left: direction * 360, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const emptyLabel = scope === 'favorites' ? '还没有匹配的收藏' : scope === 'recent' ? '还没有使用记录' : '没有找到匹配的角色';

  return <div className="character-library-body">
    <section className="character-set-panel" aria-label="角色完整设定">
      {loading || detailLoading ? <div className="character-set-state" role="status"><LoadingOutlined spin /><span>正在加载角色设定图…</span></div>
        : error || (!detail && detailError) ? <div className="character-set-state" role="alert"><PictureOutlined /><h3>{error ? '资源库暂不可用' : '详情暂不可用'}</h3><p>{error || detailError}</p><button type="button" onClick={props.onRetry}>重新加载</button></div>
          : detail && resolved ? <>
            <div className="character-set-content">
            <header className="character-set-heading"><h3>{detail.name}</h3><span className="character-category-chip">{detail.category}</span><div className="character-set-tags">{detail.tags.map(tag => <span key={tag}>{tag}</span>)}</div><button type="button" className="character-set-favorite" aria-label={favorites.includes(detail.id) ? '取消本机收藏' : '收藏到本机'} aria-pressed={favorites.includes(detail.id)} onClick={() => props.onFavorite(detail.id)}>{favorites.includes(detail.id) ? <HeartFilled /> : <HeartOutlined />}</button></header>
            <div className="character-set-views" aria-label="角色四图设定">
              {resolved.views.map(view => <figure className={`character-set-view is-${view.shape}${!view.image ? ' is-missing' : ''}`} key={view.key}>
                {view.image && !failedUrls.has(view.image.url) ? <button type="button" aria-label={`放大${view.label}：${detail.name}`} onClick={() => props.onPreviewImage({ label: `${detail.name} · ${view.label}`, url: view.image!.url })}>
                  <img src={view.image.url} alt={`${detail.name} · ${view.label}`} onError={() => setFailedUrls(current => new Set(current).add(view.image!.url))} />
                  <span className="character-view-zoom"><ZoomInOutlined aria-hidden />放大查看</span>
                </button> : <div className="character-view-missing"><PictureOutlined aria-hidden /><strong>{view.image ? `${view.label}加载失败` : `暂缺${view.label}`}</strong><span>{view.image ? '请稍后重试或检查图片地址' : '可在后台补充这张设定图'}</span>{view.image ? <button type="button" onClick={() => setFailedUrls(current => new Set([...current].filter(url => url !== view.image!.url)))}>重试图片</button> : null}</div>}
                <figcaption>{view.label}</figcaption>
              </figure>)}
            </div>
            {resolved.extras.length ? <div className="character-set-extras"><span>其它已有设定图</span>{resolved.extras.map((image, index) => <button type="button" key={`${image.url}-${index}`} onClick={() => props.onPreviewImage({ ...image, label: `${detail.name} · ${image.label}` })}>{image.label}<ZoomInOutlined aria-hidden /></button>)}</div> : null}
            <details className="character-set-info"><summary>角色说明与授权</summary><p>{detail.description}</p>{resolved.missing.length ? <p className="character-set-missing-note" role="status">此角色尚缺 {resolved.missing.join('、')}；现有图片仍可作为一套资源应用。</p> : null}{detail.licenseNote ? <p>{detail.licenseNote}{detail.author ? ` · ${detail.author}` : ''}</p> : null}</details>
            {detailError ? <div className="creative-inline-warning" role="alert">{detailError}<button onClick={props.onRetry}>重试</button></div> : null}
            </div>
            <footer className="character-set-footer"><div><p>{props.replacementViewLabel ? `仅替换当前「${props.replacementViewLabel}」，其它图片保持不变` : `${imageCount} 张图片分别添加到画布，可独立移动、引用和删除`}</p>{targetName ? <small title={targetName}>连接至「{targetName}」</small> : null}</div><button type="button" className="character-apply" aria-label={applying ? '正在应用' : applyLabel} disabled={applying || !imageCount} onClick={props.onApply}>{applying ? <LoadingOutlined spin /> : <PlusOutlined aria-hidden />}{applying ? '正在应用…' : applyLabel}</button></footer>
          </> : <div className="character-set-state"><PictureOutlined /><h3>{emptyLabel}</h3><p>调整搜索或筛选，选择角色查看完整设定。</p></div>}
    </section>

    <section className="character-library-browser" aria-label="选择角色">
      <div className="character-library-filters"><label className="character-category-filter"><span>角色筛选</span><select aria-label="角色分类筛选" value={category} onChange={event => props.onCategoryChange(event.target.value)}><option value="">全部分类</option>{categories.map(item => <option key={item}>{item}</option>)}</select></label><label className="character-search"><SearchOutlined aria-hidden /><input ref={props.searchRef} aria-label="搜索创意资源" placeholder="搜索角色、标签…" value={keyword} onChange={event => props.onKeywordChange(event.target.value)} /></label><div className="character-collection-tabs" aria-label="角色收藏与使用记录"><button type="button" aria-pressed={scope === 'all'} onClick={() => props.onScopeChange('all')}>全部角色</button><button type="button" aria-label="我的收藏（本机）" aria-pressed={scope === 'favorites'} onClick={() => props.onScopeChange('favorites')}><HeartOutlined aria-hidden />收藏<small>本机</small></button><button type="button" aria-label="最近使用（本机）" aria-pressed={scope === 'recent'} onClick={() => props.onScopeChange('recent')}><HistoryOutlined aria-hidden />最近使用<small>本机</small></button></div></div>
      {props.warning ? <div className="creative-inline-warning" role="status">{props.warning}</div> : null}
      <div className="character-thumbnail-browser"><button className="character-rail-arrow" type="button" aria-label="向前浏览角色" disabled={items.length < 3} onClick={() => shiftRail(-1)}><ArrowLeftOutlined /></button><div className="character-thumbnail-rail" ref={railRef} aria-label="角色资源列表">
        {items.map(item => <div className={`character-thumbnail${props.selectedId === item.id ? ' is-selected' : ''}`} key={item.id}><button type="button" className="character-thumbnail-select" aria-label={`查看角色：${item.name}`} aria-pressed={props.selectedId === item.id} onClick={() => props.onSelect(item.id)}><span><img src={item.coverUrl} alt={item.name} loading="lazy" />{props.selectedId === item.id ? <i><CheckOutlined aria-hidden /></i> : null}</span><strong>{item.name}</strong></button><button type="button" className="character-thumbnail-favorite" aria-label={`${favorites.includes(item.id) ? '取消收藏' : '收藏'}：${item.name}`} onClick={() => props.onFavorite(item.id)}>{favorites.includes(item.id) ? <HeartFilled /> : <HeartOutlined />}</button></div>)}
        {!loading && !items.length ? <div className="character-rail-empty"><span>{emptyLabel}</span><button type="button" onClick={() => { props.onScopeChange('all'); props.onKeywordChange(''); props.onCategoryChange(''); }}>浏览全部资源</button></div> : null}
      </div><button className="character-rail-arrow" type="button" aria-label="向后浏览角色" disabled={items.length < 3} onClick={() => shiftRail(1)}><ArrowRightOutlined /></button></div>
      <div className="character-browser-meta"><span>{props.total} 个角色{props.isDemo ? ' · 本地演示目录' : ' · 已发布资源'}</span><span>收藏与最近使用仅保存在当前账户的本机浏览器</span>{props.pages > 1 ? <div><button aria-label="上一页资源" disabled={props.page <= 1} onClick={() => props.onPageChange(props.page - 1)}><ArrowLeftOutlined /></button><span>{props.page} / {props.pages}</span><button aria-label="下一页资源" disabled={props.page >= props.pages} onClick={() => props.onPageChange(props.page + 1)}><ArrowRightOutlined /></button></div> : null}</div>
    </section>
  </div>;
}
