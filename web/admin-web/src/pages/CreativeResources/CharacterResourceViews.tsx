import { Check, ImagePlus, Maximize2, Trash2 } from 'lucide-react';
import type { CreativeResourceGalleryItem } from '../../api/creativeResource';
import CreativeResourceCover from './CreativeResourceCover';
import { characterResourceViews, type CharacterViewLabel } from './characterReferenceSet';
import { creativeResourceLimits } from './creativeResourceForm';
import './character-resource-views.css';

interface CharacterResourceViewsProps {
  gallery: CreativeResourceGalleryItem[];
  name: string;
  editing?: boolean;
  disabled?: boolean;
  onChange?: (label: CharacterViewLabel, url: string) => void;
  onUpload?: (label: CharacterViewLabel, file?: File) => void;
  onPreview?: () => void;
}

export default function CharacterResourceViews({ gallery, name, editing = false, disabled = false, onChange, onUpload, onPreview }: CharacterResourceViewsProps) {
  const views = characterResourceViews(gallery);
  return <section className={`creative-character-set ${editing ? 'is-editing' : 'is-preview'}`} aria-label="角色四图套装">
    <header className="creative-character-set-header"><div><span className="creative-eyebrow">CHARACTER REFERENCE SET</span><h3>一套角色，四种视角 <span>角色套图 {views.count}/4</span></h3><p>{editing ? '分别维护四张图片。封面缩略图独立设置，混合设定板保留在额外参考中。' : '每张参考独立展示，完整保留画面；缺少的视图不会用封面或其他图片代替。'}</p></div>{onPreview ? <button type="button" className="toolbar-btn" disabled={disabled} onClick={onPreview}><Maximize2 size={15} />预览整套角色</button> : null}</header>
    <div className="creative-character-view-grid">{views.slots.map((slot, index) => <article className="creative-character-view" key={slot.label} data-character-view={slot.label}>
      <div className="creative-character-view-title"><span>{String(index + 1).padStart(2, '0')}</span><div><h4>{slot.label}</h4><small>{slot.english}</small></div>{slot.url ? <Check size={14} aria-label="已添加" /> : <em>待补充</em>}</div>
      <CreativeResourceCover url={slot.url} name={`${name || '角色'} · ${slot.label}`} emptyLabel={`待添加${slot.label}`} unavailableLabel="图片暂不可用，请检查地址" />
      <p>{slot.description}</p>
      {slot.sourceLabel && slot.sourceLabel.trim() !== slot.label ? <small className="creative-character-legacy-note">兼容旧名称：{slot.sourceLabel}</small> : null}
      {editing ? <div className="creative-character-view-controls"><label>{slot.label}地址<input aria-label={`${slot.label}地址`} disabled={disabled} maxLength={creativeResourceLimits.url} value={slot.url} onChange={event => onChange?.(slot.label, event.target.value)} placeholder="粘贴图片 URL 或上传" /></label><div><label className="creative-character-upload"><ImagePlus size={14} />{slot.url ? '替换图片' : '上传图片'}<input aria-label={`上传${slot.label}`} disabled={disabled} type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={event => { onUpload?.(slot.label, event.target.files?.[0]); event.target.value = ''; }} /></label><button type="button" aria-label={`移除${slot.label}`} disabled={disabled || !slot.url} onClick={() => onChange?.(slot.label, '')}><Trash2 size={14} />移除</button></div></div> : null}
    </article>)}</div>
    {views.missing.length ? <p className="creative-character-completeness" role="status">还缺少：{views.missing.join('、')}。{editing ? '可先保存草稿；发布不会强制拦截，但建议补齐整套参考。' : '当前目录尚未提供这些独立图片。'}</p> : <p className="creative-character-completeness is-complete"><Check size={14} />四个视图均已配置，请检查图片内容与人物一致性。</p>}
    {views.repeatedImage ? <p className="creative-character-completeness">部分槽位使用了相同图片地址，请确认是否提供了不同视角；系统不会自动补图。</p> : null}
  </section>;
}
