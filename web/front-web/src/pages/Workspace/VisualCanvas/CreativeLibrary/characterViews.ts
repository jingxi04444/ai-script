import type { CreativeResourceImage } from '../../../../types/creativeResource';

export const characterViewDefinitions = [
  { key: 'fullBody', label: '全身图', shape: 'portrait' },
  { key: 'portrait', label: '面部特写', shape: 'portrait' },
  { key: 'expressions', label: '表情九宫格', shape: 'square' },
  { key: 'turnaround', label: '多角度设定图', shape: 'landscape' },
] as const;

const portraitAliases = new Set(['独立肖像', '独立肖像参考', '肖像特写', '肖像']);

export function resolveCharacterViews(gallery: CreativeResourceImage[]) {
  const views = characterViewDefinitions.map(definition => {
    const exact = gallery.find(image => image.label.trim() === definition.label && image.url.trim());
    const portrait = definition.key === 'portrait' ? gallery.find(image => portraitAliases.has(image.label.trim()) && image.url.trim()) : undefined;
    return { ...definition, image: exact || portrait };
  });
  const displayedUrls = new Set(views.flatMap(view => view.image ? [view.image.url] : []));
  return { views, extras: gallery.filter(image => image.url.trim() && !displayedUrls.has(image.url)),
    missing: views.filter(view => !view.image).map(view => view.label) };
}
