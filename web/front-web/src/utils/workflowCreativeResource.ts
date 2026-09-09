import type { CreativeResource, CreativeResourceImage } from '../types/creativeResource';
import { createWorkflowNodeData, type WorkflowNode, type WorkflowNodeData } from '../types/workflow';

/** Imported resources must outlive a browser session and remain usable by the runner. */
export function workflowResourceImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const url = value.trim();
  if (!url || url.length > 2048 || /[\s\\\u0000-\u001f\u007f-\u009f]/.test(url)) return undefined;
  if (url.startsWith('/') && !url.startsWith('//')) return url;
  if (!/^https?:\/\//i.test(url)) return undefined;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'https:' || parsed.protocol === 'http:') && parsed.hostname
      && !parsed.username && !parsed.password && !/^https?:\/\/[^/?#]*@/i.test(url) ? url : undefined;
  } catch { return undefined; }
}

/** Default canvas views exclude the old composite board, which remains in the library for preview. */
export function characterResourceImages(resource: Pick<CreativeResource, 'gallery' | 'coverUrl'>): CreativeResourceImage[] {
  const gallery = Array.isArray(resource.gallery) ? resource.gallery : [];
  const source = gallery.length ? gallery : [{ label: '角色参考', url: resource.coverUrl }];
  const seen = new Set<string>();
  const images: CreativeResourceImage[] = [];
  for (const item of source) {
    if (item?.label?.trim().startsWith('旧综合设定板')) continue;
    const url = workflowResourceImageUrl(item?.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    images.push({ label: item.label?.trim() || `参考图 ${images.length + 1}`, url });
  }
  return images;
}

export function creativeResourceNodeData(resource: CreativeResource, image?: CreativeResourceImage, bundleId?: string): WorkflowNodeData {
  const isCharacterImage = resource.type === 'character' && image;
  return {
    ...createWorkflowNodeData(resource.type),
    title: isCharacterImage ? `${resource.name} · ${image.label}` : resource.name,
    description: resource.description, creativeResourceId: resource.id,
    type: resource.type, resourceId: resource.id, resourceName: resource.name,
    resourceMeta: resource.category, resourcePrompt: resource.prompt,
    resourceNegativePrompt: resource.negativePrompt,
    resourceConfig: structuredClone(resource.config || {}),
    resourceGallery: isCharacterImage ? [{ ...image }] : (resource.gallery || []).map(item => ({ ...item })),
    // A single-view node never hides another image behind the shared resource cover.
    resourceCoverUrl: isCharacterImage ? image.url : resource.coverUrl,
    resourcePreviewVideoUrl: isCharacterImage ? undefined : resource.previewVideoUrl,
    resourceViewLabel: isCharacterImage ? image.label : undefined,
    resourceBundleId: isCharacterImage ? bundleId : undefined,
    // Effect thumbnails illustrate a template; they are never input frames.
    assetUrl: resource.type === 'effect' ? undefined : isCharacterImage ? image.url : resource.coverUrl,
  };
}

/** Remove only references to deleted nodes, keeping positional labels and marks aligned. */
export function withoutDeletedNodeReferences(nodes: WorkflowNode[], deletedIds: ReadonlySet<string>): WorkflowNode[] {
  if (!deletedIds.size) return nodes;
  const titles = new Map(nodes.map(node => [node.id, node.data.title]));
  return nodes.map(node => {
    const references = node.data.referenceNodeIds;
    const marks = node.data.referenceMarks;
    const changedReferences = references?.some(id => deletedIds.has(id));
    const changedMarks = marks?.some(mark => deletedIds.has(mark.nodeId));
    if (!changedReferences && !changedMarks) return node;
    const data = { ...node.data };
    if (changedReferences) {
      const kept = references!.flatMap((id, index) => deletedIds.has(id) ? [] : [{ id, label: node.data.referenceLabels?.[index] || titles.get(id) || '画布资源' }]);
      data.referenceNodeIds = kept.map(item => item.id);
      data.referenceLabels = kept.map(item => item.label);
    }
    if (changedMarks) data.referenceMarks = marks!.filter(mark => !deletedIds.has(mark.nodeId));
    return { ...node, data };
  });
}
