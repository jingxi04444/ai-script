import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import CanvasIcon from './CanvasIcon';
import { message, Modal, Tooltip } from 'antd';
import {
  MiniMap,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  type IsValidConnection,
  type NodeMouseHandler,
  type OnConnect,
  type OnNodeDrag,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { workflowApi } from '../../../api/workflow';
import { useWorkflowStore } from '../../../stores/workflowStore';
import { useAuthStore } from '../../../stores/authStore';
import { config } from '../../../config';
import { referenceKinds, referenceSelectionPatch } from '../../../utils/workflowReferences';
import { isCreativeResourceType, isLegacyUploadedCharacterResource, type CreativeResourceType } from '../../../types/creativeResource';
import type { WorkflowEdge, WorkflowMode, WorkflowNode, WorkflowNodeKind, WorkflowRun, WorkflowRunEvent } from '../../../types/workflow';
import NodeLibrary from './NodeLibrary';
import WorkflowNodeCard, { isWorkflowEditorKind, WorkflowNodeSelectionEditor } from './WorkflowNodeCard';
import WorkflowMarkSelector from './WorkflowMarkSelector';
import WorkflowResourceInspector from './WorkflowResourceInspector';
import WorkflowRunMonitor from './WorkflowRunMonitor';
import './visual-canvas-panel.css';
import './canvas-studio.css';

interface VisualCanvasPanelProps {
  mode: WorkflowMode;
  projectId: string | null;
  projectTitle?: string;
  ensureProjectId: () => Promise<string>;
}

const nodeTypes = { workflow: WorkflowNodeCard };
const DirectorStudio = lazy(() => import('./DirectorStudio/DirectorStudio'));
const CreativeResourceLibrary = lazy(() => import('./CreativeLibrary/CreativeResourceLibrary'));
const wait = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration));

const readTextOutput = (output?: Record<string, unknown>) => {
  if (!output) return undefined;
  for (const key of ['text', 'content', 'result']) {
    const candidate = output[key];
    if (typeof candidate === 'string' && candidate.trim()) return candidate;
  }
  return undefined;
};

interface CanvasContextMenuState {
  x: number;
  y: number;
  flowPosition: { x: number; y: number };
  nodeId?: string;
}

