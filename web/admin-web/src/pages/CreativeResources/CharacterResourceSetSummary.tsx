import { ChevronRight } from 'lucide-react';
import type { CreativeResourceGalleryItem } from '../../api/creativeResource';
import { characterResourceViews } from './characterReferenceSet';
import CreativeResourceCover from './CreativeResourceCover';
import './character-resource-views.css';

interface CharacterResourceSetSummaryProps { gallery: CreativeResourceGalleryItem[]; name: string; disabled?: boolean; onPreview: () => void }

export default function CharacterResourceSetSummary({ gallery, name, disabled, onPreview }: CharacterResourceSetSummaryProps) {
  const views = characterResourceViews(gallery);
  return <button type="button" className="creative-character-set-summary" disabled={disabled} aria-label={`预览整套角色：${name}`} onClick={onPreview}>
    <span><strong>角色套图 {views.count}/4</strong><small>查看整套 <ChevronRight size={12} /></small></span>
    <span className="creative-character-summary-images">{views.slots.map(slot => <span key={slot.label}><CreativeResourceCover url={slot.url} name={`${name} · ${slot.label}`} emptyLabel="待补充" unavailableLabel="不可用" /><small>{slot.label}</small></span>)}</span>
  </button>;
}
