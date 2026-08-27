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
}

const STORAGE_PREFIX = 'ai-script:visual-workflow:v1:';
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

const createStarterGraph = (mode: WorkflowMode): WorkflowSnapshot => {
  const nodes: WorkflowNode[] = [
    makeNode('storyboard', { x: 80, y: 90 }, 'starter-storyboard'),
    makeNode('character', { x: 80, y: 380 }, 'starter-character'),
    makeNode('prompt', { x: 440, y: 190 }, 'starter-prompt'),
    makeNode('image', { x: 800, y: 190 }, 'starter-image'),
    makeNode('result', { x: 1160, y: 190 }, 'starter-result'),
  ];
  const edges: WorkflowEdge[] = [
    { id: 'starter-edge-1', source: 'starter-storyboard', target: 'starter-prompt', animated: true },
    { id: 'starter-edge-2', source: 'starter-character', target: 'starter-prompt', animated: true },
    { id: 'starter-edge-3', source: 'starter-prompt', target: 'starter-image', animated: true },
    { id: 'starter-edge-4', source: 'starter-image', target: 'starter-result', animated: true },
  ];
  if (mode === 'video') {
    nodes.push(makeNode('video', { x: 1520, y: 190 }, 'starter-video'));
    edges.push({ id: 'starter-edge-5', source: 'starter-result', target: 'starter-video', animated: true });
  }
  return { nodes, edges };
};

const storageKey = (projectKey: string) => `${STORAGE_PREFIX}${projectKey}`;

const safeReadDocument = (projectKey: string): WorkflowDocument | null => {
  try {
    const raw = localStorage.getItem(storageKey(projectKey));
    if (!raw) return null;
    const document = JSON.parse(raw) as WorkflowDocument;
    if (document.version !== 1 || !Array.isArray(document.nodes) || !Array.isArray(document.edges)) return null;
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
      version: 1,
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
      nodes: [...current.nodes.map((item) => ({ ...item, selected: false })), { ...node, selected: true }],
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
    const promptNode = makeNode('prompt', { x: baseX + 360, y: 110 });
    const image = makeNode('image', { x: baseX + 720, y: 110 });
    const result = makeNode('result', { x: baseX + 1080, y: 110 });
    const nodes = [storyboard, promptNode, image, result];
    if (/视频|动效|运镜/.test(prompt)) nodes.push(makeNode('video', { x: baseX + 1440, y: 110 }));
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
}));

