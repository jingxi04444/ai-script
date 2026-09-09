import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AimOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  ClearOutlined,
  CloseOutlined,
  CloudOutlined,
  CopyOutlined,
  DeleteOutlined,
  DashboardOutlined,
  DownloadOutlined,
  DragOutlined,
  EyeOutlined,
  HistoryOutlined,
  LayoutOutlined,
  LoadingOutlined,
  NodeIndexOutlined,
  PictureOutlined,
  PlayCircleFilled,
  PlusOutlined,
  QuestionCircleOutlined,
  RedoOutlined,
  RobotOutlined,
  SaveOutlined,
  SendOutlined,
  ShareAltOutlined,
  ShopOutlined,
  TagsOutlined,
  ThunderboltOutlined,
  UndoOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { message, Modal } from 'antd';
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
import { generationApi } from '../../../api/generation';
import { workflowApi } from '../../../api/workflow';
import { useWorkflowStore } from '../../../stores/workflowStore';
import { useAuthStore } from '../../../stores/authStore';
import { config } from '../../../config';
import { isCreativeResourceType, isLegacyUploadedCharacterResource, type CreativeResourceType } from '../../../types/creativeResource';
import type { WorkflowEdge, WorkflowMode, WorkflowNode, WorkflowNodeKind, WorkflowRun, WorkflowRunEvent } from '../../../types/workflow';
import NodeLibrary from './NodeLibrary';
import WorkflowNodeCard, { isWorkflowEditorKind, WorkflowNodeSelectionEditor } from './WorkflowNodeCard';
import WorkflowMarkSelector from './WorkflowMarkSelector';
import WorkflowResourceInspector from './WorkflowResourceInspector';
import WorkflowRunMonitor from './WorkflowRunMonitor';
import './visual-canvas-panel.css';

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
}

const referenceEligibleKinds = new Set<WorkflowNodeKind>([
  'storyboard', 'character', 'style', 'effect', 'scene', 'product', 'director', 'categorySkill', 'prompt', 'image', 'batchMaterial', 'result', 'video', 'editor', 'export',
]);

const markEligibleKinds = new Set<WorkflowNodeKind>(['character', 'scene', 'product', 'image', 'result']);

