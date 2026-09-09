import { create } from 'zustand';
import type { CreativeResource, CreativeResourceType } from '../types/creativeResource';
import { isCreativeResourceType } from '../types/creativeResource';
import { characterResourceImages, creativeResourceNodeData, withoutDeletedNodeReferences } from '../utils/workflowCreativeResource';
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from '@xyflow/react';
import {
  createWorkflowNodeData,
  type WorkflowDocument,
  type WorkflowEdge,
  type WorkflowMode,
  type WorkflowNode,
  type WorkflowNodeData,
  type WorkflowNodeKind,
} from '../types/workflow';

interface WorkflowSnapshot {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface WorkflowState {
  projectKey: string | null;
  mode: WorkflowMode;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  past: WorkflowSnapshot[];
  future: WorkflowSnapshot[];
  pendingRunNodeId: string | null;
  activeDirectorNodeId: string | null;
  creativeLibraryRequest: { type: CreativeResourceType; projectKey: string | null; nodeId?: string; targetNodeId?: string; position?: XYPosition } | null;
  openCreativeLibrary: (type: CreativeResourceType, options?: { nodeId?: string; targetNodeId?: string; position?: XYPosition }) => void;
  closeCreativeLibrary: () => void;
  openDirector: (nodeId: string) => void;
  closeDirector: () => void;
  load: (projectId: string | null, mode: WorkflowMode) => void;
  persist: () => void;
  checkpoint: () => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  connect: (connection: Connection) => void;
  addNode: (kind: WorkflowNodeKind, position?: XYPosition) => string;
  applyCreativeResource: (resource: CreativeResource, options?: { nodeId?: string; targetNodeId?: string; position?: XYPosition }) => string;
  deleteSelection: () => void;
  duplicateSelection: () => void;
  selectAll: () => void;
  clearSelection: () => void;
  clearCanvas: () => void;
  undo: () => void;
  redo: () => void;
  updateNodeData: (nodeId: string, patch: Partial<WorkflowNodeData>) => void;
  requestRun: (nodeId: string) => void;
  consumeRunRequest: () => void;
  createAgentDraft: (prompt: string) => void;
  createVideoProductionDraft: () => void;
}

const STORAGE_PREFIX = 'ai-script:visual-workflow:v5:';
const HISTORY_LIMIT = 40;
const DEMO_PRODUCT_IMAGE = '/demo-media/skincare-product.jpg';
const DEMO_LIFESTYLE_IMAGE = '/demo-media/skincare-lifestyle.jpg';
const DEMO_VIDEO = '/demo-media/skincare-demo.mp4';
const DEMO_IMAGE_PROMPT = '把精华产品自然融入晨间浴室护肤场景，真实肤质，柔和窗光，保持瓶身结构与材质一致。';
const DEMO_VIDEO_PROMPT = '模特在晨光浴室中自然涂抹精华，镜头缓慢推进，产品始终清晰，动作真实克制。';

const cloneSnapshot = (nodes: WorkflowNode[], edges: WorkflowEdge[]): WorkflowSnapshot => ({
  nodes: nodes.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
  edges: edges.map((edge) => ({ ...edge })),
});

const makeNode = (kind: WorkflowNodeKind, position: XYPosition, id?: string): WorkflowNode => ({
  id: id || `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type: 'workflow',
  position,
  data: createWorkflowNodeData(kind),
});

const withTitle = (node: WorkflowNode, title: string, patch: Partial<WorkflowNodeData> = {}): WorkflowNode => ({
  ...node,
  data: { ...node.data, title, ...patch },
});

const hydrateDemoMedia = (nodes: WorkflowNode[]): WorkflowNode[] => nodes.map((node) => {
  if (node.id === 'production-product') {
    return { ...node, data: { ...node.data, assetUrl: node.data.assetUrl || DEMO_PRODUCT_IMAGE } };
  }
  if (node.id === 'production-scene') {
    return { ...node, data: { ...node.data, assetUrl: node.data.assetUrl || DEMO_LIFESTYLE_IMAGE } };
  }
  if (node.id === 'production-scene-images') {
    const previousAsset = node.data.assetUrl;
    return {
      ...node,
      data: {
        ...node.data,
        assetUrl: !previousAsset || previousAsset === '/mock/skincare-reference-board.png' ? DEMO_PRODUCT_IMAGE : previousAsset,
        outputUrl: node.data.outputUrl || DEMO_LIFESTYLE_IMAGE,
        prompt: node.data.prompt || DEMO_IMAGE_PROMPT,
      },
    };
  }
  if (node.id === 'production-selling-video') {
    return {
      ...node,
      data: {
        ...node.data,
        assetUrl: node.data.assetUrl || DEMO_LIFESTYLE_IMAGE,
        outputUrl: node.data.outputUrl || DEMO_VIDEO,
        prompt: node.data.prompt || DEMO_VIDEO_PROMPT,
      },
    };
  }
  return node;
});

const createVideoProductionGraph = (): WorkflowSnapshot => {
  const nodes: WorkflowNode[] = [
    withTitle(makeNode('product', { x: 60, y: 70 }, 'production-product'), '产品素材', {
      assetUrl: DEMO_PRODUCT_IMAGE,
    }),
    withTitle(makeNode('scene', { x: 60, y: 310 }, 'production-scene'), '场景设定', {
      assetUrl: DEMO_LIFESTYLE_IMAGE,
    }),
    withTitle(makeNode('storyboard', { x: 60, y: 550 }, 'production-script'), '营销脚本'),
    withTitle(makeNode('text', { x: 410, y: 70 }, 'production-copy'), '创意文案', {
      stage: 'C',
      prompt: '围绕产品核心卖点，写一段前三秒抓人、表达自然的短视频创意文案。',
    }),
    withTitle(makeNode('image', { x: 410, y: 370 }, 'production-scene-images'), '产品场景图', {
      assetUrl: DEMO_PRODUCT_IMAGE,
      outputUrl: DEMO_LIFESTYLE_IMAGE,
      prompt: DEMO_IMAGE_PROMPT,
    }),
    withTitle(makeNode('video', { x: 760, y: 130 }, 'production-selling-video'), '视频生成', {
      assetUrl: DEMO_LIFESTYLE_IMAGE,
      outputUrl: DEMO_VIDEO,
      prompt: DEMO_VIDEO_PROMPT,
    }),
    withTitle(makeNode('voice', { x: 760, y: 450 }, 'production-voice'), '配音生成'),
    withTitle(makeNode('editor', { x: 1110, y: 280 }, 'production-editor'), 'AI 剪辑组装'),
    withTitle(makeNode('export', { x: 1440, y: 280 }, 'production-export'), '成片输出'),
  ];
  const edges: WorkflowEdge[] = [
    { id: 'production-edge-1', source: 'production-product', target: 'production-copy', animated: true },
    { id: 'production-edge-2', source: 'production-scene', target: 'production-copy', animated: true },
    { id: 'production-edge-3', source: 'production-product', target: 'production-scene-images', animated: true },
    { id: 'production-edge-4', source: 'production-scene', target: 'production-scene-images', animated: true },
    { id: 'production-edge-5', source: 'production-copy', target: 'production-selling-video', animated: true },
    { id: 'production-edge-6', source: 'production-scene-images', target: 'production-selling-video', animated: true },
    { id: 'production-edge-7', source: 'production-script', target: 'production-voice', animated: true },
    { id: 'production-edge-8', source: 'production-selling-video', target: 'production-editor', animated: true },
    { id: 'production-edge-9', source: 'production-voice', target: 'production-editor', animated: true },
    { id: 'production-edge-10', source: 'production-editor', target: 'production-export', animated: true },
  ];
  return { nodes, edges };
};

const createStarterGraph = (_mode: WorkflowMode): WorkflowSnapshot => createVideoProductionGraph();

const storageKey = (projectKey: string) => `${STORAGE_PREFIX}${projectKey}`;

const safeReadDocument = (projectKey: string): WorkflowDocument | null => {
  try {
    const raw = localStorage.getItem(storageKey(projectKey));
    if (!raw) return null;
    const document = JSON.parse(raw) as WorkflowDocument;
    if (document.version !== 3 || !Array.isArray(document.nodes) || !Array.isArray(document.edges)) return null;
    return document;
  } catch {
    return null;
  }
};

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  projectKey: null,
  mode: 'image',
  nodes: [],
  edges: [],
  past: [],
  future: [],
  pendingRunNodeId: null,
  activeDirectorNodeId: null,
  creativeLibraryRequest: null,
  openCreativeLibrary: (type, options = {}) => set({ creativeLibraryRequest: { type, projectKey: get().projectKey, ...options } }),
  closeCreativeLibrary: () => set({ creativeLibraryRequest: null }),
  openDirector: (nodeId) => {
    if (get().nodes.some((node) => node.id === nodeId && node.data.kind === 'director')) {
      set({ activeDirectorNodeId: nodeId });
    }
  },
  closeDirector: () => set({ activeDirectorNodeId: null }),

  load: (projectId, mode) => {
    const projectKey = projectId || 'draft';
    const current = get();
    if (current.projectKey === projectKey) {
      set({ mode });
      return;
    }
    const saved = safeReadDocument(projectKey);
    const starter = createStarterGraph(mode);
    set({
      projectKey,
      mode,
      nodes: hydrateDemoMedia(saved?.nodes || starter.nodes),
      edges: saved?.edges || starter.edges,
      past: [],
      future: [],
      pendingRunNodeId: null,
      activeDirectorNodeId: null,
      creativeLibraryRequest: null,
    });
  },

  persist: () => {
    const { projectKey, nodes, edges } = get();
    if (!projectKey) return;
    const document: WorkflowDocument = {
      version: 3,
      projectId: projectKey,
      nodes: nodes.map((node) => ({ ...node, selected: false })),
      edges: edges.map((edge) => ({ ...edge, selected: false })),
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(storageKey(projectKey), JSON.stringify(document));
  },

  checkpoint: () => {
    const { nodes, edges, past } = get();
    set({
      past: [...past.slice(-(HISTORY_LIMIT - 1)), cloneSnapshot(nodes, edges)],
      future: [],
    });
  },

  onNodesChange: (changes) => {
    const state = get();
    const removedIds = new Set(changes.flatMap(change => change.type === 'remove' && state.nodes.some(node => node.id === change.id) ? [change.id] : []));
    if (removedIds.size) state.checkpoint();
    set(current => ({
      nodes: withoutDeletedNodeReferences(applyNodeChanges(changes, current.nodes), removedIds),
      ...(removedIds.size ? {
        edges: current.edges.filter(edge => !removedIds.has(edge.source) && !removedIds.has(edge.target)),
        activeDirectorNodeId: current.activeDirectorNodeId && removedIds.has(current.activeDirectorNodeId) ? null : current.activeDirectorNodeId,
        pendingRunNodeId: current.pendingRunNodeId && removedIds.has(current.pendingRunNodeId) ? null : current.pendingRunNodeId,
      } : {}),
    }));
  },
  onEdgesChange: (changes) => set((state) => ({ edges: applyEdgeChanges(changes, state.edges) })),

  connect: (connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return;
    const state = get();
    const duplicate = state.edges.some((edge) => edge.source === connection.source && edge.target === connection.target);
    if (duplicate) return;
    state.checkpoint();
    set((current) => ({
      edges: addEdge({ ...connection, animated: true, type: 'smoothstep' }, current.edges),
    }));
  },

  addNode: (kind, position) => {
    const state = get();
    state.checkpoint();
    const offset = state.nodes.length * 18;
    const node = makeNode(kind, position || { x: 320 + offset, y: 180 + offset });
    set((current) => ({
      nodes: [...current.nodes.map((item) => ({ ...item, selected: false })), { ...node, selected: true }],
      edges: current.edges.map((item) => ({ ...item, selected: false })),
    }));
    return node.id;
  },

  applyCreativeResource: (resource, options = {}) => {
    if (resource.status !== 'published') throw new Error('只能引用已发布的资源');
    if (!isCreativeResourceType(resource.type)) throw new Error('资源类型不正确，请重新选择');
    const state = get();
    const existing = options.nodeId ? state.nodes.find(item => item.id === options.nodeId) : undefined;
    if (options.nodeId !== undefined && (!existing || !isCreativeResourceType(existing.data.kind))) throw new Error('资源节点已不存在，请重新选择');
    if (existing && existing.data.kind !== resource.type) throw new Error('不允许更换节点类型，请从对应资源库选择');
    const target = options.targetNodeId ? state.nodes.find(item => item.id === options.targetNodeId
      && (item.data.kind === 'image' || item.data.kind === 'video')) : undefined;
    if (options.targetNodeId !== undefined && !target) throw new Error('请选择仍在画布中的图片或视频生成节点作为目标');
    const images = resource.type === 'character' ? characterResourceImages(resource) : [];
    if (resource.type === 'character' && !images.length) throw new Error('角色资源没有可用的参考图片，请检查图库地址');
    const expandsLegacyCharacter = resource.type === 'character' && existing && !existing.data.resourceViewLabel;
    const linkedTargetIds = new Set(target ? [target.id] : []);
    if (expandsLegacyCharacter) {
      state.nodes.forEach(node => { if (node.data.referenceNodeIds?.includes(existing.id)) linkedTargetIds.add(node.id); });
      state.edges.forEach(edge => { if (edge.source === existing.id) linkedTargetIds.add(edge.target); });
    }
    // Replacing a node is intentionally local: match its view, never replace/delete the whole set.
    const selectedImages = resource.type === 'character' ? existing?.data.resourceViewLabel
      ? [images.find(image => image.label === existing.data.resourceViewLabel) || images[0]] : images : [undefined];
    const columns = Math.min(selectedImages.length, 3);
    let origin = existing?.position || options.position || (target
      ? { x: target.position.x - columns * 360 - 60, y: target.position.y }
      : { x: 220 + state.nodes.length * 18, y: 180 + state.nodes.length * 18 });
    if (resource.type === 'character' && (!existing || expandsLegacyCharacter)) {
      const occupied = state.nodes.filter(node => node.id !== existing?.id);
      const width = (columns - 1) * 360 + 304;
      const height = (Math.ceil(selectedImages.length / columns) - 1) * 360 + 300;
      const rightOf = (node: WorkflowNode) => node.position.x + (node.measured?.width || node.width || 320);
      const bottomOf = (node: WorkflowNode) => node.position.y + (node.measured?.height || node.height || 300);
      if (occupied.some(node => origin.x < rightOf(node) + 40 && origin.x + width + 40 > node.position.x
        && origin.y < bottomOf(node) + 40 && origin.y + height + 40 > node.position.y)) {
        origin = { x: Math.max(...occupied.map(rightOf)) + 120, y: origin.y };
      }
    }
    const bundleId = resource.type === 'character' ? `character-set-${Date.now()}-${Math.random().toString(36).slice(2, 9)}` : undefined;
    const imported = selectedImages.map((image, index) => {
      // An old whole-character node expands in place; only the first view reuses its ID.
      const position = { x: origin.x + (index % columns) * 360, y: origin.y + Math.floor(index / columns) * 360 };
      const node = index === 0 && existing ? { ...existing, position } : makeNode(resource.type, position);
      return { ...node, data: creativeResourceNodeData(resource, image, bundleId), selected: true };
    });
    const importedIds = new Set(imported.map(node => node.id));
    const titleById = new Map([...state.nodes, ...imported].map(node => [node.id, node.data.title]));
    state.checkpoint();
    set(current => {
      const remaining = current.nodes.filter(item => !importedIds.has(item.id)).map(item => {
        let data = item.data;
        const references = item.data.referenceNodeIds || [];
        const nextReferences = linkedTargetIds.has(item.id) ? [...new Set([...references, ...importedIds])] : references;
        if (linkedTargetIds.has(item.id) || references.some(id => importedIds.has(id))) {
          data = { ...data, referenceNodeIds: nextReferences, referenceLabels: nextReferences.map((id, index) => titleById.get(id) || item.data.referenceLabels?.[index] || '画布资源') };
        }
        if (data.referenceMarks?.some(mark => importedIds.has(mark.nodeId))) {
          data = { ...data, referenceMarks: data.referenceMarks.map(mark => importedIds.has(mark.nodeId) ? { ...mark, nodeTitle: titleById.get(mark.nodeId)! } : mark) };
        }
        return { ...item, selected: false, data };
      });
      const pairs = new Set(current.edges.map(edge => `${edge.source}\0${edge.target}`));
      const addedEdges: WorkflowEdge[] = [...linkedTargetIds].flatMap(targetId => imported.flatMap(node => {
        const pair = `${node.id}\0${targetId}`;
        if (pairs.has(pair)) return [];
        pairs.add(pair);
        return [{ id: `creative-${node.id}-${targetId}`, source: node.id, target: targetId,
          sourceHandle: 'right', targetHandle: 'left', type: 'smoothstep', animated: true }];
      }));
      return { nodes: [...remaining, ...imported], edges: [...current.edges.map(edge => ({ ...edge, selected: false })), ...addedEdges] };
    });
    return imported[0].id;
  },

  deleteSelection: () => {
    const state = get();
    const selectedNodeIds = new Set(state.nodes.filter((node) => node.selected).map((node) => node.id));
    const hasSelectedEdge = state.edges.some((edge) => edge.selected);
    if (!selectedNodeIds.size && !hasSelectedEdge) return;
    state.checkpoint();
    set((current) => ({
      nodes: withoutDeletedNodeReferences(current.nodes.filter((node) => !selectedNodeIds.has(node.id)), selectedNodeIds),
      edges: current.edges.filter((edge) => !edge.selected && !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)),
      activeDirectorNodeId: current.activeDirectorNodeId && selectedNodeIds.has(current.activeDirectorNodeId) ? null : current.activeDirectorNodeId,
      pendingRunNodeId: current.pendingRunNodeId && selectedNodeIds.has(current.pendingRunNodeId) ? null : current.pendingRunNodeId,
    }));
  },

  duplicateSelection: () => {
    const state = get();
    const selected = state.nodes.filter((node) => node.selected);
    if (!selected.length) return;
    state.checkpoint();
    const idMap = new Map<string, string>();
    const copies = selected.map((node) => {
      const id = `${node.data.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      idMap.set(node.id, id);
      return {
        ...node,
        id,
        position: { x: node.position.x + 46, y: node.position.y + 46 },
        data: { ...node.data, title: `${node.data.title} 副本`, status: 'idle' as const, taskId: undefined },
        selected: true,
      };
    });
    const copiedEdges = state.edges.flatMap((edge) => {
      const source = idMap.get(edge.source);
      const target = idMap.get(edge.target);
      if (!source || !target) return [];
      return [{ ...edge, id: `${source}-${target}`, source, target, selected: false }];
    });
    set((current) => ({
      nodes: [...current.nodes.map((node) => ({ ...node, selected: false })), ...copies],
      edges: [...current.edges.map((edge) => ({ ...edge, selected: false })), ...copiedEdges],
    }));
  },

