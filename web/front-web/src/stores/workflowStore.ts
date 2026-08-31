import { create } from 'zustand';
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
  load: (projectId: string | null, mode: WorkflowMode) => void;
  persist: () => void;
  checkpoint: () => void;
  onNodesChange: (changes: NodeChange<WorkflowNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<WorkflowEdge>[]) => void;
  connect: (connection: Connection) => void;
  addNode: (kind: WorkflowNodeKind, position?: XYPosition) => string;
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

const STORAGE_PREFIX = 'ai-script:visual-workflow:v3:';
const HISTORY_LIMIT = 40;

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

const createVideoProductionGraph = (): WorkflowSnapshot => {
  const nodes: WorkflowNode[] = [
    withTitle(makeNode('product', { x: 80, y: 120 }, 'production-product'), 'A · 选中产品'),
    withTitle(makeNode('scene', { x: 80, y: 390 }, 'production-scene'), 'A · 选中场景'),
    withTitle(makeNode('categorySkill', { x: 470, y: 260 }, 'production-category-skill'), 'A · 品类场景 Skill'),
    withTitle(makeNode('image', { x: 900, y: 80 }, 'production-scene-images'), 'A · 产品场景图套装', {
      assetUrl: '/mock/skincare-reference-board.png',
    }),
    withTitle(makeNode('character', { x: 900, y: 790 }, 'production-character'), 'B · 选中模特'),
    withTitle(makeNode('storyboard', { x: 900, y: 1100 }, 'production-script'), 'C · 选中营销脚本'),
    withTitle(makeNode('prompt', { x: 1600, y: 710 }, 'production-shot-prompt'), 'D · 分镜 AI 提示词'),
    withTitle(makeNode('video', { x: 2030, y: 230 }, 'production-selling-video'), 'D · 卖点视频镜头'),
    withTitle(makeNode('batchMaterial', { x: 1600, y: 1120 }, 'production-batch-material'), 'D · 100 个品类镜头'),
    withTitle(makeNode('music', { x: 2300, y: 960 }, 'production-music'), 'E · 音乐模型'),
    withTitle(makeNode('voice', { x: 2300, y: 1260 }, 'production-voice'), 'E · 配音模型'),
    withTitle(makeNode('editor', { x: 2760, y: 700 }, 'production-editor'), 'E · AI 剪辑组装'),
    withTitle(makeNode('export', { x: 3200, y: 720 }, 'production-export'), 'E · 10–20 条批量成片'),
  ];
  const edges: WorkflowEdge[] = [
    { id: 'production-edge-1', source: 'production-product', target: 'production-category-skill', animated: true },
    { id: 'production-edge-2', source: 'production-scene', target: 'production-category-skill', animated: true },
    { id: 'production-edge-3', source: 'production-category-skill', target: 'production-scene-images', animated: true },
    { id: 'production-edge-4', source: 'production-scene-images', target: 'production-shot-prompt', animated: true },
    { id: 'production-edge-5', source: 'production-character', target: 'production-shot-prompt', animated: true },
    { id: 'production-edge-6', source: 'production-script', target: 'production-shot-prompt', animated: true },
    { id: 'production-edge-7', source: 'production-shot-prompt', target: 'production-selling-video', animated: true },
    { id: 'production-edge-8', source: 'production-category-skill', target: 'production-batch-material', animated: true },
    { id: 'production-edge-9', source: 'production-selling-video', target: 'production-editor', animated: true },
    { id: 'production-edge-10', source: 'production-batch-material', target: 'production-editor', animated: true },
    { id: 'production-edge-11', source: 'production-script', target: 'production-voice', animated: true },
    { id: 'production-edge-12', source: 'production-music', target: 'production-editor', animated: true },
    { id: 'production-edge-13', source: 'production-voice', target: 'production-editor', animated: true },
    { id: 'production-edge-14', source: 'production-editor', target: 'production-export', animated: true },
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
      nodes: saved?.nodes || starter.nodes,
      edges: saved?.edges || starter.edges,
      past: [],
      future: [],
      pendingRunNodeId: null,
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

  onNodesChange: (changes) => set((state) => ({ nodes: applyNodeChanges(changes, state.nodes) })),
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
      nodes: [...current.nodes.map((item) => ({ ...item, selected: false })), { ...node, selected: false }],
      edges: current.edges.map((item) => ({ ...item, selected: false })),
    }));
    return node.id;
  },

  deleteSelection: () => {
    const state = get();
    const selectedNodeIds = new Set(state.nodes.filter((node) => node.selected).map((node) => node.id));
    const hasSelectedEdge = state.edges.some((edge) => edge.selected);
    if (!selectedNodeIds.size && !hasSelectedEdge) return;
    state.checkpoint();
    set((current) => ({
      nodes: current.nodes.filter((node) => !selectedNodeIds.has(node.id)),
      edges: current.edges.filter((edge) => !edge.selected && !selectedNodeIds.has(edge.source) && !selectedNodeIds.has(edge.target)),
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