const VisualCanvasWorkspace = ({ mode, projectId, projectTitle = '未命名工作区', ensureProjectId }: VisualCanvasPanelProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const persistTimerRef = useRef<number>();
  const localPersistFailedRef = useRef(false);
  const clipboardRef = useRef<WorkflowClipboard | null>(null);
  const workflowRunAbortRef = useRef<AbortController | null>(null);
  const [agentPrompt, setAgentPrompt] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
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
  const { fitView, fitBounds, screenToFlowPosition } = useReactFlow<WorkflowNode>();

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
    const eligibleKinds = canvasSelection.mode === 'mark' ? markEligibleKinds : referenceEligibleKinds;
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
    const preferredWidth = isVideoEditor ? 820 : 660;
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
    const estimatedHeight = renderedEditorHeight || (selectedEditorNodeKind === 'text' ? 250
      : isVideoEditor ? 300 : 250);
    const below = nodeRect.bottom - wrapperRect.top + 8;
    const above = nodeRect.top - wrapperRect.top - estimatedHeight - 8;
    const bottomReserve = 72;
    const top = below + estimatedHeight <= wrapperRect.height - bottomReserve ? below : Math.max(16, above);
    setSelectionEditorAnchor({ left, top, width });
  }, [selectedEditorNodeId, selectedEditorNodeKind]);

  useLayoutEffect(() => {
    const frame = window.requestAnimationFrame(updateSelectionEditorAnchor);
    return () => window.cancelAnimationFrame(frame);
  }, [selectedEditorNode?.position.x, selectedEditorNode?.position.y, updateSelectionEditorAnchor]);

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
  }, [selectedEditorNodeId, selectedEditorNodeKind, updateSelectionEditorAnchor]);

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
    window.setTimeout(() => fitView({ padding: 0.1, minZoom: 0.18, maxZoom: 0.82, duration: 520 }), 80);
  }, [fitView, load, mode, projectId]);

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
      updateNodeData(node.id, { status: 'running', progress: 18, taskId: undefined });
      try {
        if (node.data.kind === 'text') {
          await wait(520);
          updateNodeData(node.id, {
            status: 'success',
            progress: 100,
            taskId: `preview-text-${Date.now()}`,
            outputText: '这是文本模型返回结果的演示位置。接入并启动真实模型服务后，这里会显示模型生成的完整文本，而输入指令仍保留在下方编辑框中。',
          });
          message.success('文本生成完成，结果已写回节点');
          return;
        }
        if (node.data.kind === 'image') {
          await wait(680);
          updateNodeData(node.id, {
            status: 'success',
            progress: 100,
            taskId: `preview-image-${Date.now()}`,
            outputUrl: '/demo-media/skincare-lifestyle.jpg',
          });
          message.success('图片生成完成，已写回画布节点');
          return;
        }
        if (node.data.kind === 'video') {
          const currentProjectId = await ensureProjectId();
          const result = await generationApi.generateVideo({
            projectId: currentProjectId,
            prompt: node.data.prompt,
            durationSeconds: node.data.durationSeconds || 5,
            tagsJson: JSON.stringify({
              source: 'visual-canvas',
              nodeId: node.id,
              model: node.data.model,
              batchSize: node.data.batchSize,
            }),
          });
          updateNodeData(node.id, { status: 'queued', progress: 28, taskId: result.taskId || result.id });
          message.success('视频镜头已进入 Provider 生成队列');
          return;
        }
        if (node.data.kind === 'voice') {
          const currentProjectId = await ensureProjectId();
          const result = await generationApi.createDubbing({
            projectId: currentProjectId,
            text: node.data.prompt || '读取上游脚本生成口播音轨',
            mode: 'tts',
            voice: node.data.voice,
            speed: node.data.speed,
          });
          updateNodeData(node.id, { status: 'queued', progress: 28, taskId: result.taskId || result.id });
          message.success('配音任务已进入生成队列');
          return;
        }
        await wait(520);
        updateNodeData(node.id, { status: 'success', progress: 100, taskId: `preview-${Date.now()}` });
        message.success(`${node.data.title}试运行完成`);
      } catch {
        updateNodeData(node.id, { status: 'failed', progress: 0 });
        message.error(`${node.data.title}运行失败`);
      }
    };
    void runNode();
  }, [consumeRunRequest, ensureProjectId, openCreativeLibrary, openDirector, pendingRunNodeId, updateNodeData]);

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

  const startCanvasSelection = useCallback((mode: 'reference' | 'mark') => {
    if (!selectedEditorNode) return;
    setContextMenu(null);
    setLibraryOpen(false);
    setLibraryAnchor(null);
    setMarkTargetNodeId(null);
    setSelectedMarkParts([]);
    setCanvasSelection({
      mode,
      originNodeId: selectedEditorNode.id,
      selectedNodeIds: mode === 'reference' ? selectedEditorNode.data.referenceNodeIds || [] : [],
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
    const eligibleKinds = canvasSelection.mode === 'mark' ? markEligibleKinds : referenceEligibleKinds;
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
          : [...current.selectedNodeIds, node.id],
      };
    });
  }, [canvasSelection, keepOriginSelected, nodes]);

  const finishReferenceSelection = useCallback(() => {
    if (!canvasSelection) return;
    if (canvasSelection.mode === 'reference') {
      const selectedIds = new Set(canvasSelection.selectedNodeIds);
      updateNodeData(canvasSelection.originNodeId, {
        referenceNodeIds: canvasSelection.selectedNodeIds,
        referenceLabels: nodes.filter((node) => selectedIds.has(node.id)).map((node) => node.data.title),
      });
      message.success(canvasSelection.selectedNodeIds.length ? `已添加 ${canvasSelection.selectedNodeIds.length} 个画布参考` : '已清空画布参考');
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
    setLibraryAnchor({
      ...menu,
      x: Math.max(10, Math.min(menu.x, maxWidth - 258)),
      y: Math.max(10, Math.min(menu.y, maxHeight - Math.min(520, maxHeight - 20))),
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
    checkpoint();
    const columnOrder: Record<WorkflowNodeKind, number> = {
      storyboard: 0,
      scriptGenerator: 1,
      text: 1,
      character: 0,
      style: 0,
      effect: 0,
      scene: 0,
      director: 1,
      product: 0,
      note: 0,
      music: 2,
      categorySkill: 1,
      image: 1,
      prompt: 1,
      batchMaterial: 2,
      result: 1,
      video: 2,
      voice: 2,
      editor: 3,
      export: 4,
    };
    const nextYByColumn = new Map<number, number>();
    useWorkflowStore.setState((state) => ({
      nodes: state.nodes.map((node) => {
        const column = columnOrder[node.data.kind];
        const y = nextYByColumn.get(column) || 80;
        nextYByColumn.set(column, y + 250);
        return { ...node, position: { x: 90 + column * 350, y } };
      }),
    }));
    window.setTimeout(() => fitView({ padding: 0.16, duration: 480 }), 30);
  }, [checkpoint, fitView]);

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
            <span><LoadingOutlined spin /> 正在加载 3D 导演台…</span>
            <button type="button" onClick={closeDirector}>返回画布</button>
          </div>
        }>
          <DirectorStudio nodeId={activeDirectorNodeId} onClose={closeDirector} />
        </Suspense>,
        document.body,
      ) : null}
      <div className="workflow-canvas-stage">
        <div className="workflow-flow-wrap" onDrop={handleDrop} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}>
          <ReactFlow<WorkflowNode>
            nodes={canvasNodes}
            edges={edges}
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
            onPaneClick={() => { setContextMenu(null); setLibraryAnchor(null); }}
            onMoveStart={() => setContextMenu(null)}
            onMove={updateSelectionEditorAnchor}
            isValidConnection={isValidConnection}
            deleteKeyCode={null}
            selectionOnDrag={!canvasSelection}
            nodesDraggable={!canvasSelection}
            nodesConnectable={!canvasSelection}
            panOnScroll
            minZoom={0.18}
            maxZoom={1.8}
            connectionLineStyle={{ stroke: '#88bfff', strokeWidth: 2 }}
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
            proOptions={{ hideAttribution: true }}
          >
            {showMinimap ? (
              <MiniMap
                className="workflow-minimap"
                pannable
                zoomable
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

          {selectedEditorNode && selectionEditorAnchor ? (
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
                <span>{canvasSelection.mode === 'reference' ? <PictureOutlined /> : <TagsOutlined />}</span>
                <p>
                  <strong>{canvasSelection.mode === 'reference' ? '从画布选择参考' : '元素选择模式'}</strong>
                  <small>{canvasSelection.mode === 'reference' ? '点击画布中的资源节点，可多选' : '点击图片选择局部元素'}</small>
                </p>
                <button type="button" onClick={finishReferenceSelection}>返回节点</button>
                <button
                  type="button"
                  aria-label="退出选择模式"
                  onClick={() => { keepOriginSelected(canvasSelection.originNodeId); setCanvasSelection(null); }}
                ><CloseOutlined /></button>
              </div>
              <div className="workflow-canvas-selection-tip">
                {canvasSelection.mode === 'reference' ? <><PlusOutlined />在当前画布中添加参考</> : <><TagsOutlined />选择图片后标记产品、文字或背景</>}
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
                <button type="button" aria-label="关闭成片结果" onClick={() => setResultOpen(false)}><CloseOutlined /></button>
              </header>
              <div className="workflow-result-grid">
                {['卖点直给版', '场景种草版', '成分专业版'].map((name, index) => (
                  <button type="button" key={name} onClick={() => message.success(`正在预览：${name}`)}>
                    <span><VideoCameraOutlined /><em>0{index + 1}</em><i>{index === 0 ? '00:28' : index === 1 ? '00:32' : '00:25'}</i></span>
                    <strong>{name}</strong><small>9:16 · 1080P</small>
                  </button>
                ))}
              </div>
              <footer>
                <button type="button" onClick={() => message.info('Demo 已模拟打包 15 条成片')}><DownloadOutlined />批量导出</button>
                <button type="button" className="primary" onClick={() => message.success('正在预览第一条成片')}><EyeOutlined />预览成片</button>
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
                  <button onClick={() => { message.success('节点配置已保存到当前画布'); setContextMenu(null); }}><SaveOutlined /><span>保存到我的资产</span></button>
                  <button onClick={() => showCreativeLibrary('character', contextMenu.flowPosition)}><RobotOutlined /><span>角色库</span></button>
                  <i />
                  <button onClick={() => { copySelection(); setContextMenu(null); }}><CopyOutlined /><span>复制节点</span><kbd>⌘C</kbd></button>
                  <button onClick={() => { duplicateSelection(); setContextMenu(null); }}><PlusOutlined /><span>创建副本</span><kbd>⌘D</kbd></button>
                  <button onClick={() => { pasteClipboard(contextMenu.flowPosition); setContextMenu(null); }}><AppstoreOutlined /><span>粘贴</span><kbd>⌘V</kbd></button>
                  <button className="is-danger" onClick={() => { deleteSelection(); setContextMenu(null); }}><DeleteOutlined /><span>删除</span><kbd>⌫</kbd></button>
                </>
              ) : (
                <>
                  <button onClick={() => { addNode('product', contextMenu.flowPosition); setContextMenu(null); }}><PictureOutlined /><span>上传产品素材</span></button>
                  <button onClick={() => showCreativeLibrary('character', contextMenu.flowPosition)}><RobotOutlined /><span>角色库</span></button>
                  <button onClick={() => showCreativeLibrary('style', contextMenu.flowPosition)}><PictureOutlined /><span>风格库</span></button>
                  <button onClick={() => showCreativeLibrary('effect', contextMenu.flowPosition)}><ThunderboltOutlined /><span>特效库</span></button>
                  <button onClick={() => {
                    const nodeId = addNode('director', contextMenu.flowPosition);
                    setContextMenu(null);
                    openDirector(nodeId);
                  }}><VideoCameraOutlined /><span>创建导演台</span></button>
                  <button onClick={() => openLibraryAtContext(contextMenu)}><PlusOutlined /><span>添加节点</span></button>
                  <i />
                  <button disabled={!pastCount} onClick={() => { undo(); setContextMenu(null); }}><UndoOutlined /><span>撤销</span><kbd>⌘Z</kbd></button>
                  <button disabled={!futureCount} onClick={() => { redo(); setContextMenu(null); }}><RedoOutlined /><span>重做</span><kbd>⇧⌘Z</kbd></button>
                  <button onClick={() => { pasteClipboard(contextMenu.flowPosition); setContextMenu(null); }}><CopyOutlined /><span>粘贴</span><kbd>⌘V</kbd></button>
                  <button onClick={() => { selectAll(); setContextMenu(null); }}><DragOutlined /><span>全选节点</span><kbd>⌘A</kbd></button>
                  <button onClick={() => { arrangeNodes(); setContextMenu(null); }}><LayoutOutlined /><span>自动排版</span></button>
                  <button onClick={() => { fitView({ padding: 0.14, duration: 420 }); setContextMenu(null); }}><AimOutlined /><span>适配画布</span></button>
                </>
              )}
            </div>
          ) : null}

          {!nodes.length ? (
            <div className="workflow-empty-canvas">
              <ApartmentOutlined />
              <h2>从一个创作节点开始</h2>
              <p>点击底部的加号添加能力，或让画布助手搭建流程。</p>
              <button onClick={() => setLibraryOpen(true)}>添加第一个节点</button>
            </div>
          ) : null}

          {agentOpen ? (
            <div className="workflow-agent-bar">
              <span className="workflow-agent-avatar"><RobotOutlined /></span>
              <input
                autoFocus
                value={agentPrompt}
                onChange={(event) => setAgentPrompt(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') submitAgentDraft(); }}
                placeholder="描述你的创意，自动搭建图片或视频工作流…"
              />
              <button onClick={submitAgentDraft}><SendOutlined />发送</button>
            </div>
          ) : null}
        </div>

        <div className="workflow-canvas-chrome" aria-label="画布固定工具层">
          <header className="workflow-canvas-header">
            <div className="workflow-canvas-title" title={projectTitle}>
              <AppstoreOutlined className="workflow-canvas-brand" />
              <strong>{projectTitle}</strong>
              <i />
              <span>{mode === 'image' ? '画布 1' : '视频画布 1'}</span>
              <NodeIndexOutlined />
            </div>
            <div className="workflow-header-actions">
              {activeStage ? <span className={`workflow-active-stage${activeStage === 'DONE' ? ' is-done' : ''}`}>{activeStage === 'DONE' ? '已完成' : `${activeStage} 阶段`}</span> : null}
              <span className="workflow-production-summary">
                <b>{productionSummary.materialCount || 0}</b> 镜头
                <i />
                <b>{productionSummary.outputCount || 0}</b> 成片
              </span>
              <button className="workflow-template-button" aria-label="重置视频画布 Demo" onClick={resetProductionTemplate} title="恢复精简视频画布 Demo"><ThunderboltOutlined /><span>重置 Demo</span></button>
              <button className="workflow-run-all-button" aria-label="运行完整工作流" disabled={workflowRunning} onClick={() => { void runWorkflowPreview(); }} title="校验并试运行完整工作流">
                {workflowRunning ? <LoadingOutlined spin /> : <PlayCircleFilled />}<span>{workflowRunning ? '执行中' : '运行全链路'}</span>
              </button>
              <button
                className={`workflow-monitor-trigger${runMonitorOpen ? ' active' : ''}`}
                aria-label="执行监控"
                onClick={() => setRunMonitorOpen((open) => !open)}
                title="查看执行状态与耗时"
              >
                <DashboardOutlined />
                {activeRun ? <i className={`is-${activeRun.status}`} /> : null}
              </button>
              <button className="workflow-header-secondary-action" aria-label="分享画布" onClick={() => { void navigator.clipboard?.writeText(window.location.href); message.success('画布链接已复制'); }} title="分享画布"><ShareAltOutlined /></button>
              <button className="workflow-header-secondary-action" aria-label="素材库" onClick={() => showCreativeLibrary('character')} title="角色、风格与特效库"><ShopOutlined /></button>
              <span className="workflow-save-state"><CloudOutlined />已保存</span>
              <button className="workflow-header-secondary-action" aria-label="复制所选节点" disabled={!selectedCount} onClick={duplicateSelection} title="复制所选"><CopyOutlined /></button>
              <button className="workflow-header-secondary-action" aria-label="删除所选节点" disabled={!selectedCount} onClick={deleteSelection} title="删除所选"><DeleteOutlined /></button>
              <button className="workflow-header-secondary-action" aria-label="保存画布" onClick={() => { void saveWorkflow(); }} title="保存到项目"><SaveOutlined /></button>
              <button aria-label="画布助手" className={agentOpen ? 'active' : ''} onClick={() => setAgentOpen((open) => !open)} title="Agent 画布助手"><RobotOutlined /><span>Agent</span></button>
            </div>
          </header>

          <div className="workflow-floating-tools" aria-label="画布工具">
            <button aria-label="添加节点" className={`workflow-add-node-button${libraryOpen ? ' active' : ''}`} onClick={() => { setLibraryAnchor(null); setContextMenu(null); setLibraryOpen((open) => !open); }} title="添加节点">{libraryOpen ? <CloseOutlined /> : <PlusOutlined />}</button>
            <button aria-label="选择工具" onClick={clearSelection} title="选择工具"><DragOutlined /></button>
            <button aria-label="连接节点" onClick={() => message.info('拖动节点两侧的连接点即可建立工作流')} title="连接节点"><NodeIndexOutlined /></button>
            <button aria-label="素材与图片" onClick={() => showCreativeLibrary('character')} title="角色、风格与特效库"><PictureOutlined /></button>
            <button aria-label="自动排版" onClick={arrangeNodes} title="自动排版"><LayoutOutlined /></button>
            <span className="workflow-tool-divider" />
            <button className="workflow-tool-secondary" aria-label="撤销" disabled={!pastCount} onClick={undo} title="撤销"><UndoOutlined /></button>
            <button className="workflow-tool-secondary" aria-label="重做" disabled={!futureCount} onClick={redo} title="重做"><RedoOutlined /></button>
            <button aria-label="适配画布" onClick={() => fitView({ padding: 0.16, duration: 420 })} title="适配画布"><AimOutlined /></button>
            <button className={`workflow-tool-secondary${showMinimap ? ' active' : ''}`} aria-label="切换小地图" onClick={() => setShowMinimap((visible) => !visible)} title="切换小地图"><ApartmentOutlined /></button>
            <button className="workflow-tool-secondary" aria-label="历史记录" onClick={() => message.info(`当前可撤销 ${pastCount} 步，可重做 ${futureCount} 步`)} title="历史记录"><HistoryOutlined /></button>
            <button className="workflow-tool-secondary" aria-label="快捷键" onClick={showShortcutHelp} title="快捷键"><AppstoreOutlined /></button>
            <button className="workflow-tool-secondary" aria-label="帮助" onClick={() => message.info('文本、视频和音频节点可展开编辑；其余节点用于引用资源、承接结果和连线')} title="帮助"><QuestionCircleOutlined /></button>
            <button
              className="workflow-tool-secondary"
              aria-label="清空画布"
              onClick={() => Modal.confirm({
                title: '清空当前画布？',
                content: '可以通过撤销恢复本次清空。',
                okText: '清空',
                cancelText: '取消',
                okButtonProps: { danger: true },
                onOk: clearCanvas,
              })}
              title="清空画布"
            ><ClearOutlined /></button>
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
