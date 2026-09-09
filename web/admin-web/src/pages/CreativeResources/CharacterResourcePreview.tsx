import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Edit3, X } from 'lucide-react';
import type { CreativeResourceGalleryItem } from '../../api/creativeResource';
import CharacterResourceViews from './CharacterResourceViews';
import { characterResourceViews } from './characterReferenceSet';
import CreativeResourceCover from './CreativeResourceCover';
import './character-resource-views.css';

interface CharacterResourcePreviewProps { name: string; gallery: CreativeResourceGalleryItem[]; onClose: () => void; onEdit?: () => void }

export default function CharacterResourcePreview({ name, gallery, onClose, onEdit }: CharacterResourcePreviewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose); closeRef.current = onClose;
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; ref.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); closeRef.current(); return; }
      if (event.key !== 'Tab') return;
      const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
      const first = buttons[0]; const last = buttons[buttons.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keydown, true);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keydown, true); previousFocus?.focus(); };
  }, []);
  const extras = characterResourceViews(gallery).extras;
  return createPortal(<div className="creative-character-preview-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="creative-character-preview-dialog" ref={ref} role="dialog" aria-modal="true" aria-labelledby="creative-character-preview-title" tabIndex={-1}>
      <header><div><span className="creative-eyebrow">CHARACTER / FOUR VIEWS</span><h2 id="creative-character-preview-title">{name || '未命名角色'} · 整套角色预览</h2></div><button type="button" aria-label="关闭整套角色预览" onClick={onClose}><X size={20} /></button></header>
      <div className="creative-character-preview-body"><CharacterResourceViews gallery={gallery} name={name} />{extras.length ? <details className="creative-character-extra-preview"><summary>额外参考 · {extras.length} 张（不计入四图套装）</summary><div>{extras.map(item => <figure key={item.index}><CreativeResourceCover url={item.url} name={item.label || '额外参考'} emptyLabel="未提供图片" unavailableLabel="图片暂不可用" /><figcaption>{item.label || '未命名参考'}</figcaption></figure>)}</div></details> : null}</div>
      <footer><span>仅预览已保存或当前编辑中的图片，不自动生成新图片。</span>{onEdit ? <button type="button" className="toolbar-btn primary" onClick={onEdit}><Edit3 size={15} />编辑这套角色</button> : <button type="button" className="toolbar-btn" onClick={onClose}>返回编辑</button>}</footer>
    </div>
  </div>, document.body);
}
