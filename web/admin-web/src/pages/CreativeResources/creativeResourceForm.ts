import type { CreativeResource, CreativeResourceSaveParams, CreativeResourceType } from '../../api/creativeResource';

export interface CreativeResourceForm extends Omit<CreativeResourceSaveParams, 'config' | 'tags'> {
  configText: string;
  tagsText: string;
}

export const creativeTypeLabels: Record<CreativeResourceType, string> = {
  character: '角色', style: '风格', effect: '特效',
};

export const creativeTypeDescriptions: Record<CreativeResourceType, string> = {
  character: '管理人物形象、参考视图与角色一致性提示词。',
  style: '整理画面美学、色彩与光线，让创作风格可复用。',
  effect: '维护镜头运动与视觉效果，清晰展示每一种创作效果。',
};

const createCode = (type: CreativeResourceType) => `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

// Shared by form controls and payload checks; mirrors CreativeResourceServiceImpl.
export const creativeResourceLimits = {
  code: 80, name: 120, category: 80, description: 2000, url: 2048, galleryLabel: 80,
  tags: 20, tag: 40, prompt: 12000, negativePrompt: 4000, licenseNote: 2000,
  author: 120, sortOrder: 100000, configBytes: 16000, configDepth: 8,
} as const;

// Java String.trim() strips ASCII control/space at the ends, not all Unicode whitespace.
const trimText = (value: string) => value.replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, '');
function checkedText(value: string, label: string, max: number, required = false): string {
  const result = trimText(value);
  if (required && !result) throw new Error(`请填写${label}`);
  if (result.length > max) throw new Error(`${label}不能超过 ${max} 字`);
  if (result.includes('\0')) throw new Error(`${label}包含无效字符，请移除后重试`);
  return result;
}

export function createCreativeResourceForm(type: CreativeResourceType, resource?: CreativeResource, duplicate = false): CreativeResourceForm {
  if (resource) {
    return {
      code: duplicate ? createCode(resource.type) : resource.code,
      type: resource.type, name: duplicate ? `${resource.name.slice(0, creativeResourceLimits.name - 3)} 副本` : resource.name,
      category: resource.category || '', description: resource.description || '',
      coverUrl: resource.coverUrl || '', previewVideoUrl: resource.previewVideoUrl || '',
      gallery: (resource.gallery || []).map(item => ({ ...item })),
      tagsText: (resource.tags || []).join('，'), prompt: resource.prompt || '', negativePrompt: resource.negativePrompt || '',
      configText: JSON.stringify(resource.config || {}, null, 2),
      status: duplicate ? 'draft' : resource.status, sortOrder: resource.sortOrder || 0,
      licenseNote: resource.licenseNote || '', author: resource.author || '',
    };
  }
  return { code: createCode(type), type, name: '', category: '', description: '', coverUrl: '', previewVideoUrl: '', gallery: [], tagsText: '', prompt: '', negativePrompt: '', configText: '{}', status: 'draft', sortOrder: 10, licenseNote: '', author: '' };
}

/** Only uploaded site paths and HTTP(S) URLs can be previewed or persisted as media. */
export function isCreativeMediaUrl(value: string): boolean {
  if (!value || value.length > creativeResourceLimits.url || value.includes('\\') || /[\u0000-\u0020\u007f-\u009f<>"{}|^`]/.test(value) || /%(?![\da-f]{2})/i.test(value)) return false;
  if (value.startsWith('/') && !value.startsWith('//')) return !/[\[\]]/.test(value.split(/[?#]/, 1)[0]);
  // URL() alone normalizes malformed schemes, userinfo and international hosts
  // that java.net.URI rejects. Check the original authority before previewing it.
  const match = /^https?:\/\/([^/?#]+)([^?#]*)/i.exec(value);
  if (!match || /[@%\u0080-\uffff]/.test(match[1]) || /[\[\]]/.test(match[2])) return false;
  const authority = match[1];
  if (!authority.startsWith('[')) {
    const hostname = authority.replace(/:\d*$/, '').replace(/\.$/, '');
    if (!hostname.split('.').every(label => /^[a-z\d](?:[a-z\d-]*[a-z\d])?$/i.test(label))) return false;
  }
  try { const url = new URL(value); return (url.protocol === 'https:' || url.protocol === 'http:') && Boolean(url.hostname) && !url.username && !url.password; }
  catch { return false; }
}

function checkedMediaUrl(value: string, label: string): string {
  const result = checkedText(value, label, creativeResourceLimits.url);
  if (result && !isCreativeMediaUrl(result)) throw new Error(`${label}须为不含账号密码的 HTTP(S) URL 或站内绝对路径`);
  return result;
}

function validateConfig(value: unknown, depth = 0): void {
  if (depth > creativeResourceLimits.configDepth) throw new Error('高级配置的嵌套不能超过 8 层（包括末级值）');
  if (Array.isArray(value)) {
    if (value.length > 100) throw new Error('高级配置中每个数组最多 100 项');
    value.forEach(item => validateConfig(item, depth + 1));
  } else if (value && typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length > 100) throw new Error('高级配置中每个对象最多 100 个字段');
    for (const [key, item] of entries) {
      // Character.isWhitespace, as used by Java String.isBlank (NBSP is not whitespace).
      if (!key || /^[\u0009-\u000d\u001c-\u0020\u1680\u2000-\u2006\u2008-\u200a\u2028\u2029\u205f\u3000]+$/.test(key) || key.length > 80 || ['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('高级配置字段名须为 1–80 字，不能留空或使用 __proto__、prototype、constructor');
      validateConfig(item, depth + 1);
    }
  } else if (typeof value === 'string') {
    checkedText(value, '高级配置中的文本', 4000);
  } else if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('高级配置中的数值必须是有限数');
}

/** Bundled examples also live under the admin app's public base; keep stored URLs canonical. */
export function creativeMediaPreviewUrl(value: string, baseUrl: string): string {
  return value.startsWith('/creative-library/') ? `${baseUrl.replace(/\/$/, '')}${value}` : value;
}

export function creativeResourcePayload(form: CreativeResourceForm): CreativeResourceSaveParams {
  const code = checkedText(form.code, '资源编码', creativeResourceLimits.code, true);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(code)) throw new Error('资源编码仅支持小写字母、数字及单个连字符，不能以连字符开头或结尾');
  if (!['character', 'style', 'effect'].includes(form.type)) throw new Error('请选择有效的资源类型');
  if (!['draft', 'published'].includes(form.status)) throw new Error('请选择有效的发布状态');
  const name = checkedText(form.name, '资源名称', creativeResourceLimits.name, true);
  const category = checkedText(form.category, '分类', creativeResourceLimits.category, true);
  const description = checkedText(form.description, '简介', creativeResourceLimits.description);
  const prompt = checkedText(form.prompt, '创作提示词', creativeResourceLimits.prompt);
  const negativePrompt = checkedText(form.negativePrompt || '', '负面提示词', creativeResourceLimits.negativePrompt);
  const licenseNote = checkedText(form.licenseNote, '授权与审核说明', creativeResourceLimits.licenseNote);
  const author = checkedText(form.author, '作者或来源', creativeResourceLimits.author);
  const coverUrl = checkedMediaUrl(form.coverUrl, '封面地址');
  const previewVideoUrl = checkedMediaUrl(form.previewVideoUrl || '', '视频地址');
  if (form.gallery.length > 12) throw new Error('参考视图最多 12 张');
  const gallery = form.gallery.map((item, index) => {
    const label = checkedText(item.label, `第 ${index + 1} 个视图名称`, creativeResourceLimits.galleryLabel);
    const url = checkedMediaUrl(item.url, `第 ${index + 1} 个视图地址`);
    if (!url) throw new Error(`第 ${index + 1} 个视图需要有效图片地址`);
    return { label, url };
  });
  let config: unknown;
  try { config = JSON.parse(form.configText); } catch { throw new Error('高级配置不是有效 JSON，请检查引号与逗号'); }
  if (!config || typeof config !== 'object' || Array.isArray(config)) throw new Error('高级配置必须是 JSON 对象，不能是数组、字符串或 null');
  validateConfig(config);
  if (new TextEncoder().encode(JSON.stringify(config)).byteLength > creativeResourceLimits.configBytes) throw new Error('高级配置不能超过 16 KB（16000 字节）');
  const tags = [...new Set(form.tagsText.split(/[,，\n]/).map(tag => checkedText(tag, '标签', creativeResourceLimits.tag)).filter(Boolean))];
  if (tags.length > creativeResourceLimits.tags) throw new Error('标签最多 20 个');
  if (!Number.isInteger(form.sortOrder) || Math.abs(form.sortOrder) > creativeResourceLimits.sortOrder) throw new Error('排序值须为 -100000 到 100000 之间的整数');
  if (form.status === 'published' && (!coverUrl || !prompt || !licenseNote)) {
    throw new Error('发布前请补充封面、创作提示词和授权／审核说明');
  }
  return {
    code, type: form.type, name, category, description, coverUrl, previewVideoUrl, gallery, tags,
    prompt, negativePrompt, config: config as Record<string, unknown>,
    status: form.status, sortOrder: form.sortOrder, licenseNote, author,
  };
}

export function creativeResourceError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
}
