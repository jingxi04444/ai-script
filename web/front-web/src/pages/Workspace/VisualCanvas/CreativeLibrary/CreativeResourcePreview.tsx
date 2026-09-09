import { useState } from 'react';
import { ArrowRightOutlined, CheckOutlined, HeartFilled, HeartOutlined, PictureOutlined } from '@ant-design/icons';
import type { CreativeResource } from '../../../../types/creativeResource';
import { creativeResourceLabels } from '../../../../types/creativeResource';

interface CreativeResourcePreviewProps {
  resource: CreativeResource;
  favorite: boolean;
  applying: boolean;
  targetName?: string;
  onFavorite: () => void;
  onApply: () => void;
}

export default function CreativeResourcePreview({ resource, favorite, applying, targetName, onFavorite, onApply }: CreativeResourcePreviewProps) {
  const views = [{ label: '主视图', url: resource.coverUrl }, ...resource.gallery.filter(item => item.url !== resource.coverUrl)];
  const [viewIndex, setViewIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const view = views[viewIndex] || views[0];
  return <aside className={`creative-detail is-${resource.type}`} aria-label="资源详情">
    <div className={`creative-detail-image${viewIndex > 0 ? ' is-sheet' : ''}`}>
      {showVideo && resource.previewVideoUrl ? <video src={resource.previewVideoUrl} controls playsInline preload="metadata" poster={resource.coverUrl} />
        : imageFailed ? <div className="creative-image-unavailable"><PictureOutlined /><span>预览图暂不可用</span></div>
          : <img src={view.url} alt={`${resource.name} · ${view.label}`} onError={() => setImageFailed(true)} />}
      <span className="creative-detail-kicker">{creativeResourceLabels[resource.type]} / {resource.code}</span>
      <button type="button" className={`creative-detail-heart${favorite ? ' is-saved' : ''}`} aria-label={favorite ? '取消本机收藏' : '收藏到本机'} aria-pressed={favorite} onClick={onFavorite}>{favorite ? <HeartFilled /> : <HeartOutlined />}</button>
    </div>
    {(views.length > 1 || resource.previewVideoUrl) ? <div className="creative-view-tabs" aria-label="资源预览视图">
      {views.map((item, index) => <button key={`${item.url}-${index}`} type="button" aria-pressed={!showVideo && viewIndex === index} onClick={() => { setViewIndex(index); setShowVideo(false); setImageFailed(false); }}>{item.label}</button>)}
      {resource.previewVideoUrl ? <button type="button" aria-pressed={showVideo} onClick={() => setShowVideo(true)}>动态预览</button> : null}
    </div> : null}
    <div className="creative-detail-copy">
      <div className="creative-detail-heading"><span>{resource.category || '精选资源'}</span><h3>{resource.name}</h3></div>
      <p>{resource.description}</p>
      <div className="creative-tags">{resource.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
      <div className="creative-detail-included"><CheckOutlined /><span>{resource.type === 'character' ? '人物形象与多视图参考' : resource.type === 'style' ? '视觉参考与风格描述' : '运镜 / 特效提示词模板'}<small>{resource.type === 'effect' && !resource.previewVideoUrl ? '当前为静态示意图，动态效果需在下游生成' : '应用后可连接图片、视频节点'}</small></span></div>
      {resource.type !== 'character' ? <details className="creative-template-details"><summary>查看模板说明</summary>
        <p>{resource.prompt || '该资源暂未提供模板说明。'}</p>
        {resource.negativePrompt ? <p><strong>避免出现</strong>{resource.negativePrompt}</p> : null}
        <small>适用于图片 / 视频创作。此资源为描述模板，不会加载 LoRA 或其他模型权重。</small>
      </details> : null}
      {resource.licenseNote ? <p className="creative-license">{resource.licenseNote}</p> : null}
      {resource.author ? <small className="creative-author">资源提供 · {resource.author}</small> : null}
    </div>
    <footer className="creative-detail-footer">
      <button type="button" className="creative-apply" aria-label={applying ? '正在应用' : targetName ? '应用并连接' : '应用到画布'} disabled={applying} onClick={onApply}>{applying ? '正在应用…' : targetName ? '应用并连接' : '应用到画布'}<ArrowRightOutlined aria-hidden /></button>
      <span>{targetName ? `将连接至「${targetName}」` : '作为独立资源节点添加，可随时替换'}</span>
    </footer>
  </aside>;
}
