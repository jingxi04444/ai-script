export type CreativeResourceType = 'character' | 'style' | 'effect';

export interface CreativeResourceImage { label: string; url: string }

export interface CreativeResource {
  id: string;
  code: string;
  type: CreativeResourceType;
  name: string;
  category: string;
  description: string;
  coverUrl: string;
  previewVideoUrl?: string;
  gallery: CreativeResourceImage[];
  tags: string[];
  prompt: string;
  negativePrompt: string;
  config: Record<string, unknown>;
  status: 'draft' | 'published';
  sortOrder: number;
  licenseNote: string;
  author: string;
  createTime?: string;
  updateTime?: string;
}

export interface CreativeResourceQuery {
  page: number;
  pageSize: number;
  keyword?: string;
  type: CreativeResourceType;
  category?: string;
}

export interface CreativeResourcePage {
  list: CreativeResource[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export const creativeResourceLabels: Record<CreativeResourceType, string> = {
  character: '角色', style: '风格', effect: '特效',
};

export const isCreativeResourceType = (kind: string): kind is CreativeResourceType =>
  kind === 'character' || kind === 'style' || kind === 'effect';

export const isLegacyUploadedCharacterResource = (data: {
  kind: string; assetUrl?: string; creativeResourceId?: string; resourcePrompt?: string;
}): boolean => {
  if (data.kind !== 'character' || data.creativeResourceId || data.resourcePrompt) return false;
  const url = data.assetUrl?.trim();
  if (!url || url.length > 2048 || /[\s\\\u0000-\u001f]/.test(url)) return false;
  if (url.startsWith('/') && !url.startsWith('//')) return true;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:')
      && Boolean(parsed.hostname) && !parsed.username && !parsed.password;
  } catch { return false; }
};
