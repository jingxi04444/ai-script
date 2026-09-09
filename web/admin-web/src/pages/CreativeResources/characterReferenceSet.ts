import type { CreativeResourceGalleryItem } from '../../api/creativeResource';

export const characterViewDefinitions = [
  { label: '全身图', description: '完整身形与服装，保留头顶和脚部', english: 'FULL BODY' },
  { label: '面部特写', description: '清晰五官、发型与人物身份特征', english: 'FACE CLOSE-UP' },
  { label: '表情九宫格', description: '九种独立表情，统一人物与光线', english: 'EXPRESSIONS' },
  { label: '多角度设定图', description: '同一人物的正面、侧面与背面', english: 'TURNAROUND' },
] as const;
export type CharacterViewLabel = typeof characterViewDefinitions[number]['label'];

const portraitAliases = new Set(['独立肖像', '独立肖像参考', '肖像特写', '肖像']);
const matchesSlot = (label: string, slot: CharacterViewLabel) => label.trim() === slot || (slot === '面部特写' && portraitAliases.has(label.trim()));

/** Do not infer views from a cover or split a combined sheet into imaginary images. */
export function characterResourceViews(gallery: CreativeResourceGalleryItem[]) {
  const used = new Set<number>();
  const slots = characterViewDefinitions.map(definition => {
    let index = gallery.findIndex((item, itemIndex) => !used.has(itemIndex) && item.label.trim() === definition.label);
    if (index < 0 && definition.label === '面部特写') index = gallery.findIndex((item, itemIndex) => !used.has(itemIndex) && portraitAliases.has(item.label.trim()));
    if (index >= 0) used.add(index);
    const item = index >= 0 ? gallery[index] : undefined;
    return { ...definition, index, url: item?.url || '', sourceLabel: item?.label || '' };
  });
  const filled = slots.filter(slot => slot.url.trim());
  return {
    slots, count: filled.length,
    missing: slots.filter(slot => !slot.url.trim()).map(slot => slot.label),
    repeatedImage: new Set(filled.map(slot => slot.url.trim())).size < filled.length,
    extras: gallery.flatMap((item, index) => used.has(index) ? [] : [{ ...item, index }]),
  };
}

/** Stable gallery shape; empty slots are omitted so drafts remain valid API payloads. */
export function setCharacterResourceView(gallery: CreativeResourceGalleryItem[], label: CharacterViewLabel, url: string): CreativeResourceGalleryItem[] {
  const slot = characterResourceViews(gallery).slots.find(item => item.label === label)!;
  if (!url.trim()) {
    // Keep duplicate/legacy assets as extras rather than making one silently replace a removed slot.
    return gallery.flatMap((item, index) => index === slot.index ? [] : [{ ...item, label: matchesSlot(item.label, label) ? `额外参考 · ${item.label}` : item.label }]);
  }
  if (slot.index < 0) {
    if (gallery.length >= 12) throw new Error('参考图片已达 12 张，请先移除一张额外参考再添加角色套图');
    return [...gallery.map(item => ({ ...item })), { label, url }];
  }
  return gallery.map((item, index) => index === slot.index ? { label, url } : { ...item });
}