  selectAll: () => set((state) => ({ nodes: state.nodes.map((node) => ({ ...node, selected: true })) })),
  clearSelection: () => set((state) => ({
    nodes: state.nodes.map((node) => ({ ...node, selected: false })),
    edges: state.edges.map((edge) => ({ ...edge, selected: false })),
  })),

  clearCanvas: () => {
    const state = get();
    if (!state.nodes.length && !state.edges.length) return;
    state.checkpoint();
    set({ nodes: [], edges: [] });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    const previous = past[past.length - 1];
    if (!previous) return;
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: past.slice(0, -1),
      future: [cloneSnapshot(nodes, edges), ...future].slice(0, HISTORY_LIMIT),
    });
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    const next = future[0];
    if (!next) return;
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, cloneSnapshot(nodes, edges)].slice(-HISTORY_LIMIT),
      future: future.slice(1),
    });
  },

  updateNodeData: (nodeId, patch) => set((state) => ({
    nodes: state.nodes.map((node) => node.id === nodeId
      ? { ...node, data: { ...node.data, ...patch } }
      : node),
  })),

  requestRun: (nodeId) => set({ pendingRunNodeId: nodeId }),
  consumeRunRequest: () => set({ pendingRunNodeId: null }),

  createAgentDraft: (prompt) => {
    const state = get();
    state.checkpoint();
    const baseX = state.nodes.length ? Math.max(...state.nodes.map((node) => node.position.x)) + 380 : 100;
    const storyboard = makeNode('storyboard', { x: baseX, y: 110 });
    storyboard.data = { ...storyboard.data, title: 'Agent 分镜草案', prompt };
    const promptNode = makeNode('prompt', { x: baseX + 320, y: 110 });
    const image = makeNode('image', { x: baseX + 670, y: 110 });
    const result = makeNode('result', { x: baseX + 940, y: 110 });
    const nodes = [storyboard, promptNode, image, result];
    if (/视频|动效|运镜/.test(prompt)) nodes.push(makeNode('video', { x: baseX + 1210, y: 110 }));
    const edges: WorkflowEdge[] = nodes.slice(1).map((node, index) => ({
      id: `agent-${nodes[index].id}-${node.id}`,
      source: nodes[index].id,
      target: node.id,
      animated: true,
      type: 'smoothstep',
    }));
    set((current) => ({
      nodes: [...current.nodes.map((node) => ({ ...node, selected: false })), ...nodes],
      edges: [...current.edges, ...edges],
    }));
  },

  createVideoProductionDraft: () => {
    const state = get();
    state.checkpoint();
    const graph = createVideoProductionGraph();
    set({ nodes: graph.nodes, edges: graph.edges, pendingRunNodeId: null });
  },
}));