interface WorkflowClipboard {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface SelectionEditorAnchor {
  left: number;
  top: number;
  width: number;
}

interface CanvasSelectionState {
  mode: 'reference' | 'mark';
  originNodeId: string;
  selectedNodeIds: string[];
  role?: 'firstFrame' | 'lastFrame';
}

const VisualCanvasWorkspace = ({ mode, projectId, projectTitle = '未命名工作区', ensureProjectId }: VisualCanvasPanelProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const persistTimerRef = useRef<number>();
  const localPersistFailedRef = useRef(false);
  const clipboardRef = useRef<WorkflowClipboard | null>(null);
  const workflowRunAbortRef = useRef<AbortController | null>(null);
  const arrangeFitFrameRef = useRef<number>();
  const [agentPrompt, setAgentPrompt] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [activeTool, setActiveTool] = useState<'select' | 'pan'>('select');
  const [canvasZoom, setCanvasZoom] = useState(1);
  const [moreOpen, setMoreOpen] = useState(false);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [runMonitorOpen, setRunMonitorOpen] = useState(false);
  const [activeRun, setActiveRun] = useState<WorkflowRun | null>(null);
  const [activeRunProjectId, setActiveRunProjectId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);
  const [libraryAnchor, setLibraryAnchor] = useState<CanvasContextMenuState | null>(null);
  const [selectionEditorAnchor, setSelectionEditorAnchor] = useState<SelectionEditorAnchor | null>(null);
  const [canvasSelection, setCanvasSelection] = useState<CanvasSelectionState | null>(null);
  const [markTargetNodeId, setMarkTargetNodeId] = useState<string | null>(null);
  const [selectedMarkParts, setSelectedMarkParts] = useState<string[]>([]);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const pastCount = useWorkflowStore((state) => state.past.length);
  const futureCount = useWorkflowStore((state) => state.future.length);
  const pendingRunNodeId = useWorkflowStore((state) => state.pendingRunNodeId);
  const activeDirectorNodeId = useWorkflowStore((state) => state.activeDirectorNodeId);
  const creativeLibraryRequest = useWorkflowStore(state => state.creativeLibraryRequest);
  const openCreativeLibrary = useWorkflowStore(state => state.openCreativeLibrary);
  const closeCreativeLibrary = useWorkflowStore(state => state.closeCreativeLibrary);
  const userId = useAuthStore(state => state.user?.id);
  const openDirector = useWorkflowStore((state) => state.openDirector);
  const closeDirector = useWorkflowStore((state) => state.closeDirector);
  const load = useWorkflowStore((state) => state.load);
  const persist = useWorkflowStore((state) => state.persist);
  const checkpoint = useWorkflowStore((state) => state.checkpoint);
  const onNodesChange = useWorkflowStore((state) => state.onNodesChange);
  const onEdgesChange = useWorkflowStore((state) => state.onEdgesChange);
  const connect = useWorkflowStore((state) => state.connect);
  const addNode = useWorkflowStore((state) => state.addNode);
  const deleteSelection = useWorkflowStore((state) => state.deleteSelection);
  const duplicateSelection = useWorkflowStore((state) => state.duplicateSelection);
  const selectAll = useWorkflowStore((state) => state.selectAll);
  const clearSelection = useWorkflowStore((state) => state.clearSelection);
  const clearCanvas = useWorkflowStore((state) => state.clearCanvas);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const consumeRunRequest = useWorkflowStore((state) => state.consumeRunRequest);
  const createAgentDraft = useWorkflowStore((state) => state.createAgentDraft);
  const createVideoProductionDraft = useWorkflowStore((state) => state.createVideoProductionDraft);
  const { fitView, fitBounds, screenToFlowPosition, zoomTo, setCenter, getZoom } = useReactFlow<WorkflowNode>();

  useEffect(() => () => {
    if (arrangeFitFrameRef.current !== undefined) cancelAnimationFrame(arrangeFitFrameRef.current);
  }, []);

  const selectedEditorNode = useMemo(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length !== 1 || !isWorkflowEditorKind(selectedNodes[0].data.kind)) return null;
    return selectedNodes[0];
  }, [nodes]);
  const selectedResourceNode = useMemo(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length !== 1 || isWorkflowEditorKind(selectedNodes[0].data.kind) || selectedNodes[0].data.kind === 'director') return null;
    return selectedNodes[0];
  }, [nodes]);
  const selectedEditorNodeId = selectedEditorNode?.id;
  const selectedEditorNodeKind = selectedEditorNode?.data.kind;
  const markTargetNode = useMemo(
    () => nodes.find((node) => node.id === markTargetNodeId) || null,
    [markTargetNodeId, nodes],
  );
  const canvasNodes = useMemo<WorkflowNode[]>(() => {
    if (!canvasSelection) return nodes;
    const originKind = nodes.find(node => node.id === canvasSelection.originNodeId)?.data.kind;
    const eligibleKinds = referenceKinds(originKind, canvasSelection.mode, canvasSelection.role);
    const selectedIds = new Set(canvasSelection.selectedNodeIds);
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        canvasPickMode: canvasSelection.mode,
        canvasPickState: (node.id === canvasSelection.originNodeId
          ? 'origin'
          : selectedIds.has(node.id)
            ? 'selected'
            : eligibleKinds.has(node.data.kind) ? 'eligible' : undefined) as WorkflowNode['data']['canvasPickState'],
      },
    }));
  }, [canvasSelection, nodes]);
  const canvasEdges = useMemo(() => edges.map(edge => ({
    ...edge,
    type: 'default',
    animated: workflowRunning,
  })), [edges, workflowRunning]);

  useEffect(() => {
    if (moreOpen) wrapperRef.current?.querySelector<HTMLButtonElement>('.canvas-more-menu button:not(:disabled)')?.focus();
  }, [moreOpen]);

  const updateSelectionEditorAnchor = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper || !selectedEditorNodeId || !selectedEditorNodeKind) {
      setSelectionEditorAnchor(null);
      return;
    }
    const nodeElement = wrapper.querySelector<HTMLElement>(`.react-flow__node[data-id="${selectedEditorNodeId}"]`);
    if (!nodeElement) {
      setSelectionEditorAnchor(null);
      return;
    }
    const wrapperRect = wrapper.getBoundingClientRect();
    const nodeRect = nodeElement.getBoundingClientRect();
    const isVideoEditor = selectedEditorNodeKind === 'video';
    const preferredWidth = 660;
    const horizontalInset = 16;
    const visibleLeft = Math.max(0, -wrapperRect.left);
    const visibleRight = Math.min(wrapperRect.width, window.innerWidth - wrapperRect.left);
    const visibleWidth = Math.max(320, visibleRight - visibleLeft);
    const width = Math.max(320, Math.min(preferredWidth, visibleWidth - horizontalInset * 2));
    const halfWidth = width / 2;
    const nodeCenter = nodeRect.left - wrapperRect.left + nodeRect.width / 2;
    const left = Math.max(
      visibleLeft + horizontalInset + halfWidth,
      Math.min(nodeCenter, visibleRight - horizontalInset - halfWidth),
    );
    const renderedEditorHeight = wrapper.querySelector<HTMLElement>('.workflow-editor-overlay')?.getBoundingClientRect().height;
    const estimatedHeight = renderedEditorHeight || (selectedEditorNodeKind === 'text' ? 152
      : isVideoEditor ? 210 : 194);
    const below = nodeRect.bottom - wrapperRect.top + 8;
    const above = nodeRect.top - wrapperRect.top - estimatedHeight - 8;
    const bottomReserve = 72;
    const top = below + estimatedHeight <= wrapperRect.height - bottomReserve ? below : Math.max(64, Math.min(above, wrapperRect.height - estimatedHeight - bottomReserve));
    setSelectionEditorAnchor({ left, top, width });
  }, [selectedEditorNodeId, selectedEditorNodeKind]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(updateSelectionEditorAnchor);
    return () => window.cancelAnimationFrame(frame);
  }, [selectedEditorNode?.position.x, selectedEditorNode?.position.y, updateSelectionEditorAnchor]);

  const editorOverlayMounted = Boolean(selectionEditorAnchor) && !canvasSelection;
  useEffect(() => {
    window.addEventListener('resize', updateSelectionEditorAnchor);
    return () => window.removeEventListener('resize', updateSelectionEditorAnchor);
  }, [updateSelectionEditorAnchor]);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    const overlay = wrapper?.querySelector<HTMLElement>('.workflow-editor-overlay');
    if (!overlay || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => updateSelectionEditorAnchor());
    observer.observe(overlay);
    return () => observer.disconnect();
  }, [editorOverlayMounted, selectedEditorNodeId, selectedEditorNodeKind, updateSelectionEditorAnchor]);

  const selectedCount = useMemo(
    () => nodes.reduce((count, node) => count + (node.selected ? 1 : 0), 0) + edges.reduce((count, edge) => count + (edge.selected ? 1 : 0), 0),
    [edges, nodes],
  );
  const productionSummary = useMemo(() => {
    const materialCount = nodes
      .filter((node) => node.data.kind === 'video' || node.data.kind === 'batchMaterial')
      .reduce((total, node) => total + (node.data.batchSize || 0), 0);
    const outputCount = nodes.find((node) => node.data.kind === 'export')?.data.outputCount || 0;
    return { materialCount, outputCount };
  }, [nodes]);

  const copySelection = useCallback(() => {
    const state = useWorkflowStore.getState();
    const copiedNodes = state.nodes.filter((node) => node.selected);
    if (!copiedNodes.length) {
      message.info('请先选择需要复制的节点');
      return;
    }
    const ids = new Set(copiedNodes.map((node) => node.id));
    const copiedEdges = state.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
    clipboardRef.current = {
      nodes: copiedNodes.map((node) => ({ ...node, data: { ...node.data }, position: { ...node.position } })),
      edges: copiedEdges.map((edge) => ({ ...edge })),
    };
    void navigator.clipboard?.writeText(JSON.stringify(clipboardRef.current)).catch(() => undefined);
    message.success(`已复制 ${copiedNodes.length} 个节点`);
  }, []);

  const pasteClipboard = useCallback((position?: { x: number; y: number }) => {
    const clipboard = clipboardRef.current;
    if (!clipboard?.nodes.length) {
      message.info('剪贴板中还没有画布节点');
      return;
    }
    checkpoint();
    const minX = Math.min(...clipboard.nodes.map((node) => node.position.x));
    const minY = Math.min(...clipboard.nodes.map((node) => node.position.y));
    const idMap = new Map<string, string>();
    const pastedNodes = clipboard.nodes.map((node) => {
      const nextId = `${node.data.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      idMap.set(node.id, nextId);
      return {
        ...node,
        id: nextId,
        position: position
          ? { x: position.x + node.position.x - minX, y: position.y + node.position.y - minY }
          : { x: node.position.x + 48, y: node.position.y + 48 },
        data: { ...node.data, status: 'idle' as const, progress: 0, taskId: undefined },
        selected: true,
      };
    });
    const pastedEdges = clipboard.edges.flatMap((edge) => {
      const source = idMap.get(edge.source);
      const target = idMap.get(edge.target);
      if (!source || !target) return [];
      return [{ ...edge, id: `paste-${source}-${target}`, source, target, selected: false }];
    });
    useWorkflowStore.setState((state) => ({
      nodes: [...state.nodes.map((node) => ({ ...node, selected: false })), ...pastedNodes],
      edges: [...state.edges.map((edge) => ({ ...edge, selected: false })), ...pastedEdges],
    }));
    message.success(`已粘贴 ${pastedNodes.length} 个节点`);
  }, [checkpoint]);

  useEffect(() => {
    load(projectId, mode);
    const timer = window.setTimeout(() => {
      if (useWorkflowStore.getState().nodes.length) {
        void fitView({ padding: 0.1, minZoom: 0.18, maxZoom: 0.82, duration: 520 });
      } else {
        void zoomTo(1);
        setCanvasZoom(1);
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [fitView, load, mode, projectId, zoomTo]);

  useEffect(() => () => workflowRunAbortRef.current?.abort(), []);

  useEffect(() => {
    if (activeDirectorNodeId && !nodes.some((node) => node.id === activeDirectorNodeId && node.data.kind === 'director')) {
      closeDirector();
    }
  }, [activeDirectorNodeId, closeDirector, nodes]);

  useEffect(() => {
    const runId = activeRun?.id;
    const runStatus = activeRun?.status;
    if (!runId || !activeRunProjectId || runStatus === 'success' || runStatus === 'failed' || runStatus === 'canceled') return undefined;
    let disposed = false;
    let refreshing = false;
    const refresh = async () => {
      if (refreshing) return;
      refreshing = true;
      try {
        const latest = await workflowApi.getRun(activeRunProjectId, runId);
        if (!disposed) setActiveRun(latest);
      } catch {
        // SSE remains the primary channel; a transient detail refresh failure is non-fatal.
      } finally {
        refreshing = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => { void refresh(); }, 1500);
    return () => {
      disposed = true;
      window.clearInterval(timer);
    };
  }, [activeRun?.id, activeRun?.status, activeRunProjectId]);

  useEffect(() => {
    if (!activeRun || !activeRunProjectId) return;
    activeRun.nodes.forEach(nodeRun => {
      let output: Record<string, unknown> = {};
      try { output = nodeRun.outputJson ? JSON.parse(nodeRun.outputJson) as Record<string, unknown> : {}; }
      catch { output = {}; }
      updateNodeData(nodeRun.nodeId, {
        status: nodeRun.status === 'success' ? 'success' : nodeRun.status === 'failed' ? 'failed' : nodeRun.status === 'running' ? 'running' : 'queued',
        progress: nodeRun.progress, taskId: activeRun.id,
        ...(typeof output.assetUrl === 'string' ? { outputUrl: output.assetUrl } : {}),
        ...(readTextOutput(output) ? { outputText: readTextOutput(output) } : {}),
      });
    });
  }, [activeRun, activeRunProjectId, updateNodeData]);

  useEffect(() => {
    window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(() => {
      try {
        persist();
        if (localPersistFailedRef.current) message.destroy('workflow-local-persist-error');
        localPersistFailedRef.current = false;
      } catch {
        // One warning per uninterrupted failure period; scene edits must not flood toasts.
        if (!localPersistFailedRef.current) {
          message.warning({
            key: 'workflow-local-persist-error',
            content: '当前画布未保存到本机，请检查浏览器存储空间，或导出导演台工程备份。',
            duration: 6,
          });
        }
        localPersistFailedRef.current = true;
      }
    }, 450);
    return () => window.clearTimeout(persistTimerRef.current);
  }, [edges, nodes, persist]);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
      // The independent 3D editor owns its shortcuts while open.
      if (activeDirectorNodeId || creativeLibraryRequest) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches('input, textarea, select, [contenteditable="true"]')) return;
      const command = event.metaKey || event.ctrlKey;
      if (command && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) redo(); else undo();
      } else if (command && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelection();
      } else if (command && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        copySelection();
      } else if (command && event.key.toLowerCase() === 'v') {
        event.preventDefault();
        pasteClipboard();
      } else if (command && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        selectAll();
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        deleteSelection();
      } else if (event.key === 'Escape') {
        if (markTargetNodeId) {
          setMarkTargetNodeId(null);
          setSelectedMarkParts([]);
          return;
        }
        if (canvasSelection) {
          setCanvasSelection(null);
          return;
        }
        setContextMenu(null);
        setLibraryAnchor(null);
        setLibraryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [activeDirectorNodeId, creativeLibraryRequest, canvasSelection, copySelection, deleteSelection, duplicateSelection, markTargetNodeId, pasteClipboard, redo, selectAll, undo]);

  useEffect(() => {
    if (!pendingRunNodeId) return;
    const node = useWorkflowStore.getState().nodes.find((item) => item.id === pendingRunNodeId);
    consumeRunRequest();
    if (!node) return;
    if (isCreativeResourceType(node.data.kind)) {
      openCreativeLibrary(node.data.kind, { nodeId: node.id });
      return;
    }
    if (node.data.kind === 'director') {
      openDirector(node.id);
      return;
    }
    const runNode = async () => {
      const executable = new Set<WorkflowNodeKind>(['text', 'scriptGenerator', 'prompt', 'categorySkill', 'storyboard', 'image', 'video', 'music', 'voice', 'batchMaterial', 'editor', 'export']);
      if (!executable.has(node.data.kind)) {
        message.info('这是资源或编辑节点，请在画布中配置后运行其下游生成节点');
        return;
      }
      if (config.useMock) {
        message.warning('当前为演示模式，未连接真实模型；请切换到正式后端后运行');
        return;
      }
      updateNodeData(node.id, { status: 'queued', progress: 0, taskId: undefined });
      try {
        const currentProjectId = await ensureProjectId();
        const current = useWorkflowStore.getState();
        const selected = new Set([node.id]);
        const references = (item: WorkflowNode) => [
          ...(item.data.referenceNodeIds || []), item.data.firstFrameNodeId, item.data.lastFrameNodeId,
        ].filter((id): id is string => typeof id === 'string' && !!id);
        const allEdges = [...current.edges];
        current.nodes.forEach(item => references(item).forEach(source => {
          if (source !== item.id && !allEdges.some(edge => edge.source === source && edge.target === item.id)) {
            allEdges.push({ id: `reference-${source}-${item.id}`, source, target: item.id });
          }
        }));
        let changed = true;
        while (changed) {
          const size = selected.size;
          allEdges.forEach(edge => { if (selected.has(edge.target)) selected.add(edge.source); });
          changed = selected.size !== size;
        }
        const graphJson = JSON.stringify({
          nodes: current.nodes.filter(item => selected.has(item.id)).map(item => ({ ...item, selected: false })),
          edges: allEdges.filter(edge => selected.has(edge.source) && selected.has(edge.target)).map(edge => ({ ...edge, selected: false })),
        });
        const validation = await workflowApi.validate(currentProjectId, graphJson);
        if (!validation.valid) throw new Error(validation.errors[0] || '节点依赖关系无效');
        const run = await workflowApi.startRun(currentProjectId, {
          mode, graphJson,
          idempotencyKey: `node-${currentProjectId}-${node.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        });
        setActiveRun(run); setActiveRunProjectId(currentProjectId); setRunMonitorOpen(true);
        selected.forEach(id => updateNodeData(id, { status: 'queued', progress: 0, taskId: run.id }));
        message.info(`已提交 ${validation.nodeCount} 个节点（包含必要上游），执行状态可在监控面板查看`);
      } catch (error) {
        updateNodeData(node.id, { status: 'failed', progress: 0 });
        message.error(error instanceof Error ? error.message : `${node.data.title}运行失败`);
      }
    };
    void runNode();
  }, [consumeRunRequest, ensureProjectId, mode, openCreativeLibrary, openDirector, pendingRunNodeId, updateNodeData]);

  const isValidConnection: IsValidConnection = useCallback((connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return false;
    const adjacency = new Map<string, string[]>();
    edges.forEach((edge) => adjacency.set(edge.source, [...(adjacency.get(edge.source) || []), edge.target]));
    const visited = new Set<string>();
    const reachesSource = (nodeId: string): boolean => {
      if (nodeId === connection.source) return true;
      if (visited.has(nodeId)) return false;
      visited.add(nodeId);
      return (adjacency.get(nodeId) || []).some(reachesSource);
    };
    return !reachesSource(connection.target);
  }, [edges]);

  const handleConnect: OnConnect = useCallback((connection) => connect(connection), [connect]);
  const handleNodeDragStart: OnNodeDrag<WorkflowNode> = useCallback(() => checkpoint(), [checkpoint]);

  const startCanvasSelection = useCallback((mode: 'reference' | 'mark', role?: 'firstFrame' | 'lastFrame') => {
    if (!selectedEditorNode) return;
    setContextMenu(null);
    setLibraryOpen(false);
    setLibraryAnchor(null);
    setMarkTargetNodeId(null);
    setSelectedMarkParts([]);
    setCanvasSelection({
      mode,
      originNodeId: selectedEditorNode.id,
      role,
      selectedNodeIds: mode === 'reference' ? role ? [role === 'firstFrame' ? selectedEditorNode.data.firstFrameNodeId : selectedEditorNode.data.lastFrameNodeId].filter((id): id is string => Boolean(id)) : selectedEditorNode.data.referenceNodeIds || [] : [],
    });
  }, [selectedEditorNode]);

  const keepOriginSelected = useCallback((originNodeId: string) => {
    useWorkflowStore.setState((state) => ({
      nodes: state.nodes.map((item) => ({ ...item, selected: item.id === originNodeId })),
      edges: state.edges.map((edge) => ({ ...edge, selected: false })),
    }));
  }, []);

  const handleNodeClick: NodeMouseHandler<WorkflowNode> = useCallback((event, node) => {
    if (!canvasSelection) return;
    event.preventDefault();
    event.stopPropagation();
    const originKind = nodes.find(node => node.id === canvasSelection.originNodeId)?.data.kind;
    const eligibleKinds = referenceKinds(originKind, canvasSelection.mode, canvasSelection.role);
    if (node.id === canvasSelection.originNodeId || !eligibleKinds.has(node.data.kind)) {
      keepOriginSelected(canvasSelection.originNodeId);
      message.info(canvasSelection.mode === 'mark' ? '请选择一个图片资源节点' : '这个节点不能作为当前输入的参考');
      return;
    }

    keepOriginSelected(canvasSelection.originNodeId);
    if (canvasSelection.mode === 'mark') {
      const origin = nodes.find((item) => item.id === canvasSelection.originNodeId);
      const existingMark = origin?.data.referenceMarks?.find((mark) => mark.nodeId === node.id);
      setSelectedMarkParts(existingMark?.parts || []);
      setMarkTargetNodeId(node.id);
      return;
    }

    setCanvasSelection((current) => {
      if (!current) return current;
      const exists = current.selectedNodeIds.includes(node.id);
      return {
        ...current,
        selectedNodeIds: exists
          ? current.selectedNodeIds.filter((id) => id !== node.id)
          : current.role ? [node.id] : [...current.selectedNodeIds, node.id],
      };
    });
  }, [canvasSelection, keepOriginSelected, nodes]);

  const finishReferenceSelection = useCallback(() => {
    if (!canvasSelection) return;
    if (canvasSelection.mode === 'reference') {
      const selectedIds = new Set(canvasSelection.selectedNodeIds);
      const origin = nodes.find(node => node.id === canvasSelection.originNodeId);
      if (origin) updateNodeData(canvasSelection.originNodeId, referenceSelectionPatch(origin.data, canvasSelection.selectedNodeIds, id => nodes.find(node => node.id === id)?.data.title || '参考素材', canvasSelection.role));
      message.success(selectedIds.size ? `已添加 ${selectedIds.size} 个画布参考` : '已清空画布参考');
    }
    keepOriginSelected(canvasSelection.originNodeId);
    setCanvasSelection(null);
  }, [canvasSelection, keepOriginSelected, nodes, updateNodeData]);

  const confirmMarkSelection = useCallback(() => {
    if (!canvasSelection || !markTargetNode || !selectedMarkParts.length) return;
    const origin = nodes.find((node) => node.id === canvasSelection.originNodeId);
    const nextMarks = (origin?.data.referenceMarks || []).filter((mark) => mark.nodeId !== markTargetNode.id);
    nextMarks.push({ nodeId: markTargetNode.id, nodeTitle: markTargetNode.data.title, parts: selectedMarkParts });
    updateNodeData(canvasSelection.originNodeId, {
      referenceMarks: nextMarks,
      referenceNodeIds: Array.from(new Set([...(origin?.data.referenceNodeIds || []), markTargetNode.id])),
      referenceLabels: Array.from(new Set([...(origin?.data.referenceLabels || []), markTargetNode.data.title])),
    });
    keepOriginSelected(canvasSelection.originNodeId);
    setMarkTargetNodeId(null);
    setSelectedMarkParts([]);
    setCanvasSelection(null);
    message.success(`已标记：${selectedMarkParts.join('、')}`);
  }, [canvasSelection, keepOriginSelected, markTargetNode, nodes, selectedMarkParts, updateNodeData]);

  const menuPosition = useCallback((event: React.MouseEvent | MouseEvent): CanvasContextMenuState => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const rawX = event.clientX - (rect?.left || 0);
    const rawY = event.clientY - (rect?.top || 0);
    return {
      x: Math.max(10, Math.min(rawX, (rect?.width || window.innerWidth) - 226)),
      y: Math.max(10, Math.min(rawY, (rect?.height || window.innerHeight) - 310)),
      flowPosition: screenToFlowPosition({ x: event.clientX, y: event.clientY }),
    };
  }, [screenToFlowPosition]);

  const handlePaneContextMenu = useCallback((event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    setLibraryOpen(false);
    setLibraryAnchor(null);
    setContextMenu(menuPosition(event));
  }, [menuPosition]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: WorkflowNode) => {
    event.preventDefault();
    event.stopPropagation();
    useWorkflowStore.setState((state) => ({
      nodes: state.nodes.map((item) => ({ ...item, selected: item.id === node.id })),
      edges: state.edges.map((edge) => ({ ...edge, selected: false })),
    }));
    setLibraryOpen(false);
    setLibraryAnchor(null);
    setContextMenu({ ...menuPosition(event), nodeId: node.id });
  }, [menuPosition]);

  const openLibraryAtContext = useCallback((menu: CanvasContextMenuState) => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const maxWidth = rect?.width || window.innerWidth;
    const maxHeight = rect?.height || window.innerHeight;
    const menuHeight = Math.min(660, Math.max(0, window.innerHeight - 190));
    setLibraryAnchor({
      ...menu,
      x: Math.max(10, Math.min(menu.x, maxWidth - 258)),
      y: Math.max(10, Math.min(menu.y, maxHeight - menuHeight - 76)),
    });
    setLibraryOpen(true);
    setContextMenu(null);
  }, []);

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const kind = event.dataTransfer.getData('application/ai-script-node') as WorkflowNodeKind;
    if (!kind) return;
    const nodeId = addNode(kind, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    if (kind === 'director') openDirector(nodeId);
  }, [addNode, openDirector, screenToFlowPosition]);

  const arrangeNodes = useCallback(() => {
    const count = useWorkflowStore.getState().arrangeNodes();
    if (!count) {
      message.info('画布暂无节点，添加节点后即可整理');
      return;
    }
    if (arrangeFitFrameRef.current !== undefined) cancelAnimationFrame(arrangeFitFrameRef.current);
    // Wait for React Flow to receive the new positions before fitting the viewport.
    arrangeFitFrameRef.current = requestAnimationFrame(() => {
      arrangeFitFrameRef.current = requestAnimationFrame(() => {
        void fitView({ padding: 0.2, duration: 420, maxZoom: 1 });
      });
    });
    message.success(`已整理 ${count} 个节点，可通过 ⌘ / Ctrl + Z 撤销`);
  }, [fitView]);

  const navigateMinimap = useCallback((_event: React.MouseEvent, position: { x: number; y: number }) => {
    void setCenter(position.x, position.y, { zoom: getZoom(), duration: 200 });
  }, [getZoom, setCenter]);

  const focusMinimapNode = useCallback((event: React.MouseEvent, node: WorkflowNode) => {
    event.stopPropagation();
    void setCenter(
      node.position.x + (node.measured?.width || node.width || 340) / 2,
      node.position.y + (node.measured?.height || node.height || 300) / 2,
      { zoom: getZoom(), duration: 200 },
    );
  }, [getZoom, setCenter]);

  const submitAgentDraft = () => {
    const prompt = agentPrompt.trim();
    if (!prompt) return message.warning('请先描述你希望搭建的图片或视频流程');
    createAgentDraft(prompt);
    setAgentPrompt('');
    message.success('已生成本地工作流草案，可继续调整节点和参数');
    window.setTimeout(() => fitView({ padding: 0.14, duration: 520 }), 50);
  };

  const showShortcutHelp = () => Modal.info({
    title: '画布快捷键',
    width: 420,
    okText: '知道了',
    content: (
      <div className="workflow-shortcut-help">
        <span><kbd>⌘ / Ctrl</kbd><b>+</b><kbd>Z</kbd><em>撤销</em></span>
        <span><kbd>⇧</kbd><b>+</b><kbd>⌘ / Ctrl</kbd><b>+</b><kbd>Z</kbd><em>重做</em></span>
        <span><kbd>⌘ / Ctrl</kbd><b>+</b><kbd>D</kbd><em>复制节点</em></span>
        <span><kbd>Delete</kbd><em>删除所选</em></span>
      </div>
    ),
  });

  const saveWorkflow = async () => {
    persist();
    try {
      const currentProjectId = await ensureProjectId();
      const graphJson = JSON.stringify({
        nodes: useWorkflowStore.getState().nodes.map((node) => ({ ...node, selected: false })),
        edges: useWorkflowStore.getState().edges.map((edge) => ({ ...edge, selected: false })),
      });
      const validation = await workflowApi.validate(currentProjectId, graphJson);
      if (!validation.valid) {
        message.error(validation.errors[0] || '工作流校验失败');
        return;
      }
      const saved = await workflowApi.save(currentProjectId, {
        name: `${projectTitle} · 产品视频生产工作流`,
        mode,
        graphJson,
      });
      message.success(`画布已保存到项目（版本 ${saved.version}）`);
    } catch {
      message.warning('画布已保存在当前浏览器，后端服务可用后可同步到项目');
    }
  };

  const runLocalWorkflowPreview = async () => {
    const stageOrder = ['A', 'B', 'C', 'D', 'E'] as const;
    const sourceNodeKinds = new Set<WorkflowNodeKind>(['product', 'scene', 'character', 'style', 'effect', 'storyboard', 'director']);
    const startedAt = new Date().toISOString();
    const previewRunId = `preview-${Date.now()}`;
    const previewNodes = useWorkflowStore.getState().nodes;
    useWorkflowStore.setState((state) => ({
      nodes: state.nodes.map((node) => ({ ...node, data: { ...node.data, status: 'idle', progress: 0, taskId: undefined } })),
    }));
    setActiveRunProjectId(null);
    setActiveRun({
      id: previewRunId,
      projectId: projectId || 'preview',
      workflowVersion: 1,
      status: 'running',
      progress: 1,
      totalNodes: previewNodes.length,
      completedNodes: 0,
      failedNodes: 0,
      cancelRequested: false,
      startedAt,
      nodes: previewNodes.map((node, index) => ({
        id: `${previewRunId}-${index}`,
        nodeId: node.id,
        nodeKind: node.data.kind,
        skillCode: node.data.skillCode,
        status: 'pending',
        attempt: 1,
        progress: 0,
      })),
    });
    setRunMonitorOpen(true);
    for (const stage of stageOrder) {
      const stageNodes = useWorkflowStore.getState().nodes.filter((node) => node.data.stage === stage);
      if (!stageNodes.length) continue;
      const stageNodeIds = new Set(stageNodes.map((node) => node.id));
      const stageStartedAt = new Date().toISOString();
      setActiveStage(stage);
      stageNodes.forEach((node) => updateNodeData(node.id, {
        status: sourceNodeKinds.has(node.data.kind) ? 'success' : 'running',
        progress: sourceNodeKinds.has(node.data.kind) ? 100 : 16,
      }));
      setActiveRun((current) => current ? {
        ...current,
        nodes: current.nodes.map((nodeRun) => stageNodeIds.has(nodeRun.nodeId) ? {
          ...nodeRun,
          status: sourceNodeKinds.has(nodeRun.nodeKind as WorkflowNodeKind) ? 'success' : 'running',
          progress: sourceNodeKinds.has(nodeRun.nodeKind as WorkflowNodeKind) ? 100 : 16,
          startedAt: stageStartedAt,
          finishedAt: sourceNodeKinds.has(nodeRun.nodeKind as WorkflowNodeKind) ? stageStartedAt : undefined,
        } : nodeRun),
      } : current);
      await wait(stage === 'D' ? 760 : 460);
      stageNodes.forEach((node) => updateNodeData(node.id, { status: 'success', progress: 100, taskId: `dry-run-${Date.now()}-${node.id}` }));
      const stageFinishedAt = new Date().toISOString();
      setActiveRun((current) => {
        if (!current) return current;
        const updatedNodes = current.nodes.map((nodeRun) => stageNodeIds.has(nodeRun.nodeId) ? {
          ...nodeRun,
          status: 'success',
          progress: 100,
          startedAt: nodeRun.startedAt || stageStartedAt,
          finishedAt: nodeRun.finishedAt || stageFinishedAt,
        } : nodeRun);
        const completedNodes = updatedNodes.filter((nodeRun) => nodeRun.status === 'success').length;
        return {
          ...current,
          nodes: updatedNodes,
          completedNodes,
          progress: current.totalNodes ? Math.min(99, Math.round(completedNodes * 100 / current.totalNodes)) : 99,
        };
      });
    }
    setActiveRun((current) => current ? {
      ...current,
      status: 'success',
      progress: 100,
      completedNodes: current.totalNodes,
      finishedAt: new Date().toISOString(),
    } : current);
    setActiveStage('DONE');
    setResultOpen(true);
    message.success(`工作流校验通过：计划生成 ${productionSummary.materialCount} 个镜头素材，组装 ${productionSummary.outputCount} 条视频`);
  };

  const applyWorkflowRunEvent = useCallback((event: WorkflowRunEvent) => {
    const eventTime = new Date().toISOString();
    if (event.nodeId) {
      const outputUrl = typeof event.output?.assetUrl === 'string' ? event.output.assetUrl : undefined;
      const outputText = readTextOutput(event.output);
      updateNodeData(event.nodeId, {
        status: event.status === 'success' ? 'success' : event.status === 'failed' ? 'failed' : 'running',
        progress: event.progress ?? (event.status === 'success' ? 100 : 10),
        taskId: event.runId,
        ...(outputUrl ? { outputUrl } : {}),
        ...(outputText ? { outputText } : {}),
      });
      setActiveRun((current) => {
        if (!current) return current;
        const canvasNode = useWorkflowStore.getState().nodes.find((node) => node.id === event.nodeId);
        const existing = current.nodes.find((nodeRun) => nodeRun.nodeId === event.nodeId);
        const nextStatus = event.status || 'running';
        const nextNodeRun = {
          id: existing?.id || `live-${current.id}-${event.nodeId}`,
          nodeId: event.nodeId || '',
          nodeKind: existing?.nodeKind || canvasNode?.data.kind || 'unknown',
          skillCode: existing?.skillCode || canvasNode?.data.skillCode,
          skillVersion: existing?.skillVersion,
          status: nextStatus,
          attempt: event.type === 'NODE_RETRYING' ? (existing?.attempt || 1) + 1 : existing?.attempt || 1,
          progress: event.progress ?? existing?.progress ?? 0,
          outputJson: event.output ? JSON.stringify(event.output) : existing?.outputJson,
          errorCode: nextStatus === 'failed' ? 'NODE_FAILED' : existing?.errorCode,
          errorMessage: nextStatus === 'failed' ? event.message : existing?.errorMessage,
          startedAt: existing?.startedAt || eventTime,
          finishedAt: nextStatus === 'success' || nextStatus === 'failed' ? eventTime : existing?.finishedAt,
        };
        return {
          ...current,
          status: current.status === 'queued' ? 'running' : current.status,
          nodes: existing
            ? current.nodes.map((nodeRun) => nodeRun.nodeId === event.nodeId ? nextNodeRun : nodeRun)
            : [...current.nodes, nextNodeRun],
        };
      });
    }
    if (event.type === 'WORKFLOW_STARTED') {
      setActiveStage('AI');
      setActiveRun((current) => current ? { ...current, status: 'running', progress: event.progress ?? 1, startedAt: current.startedAt || eventTime } : current);
    }
    if (event.type === 'WORKFLOW_COMPLETED') {
      setActiveStage('DONE');
      setResultOpen(true);
      setActiveRun((current) => current ? { ...current, status: 'success', progress: 100, completedNodes: current.totalNodes, finishedAt: eventTime } : current);
    }
    if (event.type === 'WORKFLOW_FAILED') {
      setActiveRun((current) => current ? { ...current, status: 'failed', errorMessage: event.message, finishedAt: eventTime } : current);
    }
    if (event.type === 'WORKFLOW_CANCELED') {
      setActiveRun((current) => current ? { ...current, status: 'canceled', finishedAt: eventTime } : current);
    }
  }, [updateNodeData]);

  const runWorkflowPreview = async () => {
    if (workflowRunning) return;
    if (!nodes.length) return message.warning('画布中还没有可执行节点');
    const missingCreativeResource = nodes.find(node => isCreativeResourceType(node.data.kind)
      && !node.data.creativeResourceId && !isLegacyUploadedCharacterResource(node.data));
    if (missingCreativeResource && isCreativeResourceType(missingCreativeResource.data.kind)) {
      message.warning(`请先为「${missingCreativeResource.data.title}」选择已发布资源`);
      openCreativeLibrary(missingCreativeResource.data.kind, { nodeId: missingCreativeResource.id });
      return;
    }
    const unfinishedDirector = nodes.find((node) => node.data.kind === 'director' && !(node.data.outputUrl || node.data.assetUrl));
    if (unfinishedDirector) {
      message.warning(`请先打开「${unfinishedDirector.data.title}」，导出机位截图后再运行工作流`);
      openDirector(unfinishedDirector.id);
      return;
    }
    setWorkflowRunning(true);
    setResultOpen(false);
    let remoteRunId: string | null = null;
    try {
      const currentProjectId = await ensureProjectId();
      const currentState = useWorkflowStore.getState();
      const graphJson = JSON.stringify({
        nodes: currentState.nodes.map((node) => ({ ...node, selected: false })),
        edges: currentState.edges.map((edge) => ({ ...edge, selected: false })),
      });
      const validation = await workflowApi.validate(currentProjectId, graphJson);
      if (!validation.valid) throw new Error(validation.errors[0] || '工作流校验失败');
      const saved = await workflowApi.save(currentProjectId, {
        name: `${projectTitle} · 产品视频生产工作流`,
        mode,
        graphJson,
      });
      const run = await workflowApi.startRun(currentProjectId, {
        workflowId: saved.id,
        workflowVersion: saved.version,
        mode,
        graphJson,
        idempotencyKey: `canvas-${currentProjectId}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      });
      remoteRunId = run.id;
      setActiveRun(run);
      setActiveRunProjectId(currentProjectId);
      setRunMonitorOpen(true);
      useWorkflowStore.setState((state) => ({
        nodes: state.nodes.map((node) => ({
          ...node,
          data: { ...node.data, status: 'queued', progress: 0, taskId: run.id },
        })),
      }));
      const controller = new AbortController();
      workflowRunAbortRef.current?.abort();
      workflowRunAbortRef.current = controller;
      let terminalStatus: 'success' | 'failed' | 'canceled' | null = null;
      await workflowApi.subscribeToRunEvents(currentProjectId, run.id, (event) => {
        applyWorkflowRunEvent(event);
        if (event.type === 'WORKFLOW_COMPLETED') terminalStatus = 'success';
        if (event.type === 'WORKFLOW_FAILED') terminalStatus = 'failed';
        if (event.type === 'WORKFLOW_CANCELED') terminalStatus = 'canceled';
      }, controller.signal);
      const latestRun = await workflowApi.getRun(currentProjectId, run.id);
      setActiveRun(latestRun);
      latestRun.nodes.forEach((nodeRun) => {
        let outputUrl: string | undefined;
        let outputText: string | undefined;
        if (nodeRun.outputJson) {
          try {
            const output = JSON.parse(nodeRun.outputJson) as Record<string, unknown>;
            if (typeof output.assetUrl === 'string') outputUrl = output.assetUrl;
            outputText = readTextOutput(output);
          } catch {
            outputUrl = undefined;
            outputText = undefined;
          }
        }
        updateNodeData(nodeRun.nodeId, {
          status: nodeRun.status === 'success' ? 'success' : nodeRun.status === 'failed' ? 'failed' : 'running',
          progress: nodeRun.progress,
          taskId: run.id,
          ...(outputUrl ? { outputUrl } : {}),
          ...(outputText ? { outputText } : {}),
        });
      });
      if (latestRun.status === 'success') terminalStatus = 'success';
      if (latestRun.status === 'failed') terminalStatus = 'failed';
      if (latestRun.status === 'canceled') terminalStatus = 'canceled';
      if (terminalStatus === 'failed') throw new Error('Python 工作流执行失败');
      if (terminalStatus === 'canceled') message.info('工作流已取消');
      if (terminalStatus === 'success') {
        message.success(`真实工作流执行完成：${validation.nodeCount} 个节点已按依赖运行`);
      }
    } catch (error) {
      if (remoteRunId || !config.useMock) {
        message.error(error instanceof Error ? error.message : '工作流执行失败');
      } else {
        message.warning('工作流后端暂不可用，已切换到本地演示运行');
        await runLocalWorkflowPreview();
      }
    } finally {
      workflowRunAbortRef.current = null;
      setWorkflowRunning(false);
      window.setTimeout(() => setActiveStage(null), 1400);
    }
  };

  const resetProductionTemplate = () => Modal.confirm({
    title: '重置产品视频 Demo？',
    content: '将恢复为精简演示工作流；当前画布仍可通过撤销恢复。',
    okText: '重置 Demo',
    cancelText: '取消',
    onOk: () => {
      createVideoProductionDraft();
      window.setTimeout(() => fitView({ padding: 0.1, minZoom: 0.18, maxZoom: 0.78, duration: 520 }), 40);
      message.success('已恢复产品视频画布 Demo');
    },
  });

  const showCreativeLibrary = (type: CreativeResourceType, position?: { x: number; y: number }) => {
    const selected = nodes.find(node => node.selected && (node.data.kind === 'image' || node.data.kind === 'video'));
    openCreativeLibrary(type, { position, targetNodeId: selected?.id });
    setLibraryOpen(false); setLibraryAnchor(null); setContextMenu(null);
  };

  return (
    <section className="visual-canvas-panel" ref={wrapperRef}>
      {creativeLibraryRequest ? <Suspense fallback={null}>
        <CreativeResourceLibrary key={userId || 'anonymous'} initialType={creativeLibraryRequest.type} userId={userId}
          targetName={nodes.find(node => node.id === creativeLibraryRequest.targetNodeId)?.data.title}
          replacing={Boolean(creativeLibraryRequest.nodeId)}
          replacementViewLabel={creativeLibraryRequest.nodeId ? nodes.find(node => node.id === creativeLibraryRequest.nodeId)?.data.resourceViewLabel : undefined}
          onClose={closeCreativeLibrary}
          onApply={resource => {
            const state = useWorkflowStore.getState();
            if (state.projectKey !== creativeLibraryRequest.projectKey) throw new Error('当前项目已切换，请重新选择资源');
            const beforeIds = new Set(state.nodes.map(node => node.id));
            const bounds = wrapperRef.current?.getBoundingClientRect();
            const position = creativeLibraryRequest.position || (bounds ? screenToFlowPosition({ x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }) : undefined);
            const firstId = state.applyCreativeResource(resource, { ...creativeLibraryRequest, position });
            const focusNodes = useWorkflowStore.getState().nodes.filter(node => node.id === firstId || !beforeIds.has(node.id));
            if (resource.type === 'character') {
              // New React Flow nodes may not be measured yet. Fit the known card bounds,
              // including every row, rather than fitting stale node dimensions.
              const x = Math.min(...focusNodes.map(node => node.position.x));
              const y = Math.min(...focusNodes.map(node => node.position.y));
              const right = Math.max(...focusNodes.map(node => node.position.x + 304));
              const bottom = Math.max(...focusNodes.map(node => node.position.y + 300));
              void fitBounds({ x: x - 60, y: y - 90, width: right - x + 120, height: bottom - y + 180 }, { duration: 350, padding: .15 });
            } else {
              window.requestAnimationFrame(() => { void fitView({ nodes: focusNodes, padding: .22, minZoom: .18, maxZoom: .85, duration: 350 }); });
            }
            message.success(resource.type === 'character' ? focusNodes.length > 1 ? `已展开「${resource.name}」的全部 ${focusNodes.length} 张图片，可逐张删除` : '已应用当前角色图片' : creativeLibraryRequest.nodeId ? '已替换当前资源，其它节点保持不变' : `已将「${resource.name}」应用到画布`);
          }} />
      </Suspense> : null}
      {activeDirectorNodeId ? createPortal(
        <Suspense fallback={
          <div className="director-studio-loading" role="status">
            <span><CanvasIcon name="LoadingOutlined" spin /> 正在加载 3D 导演台…</span>
            <button type="button" onClick={closeDirector}>返回画布</button>
          </div>
        }>
          <DirectorStudio nodeId={activeDirectorNodeId} onClose={closeDirector} />
        </Suspense>,
        document.body,
      ) : null}
      <div className="workflow-canvas-stage">
        <div className="workflow-flow-wrap" onDoubleClick={event => {
          if ((event.target as HTMLElement).classList.contains('react-flow__pane')) {
            openLibraryAtContext(menuPosition(event));
          }
        }} onDrop={handleDrop} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}>
          <ReactFlow<WorkflowNode>
            nodes={canvasNodes}
            edges={canvasEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            connectionMode={ConnectionMode.Loose}
            onNodeDragStart={handleNodeDragStart}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={(event, node) => {
              if (node.data.kind === 'director' && !canvasSelection) {
                event.preventDefault();
                openDirector(node.id);
              }
            }}
            onNodeContextMenu={handleNodeContextMenu}
            onPaneContextMenu={handlePaneContextMenu}
            onPaneClick={() => { setContextMenu(null); setLibraryAnchor(null); setLibraryOpen(false); setMoreOpen(false); }}
            onMoveStart={() => setContextMenu(null)}
            onMove={(_event, viewport) => { updateSelectionEditorAnchor(); setCanvasZoom(viewport.zoom); }}
            isValidConnection={isValidConnection}
            deleteKeyCode={null}
            selectionOnDrag={!canvasSelection && activeTool === 'select'}
            panOnDrag={activeTool === 'pan' ? true : [1, 2]}
            nodesDraggable={!canvasSelection}
            nodesConnectable={!canvasSelection}
            panOnScroll
            zoomOnDoubleClick={false}
            minZoom={0.18}
            maxZoom={1.8}
            connectionLineStyle={{ stroke: '#88bfff', strokeWidth: 2 }}
            defaultEdgeOptions={{ type: 'default', animated: false }}
            proOptions={{ hideAttribution: true }}
          >
            {showMinimap ? (
              <MiniMap
                className="workflow-minimap"
                position="bottom-left"
                ariaLabel="画布小地图"
                pannable
                zoomable
                onClick={navigateMinimap}
                onNodeClick={focusMinimapNode}
                nodeStrokeColor="#a6a6a6"
                nodeStrokeWidth={1}
                maskStrokeColor="#858585"
                maskStrokeWidth={1}
                nodeColor={(node) => {
                  const kind = (node.data as { kind?: WorkflowNodeKind })?.kind;
                  if (kind === 'image' || kind === 'result') return '#e8e8e8';
                  if (kind === 'video') return '#f1c06e';
                  if (kind === 'prompt') return '#8bc9ed';
                  if (kind === 'editor' || kind === 'export') return '#8ee8b0';
                  if (kind === 'categorySkill') return '#f0c66d';
                  return '#8d9295';
                }}
                maskColor="rgba(8, 8, 8, .72)"
              />
            ) : null}
          </ReactFlow>

          {showMinimap ? <>
            <div className="canvas-minimap-hint">点击定位 · 拖动平移 · 滚轮缩放</div>
            {!nodes.some(node => !node.hidden) ? <div className="canvas-minimap-empty">添加节点后显示概览</div> : null}
          </> : null}

          {selectedEditorNode && selectionEditorAnchor && !canvasSelection ? (
            <div
              className={`workflow-editor-overlay kind-${selectedEditorNode.data.kind}`}
              style={{ left: selectionEditorAnchor.left, top: selectionEditorAnchor.top, width: selectionEditorAnchor.width }}
              onMouseDown={(event) => event.stopPropagation()}
              onWheel={(event) => event.stopPropagation()}
            >
              <WorkflowNodeSelectionEditor id={selectedEditorNode.id} data={selectedEditorNode.data} onStartCanvasSelection={startCanvasSelection} />
            </div>
          ) : null}

          {canvasSelection ? (
            <>
              <div className="workflow-canvas-selection-shade" aria-hidden="true" />
              <div className={`workflow-canvas-selection-banner mode-${canvasSelection.mode}`} role="status">
                <span>{canvasSelection.mode === 'reference' ? <CanvasIcon name="PictureOutlined" /> : <CanvasIcon name="TagsOutlined" />}</span>
                <p>
                  <strong>{canvasSelection.mode === 'reference' ? '从画布选择参考' : '元素选择模式'}</strong>
                  <small>{canvasSelection.mode === 'reference' ? canvasSelection.role ? `选择一张${canvasSelection.role === 'firstFrame' ? '首帧' : '尾帧'}图片` : '点击画布中的资源节点，可多选' : '点击图片选择局部元素'}</small>
                </p>
                <button type="button" onClick={finishReferenceSelection}>返回节点</button>
                <button
                  type="button"
                  aria-label="退出选择模式"
                  onClick={() => { keepOriginSelected(canvasSelection.originNodeId); setCanvasSelection(null); }}
                ><CanvasIcon name="CloseOutlined" /></button>
              </div>
              <div className="workflow-canvas-selection-tip">
                {canvasSelection.mode === 'reference' ? <><CanvasIcon name="PlusOutlined" />在当前画布中添加参考</> : <><CanvasIcon name="TagsOutlined" />选择图片后标记产品、文字或背景</>}
              </div>
            </>
          ) : null}

          {markTargetNode ? (
            <WorkflowMarkSelector
              node={markTargetNode}
              selectedParts={selectedMarkParts}
              onTogglePart={(part) => setSelectedMarkParts((parts) => parts.includes(part) ? parts.filter((item) => item !== part) : [...parts, part])}
              onCancel={() => { setMarkTargetNodeId(null); setSelectedMarkParts([]); }}
              onConfirm={confirmMarkSelection}
            />
          ) : null}

          {selectedResourceNode ? (
            <WorkflowResourceInspector
              node={selectedResourceNode}
              onClose={clearSelection}
              onChange={(patch) => updateNodeData(selectedResourceNode.id, patch)}
              onRun={() => useWorkflowStore.getState().requestRun(selectedResourceNode.id)}
              onPreview={() => setResultOpen(true)}
            />
          ) : null}

          <WorkflowRunMonitor
            open={runMonitorOpen}
            run={activeRun}
            canvasNodes={nodes}
            onClose={() => setRunMonitorOpen(false)}
          />

          {resultOpen && !runMonitorOpen ? (
            <aside className="workflow-result-tray" aria-label="成片结果">
              <header>
                <div><small>DEMO OUTPUT</small><strong>15 条视频已完成</strong></div>
                <button type="button" aria-label="关闭成片结果" onClick={() => setResultOpen(false)}><CanvasIcon name="CloseOutlined" /></button>
              </header>
              <div className="workflow-result-grid">
                {['卖点直给版', '场景种草版', '成分专业版'].map((name, index) => (
                  <button type="button" key={name} onClick={() => message.success(`正在预览：${name}`)}>
                    <span><CanvasIcon name="VideoCameraOutlined" /><em>0{index + 1}</em><i>{index === 0 ? '00:28' : index === 1 ? '00:32' : '00:25'}</i></span>
                    <strong>{name}</strong><small>9:16 · 1080P</small>
                  </button>
                ))}
              </div>
              <footer>
                <button type="button" onClick={() => message.info('Demo 已模拟打包 15 条成片')}><CanvasIcon name="DownloadOutlined" />批量导出</button>
                <button type="button" className="primary" onClick={() => message.success('正在预览第一条成片')}><CanvasIcon name="EyeOutlined" />预览成片</button>
              </footer>
            </aside>
          ) : null}

          {libraryOpen ? (
            <div
              className={`workflow-library-popover${libraryAnchor ? ' is-context' : ''}`}
              style={libraryAnchor ? { left: libraryAnchor.x, top: libraryAnchor.y } : undefined}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <NodeLibrary
                onOpenResourceLibrary={type => showCreativeLibrary(type, libraryAnchor?.flowPosition)}
                onAddNode={(kind) => {
                  const nodeId = addNode(kind, libraryAnchor?.flowPosition);
                  setLibraryOpen(false);
                  setLibraryAnchor(null);
                  if (kind === 'director') openDirector(nodeId);
                }}
                onUnavailable={(label) => message.info(`${label}节点正在接入 Provider，当前可先使用视频或提示词节点`)}
              />
            </div>
          ) : null}

          {contextMenu ? (
            <div
              className="workflow-context-menu"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              role="menu"
              onMouseDown={(event) => event.stopPropagation()}
            >
              {contextMenu.nodeId ? (
                <>
                  <button onClick={() => { message.success('节点配置已保存到当前画布'); setContextMenu(null); }}><CanvasIcon name="SaveOutlined" /><span>保存到我的资产</span></button>
                  <button onClick={() => showCreativeLibrary('character', contextMenu.flowPosition)}><CanvasIcon name="RobotOutlined" /><span>角色库</span></button>
                  <i />
                  <button onClick={() => { copySelection(); setContextMenu(null); }}><CanvasIcon name="CopyOutlined" /><span>复制节点</span><kbd>⌘C</kbd></button>
                  <button onClick={() => { duplicateSelection(); setContextMenu(null); }}><CanvasIcon name="PlusOutlined" /><span>创建副本</span><kbd>⌘D</kbd></button>
                  <button onClick={() => { pasteClipboard(contextMenu.flowPosition); setContextMenu(null); }}><CanvasIcon name="AppstoreOutlined" /><span>粘贴</span><kbd>⌘V</kbd></button>
                  <button className="is-danger" onClick={() => { deleteSelection(); setContextMenu(null); }}><CanvasIcon name="DeleteOutlined" /><span>删除</span><kbd>⌫</kbd></button>
                </>
              ) : (
                <>
                  <button onClick={() => { addNode('product', contextMenu.flowPosition); setContextMenu(null); }}><CanvasIcon name="PictureOutlined" /><span>上传产品素材</span></button>
                  <button onClick={() => showCreativeLibrary('character', contextMenu.flowPosition)}><CanvasIcon name="RobotOutlined" /><span>角色库</span></button>
                  <button onClick={() => showCreativeLibrary('style', contextMenu.flowPosition)}><CanvasIcon name="PictureOutlined" /><span>风格库</span></button>
                  <button onClick={() => showCreativeLibrary('effect', contextMenu.flowPosition)}><CanvasIcon name="ThunderboltOutlined" /><span>特效库</span></button>
                  <button onClick={() => {
                    const nodeId = addNode('director', contextMenu.flowPosition);
                    setContextMenu(null);
                    openDirector(nodeId);
                  }}><CanvasIcon name="VideoCameraOutlined" /><span>创建导演台</span></button>
                  <button onClick={() => openLibraryAtContext(contextMenu)}><CanvasIcon name="PlusOutlined" /><span>添加节点</span></button>
                  <i />
                  <button disabled={!pastCount} onClick={() => { undo(); setContextMenu(null); }}><CanvasIcon name="UndoOutlined" /><span>撤销</span><kbd>⌘Z</kbd></button>
                  <button disabled={!futureCount} onClick={() => { redo(); setContextMenu(null); }}><CanvasIcon name="RedoOutlined" /><span>重做</span><kbd>⇧⌘Z</kbd></button>
                  <button onClick={() => { pasteClipboard(contextMenu.flowPosition); setContextMenu(null); }}><CanvasIcon name="CopyOutlined" /><span>粘贴</span><kbd>⌘V</kbd></button>
                  <button onClick={() => { selectAll(); setContextMenu(null); }}><CanvasIcon name="DragOutlined" /><span>全选节点</span><kbd>⌘A</kbd></button>
                  <button onClick={() => { arrangeNodes(); setContextMenu(null); }}><CanvasIcon name="Arrange" /><span>整理画布</span></button>
                  <button onClick={() => { fitView({ padding: 0.14, duration: 420 }); setContextMenu(null); }}><CanvasIcon name="AimOutlined" /><span>适配画布</span></button>
                </>
              )}
            </div>
          ) : null}

          {!nodes.length ? (
            <div className="workflow-empty-canvas">
              <p><CanvasIcon name="Cursor" />双击画布，自由添加节点</p>
              <div className="canvas-quick-start" aria-label="开始创作">
                {([
                  { kind: 'image', icon: 'Image', label: '图片生成' },
                  { kind: 'video', icon: 'Video', label: '视频生成' },
                  { kind: 'music', icon: 'Music', label: '音频生成' },
                  { kind: 'text', icon: 'Text', label: '脚本生成' },
                  { kind: 'editor', icon: 'Edit', label: '智能剪辑' },
                ] as const).map(item => <button type="button" key={item.kind} onClick={() => {
                  const rect = wrapperRef.current?.getBoundingClientRect();
                  const position = rect ? screenToFlowPosition({ x: rect.left + rect.width / 2 - 150, y: rect.top + rect.height / 2 - 130 }) : undefined;
                  addNode(item.kind, position);
                }}><span><CanvasIcon name={item.icon} /></span>{item.label}</button>)}
              </div>
            </div>
          ) : null}

          {agentOpen ? (
            <div className="workflow-agent-bar">
              <span className="workflow-agent-avatar"><CanvasIcon name="RobotOutlined" /></span>
              <input
                autoFocus
                value={agentPrompt}
                onChange={(event) => setAgentPrompt(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') submitAgentDraft(); }}
                placeholder="描述你的创意，自动搭建图片或视频工作流…"
              />
              <button onClick={submitAgentDraft}><CanvasIcon name="SendOutlined" />发送</button>
            </div>
          ) : null}
        </div>

        <div className="workflow-canvas-chrome" aria-label="画布固定工具层">
          <header className="workflow-canvas-header">
            <div className="canvas-project-controls">
              <div className="workflow-canvas-title" title={projectTitle}>
                <CanvasIcon name="Video" className="workflow-canvas-brand" />
                <strong>{projectTitle}</strong>
                <i />
                <span>{mode === 'image' ? '画布 1' : '视频画布 1'}</span>
              </div>
              <button type="button" aria-label="更多画布操作" aria-expanded={moreOpen} onClick={() => { setMoreOpen(value => !value); setLibraryOpen(false); }} title="更多操作"><CanvasIcon name="More" /></button>
            </div>
            <div className="workflow-header-actions">
              {activeStage ? <span className={`workflow-active-stage${activeStage === 'DONE' ? ' is-done' : ''}`}>{activeStage === 'DONE' ? '已完成' : `${activeStage} 阶段`}</span> : null}
              <span className="workflow-save-state"><CanvasIcon name="CloudOutlined" />已保存</span>
              <button type="button" aria-label="分享画布" onClick={() => { void navigator.clipboard?.writeText(window.location.href); message.success('画布链接已复制'); }} title="分享画布"><CanvasIcon name="ShareAltOutlined" /></button>
              <button type="button" aria-label="素材库" onClick={() => showCreativeLibrary('character')} title="角色、风格与特效库"><CanvasIcon name="Cube" /></button>
              <button type="button" className="workflow-run-all-button" aria-label="运行完整工作流" disabled={workflowRunning || !nodes.length} onClick={() => { void runWorkflowPreview(); }} title="运行完整工作流">
                <CanvasIcon name={workflowRunning ? 'LoadingOutlined' : 'PlayCircleFilled'} spin={workflowRunning} /><span>{workflowRunning ? '执行中' : '运行工作流'}</span>
              </button>
              <button type="button" className={`workflow-monitor-trigger${runMonitorOpen ? ' active' : ''}`} aria-label="执行监控" aria-pressed={runMonitorOpen} onClick={() => setRunMonitorOpen(value => !value)} title="执行状态与耗时">
                <CanvasIcon name="DashboardOutlined" />{activeRun ? <i className={`is-${activeRun.status}`} /> : null}
              </button>
              <button type="button" aria-label="画布助手" className={agentOpen ? 'active canvas-agent-trigger' : 'canvas-agent-trigger'} aria-pressed={agentOpen} onClick={() => setAgentOpen(value => !value)} title="Agent 画布助手"><CanvasIcon name="RobotOutlined" /><span>Agent</span></button>
            </div>
          </header>

          {moreOpen ? <div className="canvas-more-menu" role="menu" aria-label="画布操作" onKeyDown={event => {
            if (event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setMoreOpen(false);
              wrapperRef.current?.querySelector<HTMLButtonElement>('button[aria-label="更多画布操作"]')?.focus();
              return;
            }
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            event.stopPropagation();
            const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
            const index = items.indexOf(document.activeElement as HTMLButtonElement);
            const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1
              : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
            items[next]?.focus();
          }}>
            <button type="button" role="menuitem" onClick={() => { void saveWorkflow(); setMoreOpen(false); }}><CanvasIcon name="SaveOutlined" />保存画布<kbd>⌘S</kbd></button>
            <button type="button" role="menuitem" disabled={!selectedCount} onClick={() => { duplicateSelection(); setMoreOpen(false); }}><CanvasIcon name="CopyOutlined" />复制所选节点<kbd>⌘D</kbd></button>
            <button type="button" role="menuitem" disabled={!selectedCount} onClick={() => { deleteSelection(); setMoreOpen(false); }}><CanvasIcon name="DeleteOutlined" />删除所选节点<kbd>⌫</kbd></button>
            <div className="canvas-menu-divider" />
            <button type="button" role="menuitem" disabled={!pastCount} onClick={undo}><CanvasIcon name="UndoOutlined" />撤销<kbd>⌘Z</kbd></button>
            <button type="button" role="menuitem" disabled={!futureCount} onClick={redo}><CanvasIcon name="RedoOutlined" />重做<kbd>⇧⌘Z</kbd></button>
            <button type="button" role="menuitem" onClick={() => { arrangeNodes(); setMoreOpen(false); }}><CanvasIcon name="Arrange" />整理画布</button>
            <div className="canvas-menu-divider" />
            <button type="button" role="menuitem" onClick={() => { resetProductionTemplate(); setMoreOpen(false); }}><CanvasIcon name="ThunderboltOutlined" />恢复视频 Demo</button>
            <button type="button" role="menuitem" className="is-danger" onClick={() => { setMoreOpen(false); Modal.confirm({ title: '清空当前画布？', content: '可以通过撤销恢复本次清空。', okText: '清空', cancelText: '取消', onOk: clearCanvas }); }}><CanvasIcon name="ClearOutlined" />清空画布</button>
          </div> : null}

          <div className="canvas-bottom-status" aria-label="画布导航与缩放">
            <button type="button" aria-label="资产管理" onClick={() => showCreativeLibrary('character')}><CanvasIcon name="Assets" /><span>资产管理</span></button>
            <span className="canvas-status-divider" />
            <Tooltip title="整理画布" placement="top" overlayClassName="canvas-navigation-tooltip">
              <button type="button" aria-label="整理画布" onClick={arrangeNodes}><CanvasIcon name="Arrange" /></button>
            </Tooltip>
            <Tooltip title="小地图" placement="top" overlayClassName="canvas-navigation-tooltip">
              <button type="button" aria-label="小地图" aria-pressed={showMinimap} onClick={() => setShowMinimap(value => !value)}><CanvasIcon name="Minimap" /></button>
            </Tooltip>
            <button type="button" aria-label="适配画布" onClick={() => fitView({ padding: 0.16, duration: 420 })} title="适配画布"><CanvasIcon name="AimOutlined" /></button>
            <button type="button" aria-label="恢复百分之百缩放" onClick={() => zoomTo(1, { duration: 250 })} title="恢复 100% 缩放">{Math.round(canvasZoom * 100)}%</button>
          </div>

          <div className="workflow-floating-tools" aria-label="画布工具">
            <button type="button" aria-label="添加节点" aria-expanded={libraryOpen} className={`workflow-add-node-button${libraryOpen ? ' active' : ''}`} onClick={() => { setLibraryAnchor(null); setContextMenu(null); setMoreOpen(false); setLibraryOpen(value => !value); }} title="添加节点"><CanvasIcon name={libraryOpen ? 'CloseOutlined' : 'PlusOutlined'} /></button>
            <button type="button" aria-label="选择工具" aria-pressed={activeTool === 'select'} className={activeTool === 'select' ? 'active' : ''} onClick={() => setActiveTool('select')} title="选择节点"><CanvasIcon name="Cursor" /></button>
            <button type="button" aria-label="移动画布" aria-pressed={activeTool === 'pan'} className={activeTool === 'pan' ? 'active' : ''} onClick={() => setActiveTool('pan')} title="移动画布"><CanvasIcon name="Hand" /></button>
            <button type="button" aria-label="连接节点" onClick={() => message.info('拖动节点左右两侧连接点，即可连接节点')} title="连接节点"><CanvasIcon name="NodeIndexOutlined" /></button>
            <button type="button" aria-label="素材与图片" onClick={() => showCreativeLibrary('character')} title="创意资源库"><CanvasIcon name="Cube" /></button>
            <button type="button" aria-label="打开导演台" onClick={() => {
              const existing = nodes.find(node => node.data.kind === 'director');
              openDirector(existing?.id || addNode('director'));
            }} title="导演台"><CanvasIcon name="VideoCameraOutlined" /></button>
            <span className="workflow-tool-divider" />
            <button type="button" aria-label="历史记录" onClick={() => { setMoreOpen(value => !value); setLibraryOpen(false); }} title="历史与撤销"><CanvasIcon name="HistoryOutlined" /></button>
            <button type="button" aria-label="快捷键" onClick={showShortcutHelp} title="快捷键"><CanvasIcon name="Keyboard" /></button>
            <button type="button" aria-label="帮助" onClick={() => message.info('双击或右键画布添加节点；选中创作节点编辑提示词与参数，拖动两侧连接点建立工作流。')} title="帮助"><CanvasIcon name="QuestionCircleOutlined" /></button>
          </div>
        </div>
      </div>
    </section>
  );
};

const VisualCanvasPanel = (props: VisualCanvasPanelProps) => (
  <ReactFlowProvider>
    <VisualCanvasWorkspace {...props} />
  </ReactFlowProvider>
);

export default VisualCanvasPanel;
