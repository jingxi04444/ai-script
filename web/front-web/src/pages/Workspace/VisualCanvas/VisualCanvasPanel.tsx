import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AimOutlined,
  ApartmentOutlined,
  AppstoreOutlined,
  ClearOutlined,
  CloseOutlined,
  CloudOutlined,
  CopyOutlined,
  DeleteOutlined,
  DragOutlined,
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
  ThunderboltOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { message, Modal } from 'antd';
import {
  MiniMap,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
  type IsValidConnection,
  type OnConnect,
  type OnNodeDrag,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { generationApi } from '../../../api/generation';
import { workflowApi } from '../../../api/workflow';
import { useWorkflowStore } from '../../../stores/workflowStore';
import type { WorkflowEdge, WorkflowMode, WorkflowNode, WorkflowNodeKind } from '../../../types/workflow';
import NodeLibrary from './NodeLibrary';
import WorkflowNodeCard, { isWorkflowEditorKind, WorkflowNodeSelectionEditor } from './WorkflowNodeCard';
import './visual-canvas-panel.css';

interface VisualCanvasPanelProps {
  mode: WorkflowMode;
  projectId: string | null;
  projectTitle?: string;
  ensureProjectId: () => Promise<string>;
}

const nodeTypes = { workflow: WorkflowNodeCard };
const wait = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration));

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

const VisualCanvasWorkspace = ({ mode, projectId, projectTitle = '未命名工作区', ensureProjectId }: VisualCanvasPanelProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const persistTimerRef = useRef<number>();
  const clipboardRef = useRef<WorkflowClipboard | null>(null);
  const [agentPrompt, setAgentPrompt] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [showMinimap, setShowMinimap] = useState(false);
  const [workflowRunning, setWorkflowRunning] = useState(false);
  const [contextMenu, setContextMenu] = useState<CanvasContextMenuState | null>(null);
  const [libraryAnchor, setLibraryAnchor] = useState<CanvasContextMenuState | null>(null);
  const [selectionEditorAnchor, setSelectionEditorAnchor] = useState<SelectionEditorAnchor | null>(null);
  const nodes = useWorkflowStore((state) => state.nodes);
  const edges = useWorkflowStore((state) => state.edges);
  const pastCount = useWorkflowStore((state) => state.past.length);
  const futureCount = useWorkflowStore((state) => state.future.length);
  const pendingRunNodeId = useWorkflowStore((state) => state.pendingRunNodeId);
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
  const { fitView, screenToFlowPosition } = useReactFlow<WorkflowNode>();

  const selectedEditorNode = useMemo(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length !== 1 || !isWorkflowEditorKind(selectedNodes[0].data.kind)) return null;
    return selectedNodes[0];
  }, [nodes]);
  const selectedEditorNodeId = selectedEditorNode?.id;
  const selectedEditorNodeKind = selectedEditorNode?.data.kind;

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
    const isMediaEditor = ['image', 'video', 'batchMaterial'].includes(selectedEditorNodeKind);
    const preferredWidth = isMediaEditor ? 1320 : selectedEditorNodeKind === 'scriptGenerator' ? 760 : 660;
    const horizontalInset = isMediaEditor ? 36 : 16;
    const width = Math.max(320, Math.min(preferredWidth, wrapperRect.width - horizontalInset * 2));
    const halfWidth = width / 2;
    const nodeCenter = nodeRect.left - wrapperRect.left + nodeRect.width / 2;
    const left = Math.max(horizontalInset + halfWidth, Math.min(nodeCenter, wrapperRect.width - horizontalInset - halfWidth));
    const renderedEditorHeight = wrapper.querySelector<HTMLElement>('.workflow-editor-overlay')?.getBoundingClientRect().height;
    const estimatedHeight = renderedEditorHeight || (selectedEditorNodeKind === 'text' ? 208
      : ['image', 'video', 'batchMaterial'].includes(selectedEditorNodeKind) ? 254
        : selectedEditorNodeKind === 'scriptGenerator' ? 250 : 250);
    const below = nodeRect.bottom - wrapperRect.top + 8;
    const above = nodeRect.top - wrapperRect.top - estimatedHeight - 8;
    const bottomReserve = isMediaEditor ? 60 : 76;
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

  useEffect(() => {
    window.clearTimeout(persistTimerRef.current);
    persistTimerRef.current = window.setTimeout(persist, 450);
    return () => window.clearTimeout(persistTimerRef.current);
  }, [edges, nodes, persist]);

  useEffect(() => {
    const handleKeyboard = (event: KeyboardEvent) => {
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
        setContextMenu(null);
        setLibraryAnchor(null);
        setLibraryOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [copySelection, deleteSelection, duplicateSelection, pasteClipboard, redo, selectAll, undo]);

  useEffect(() => {
    if (!pendingRunNodeId) return;
    const node = useWorkflowStore.getState().nodes.find((item) => item.id === pendingRunNodeId);
    consumeRunRequest();
    if (!node) return;
    const runNode = async () => {
      updateNodeData(node.id, { status: 'running', progress: 18, taskId: undefined });
      try {
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
  }, [consumeRunRequest, ensureProjectId, pendingRunNodeId, updateNodeData]);

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
    addNode(kind, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
  }, [addNode, screenToFlowPosition]);

  const arrangeNodes = useCallback(() => {
    checkpoint();
    const columnOrder: Record<WorkflowNodeKind, number> = {
      storyboard: 0,
      scriptGenerator: 0,
      text: 0,
      character: 0,
      scene: 0,
      product: 0,
      note: 0,
      music: 0,
      categorySkill: 1,
      image: 2,
      prompt: 3,
      batchMaterial: 3,
      result: 4,
      video: 4,
      voice: 4,
      editor: 5,
      export: 6,
    };
    const nextYByColumn = new Map<number, number>();
    const nativeKinds = new Set<WorkflowNodeKind>(['scriptGenerator', 'text', 'image', 'video', 'batchMaterial']);
    useWorkflowStore.setState((state) => ({
      nodes: state.nodes.map((node) => {
        const column = columnOrder[node.data.kind];
        const y = nextYByColumn.get(column) || 80;
        nextYByColumn.set(column, y + (nativeKinds.has(node.data.kind) ? 720 : 300));
        return { ...node, position: { x: 90 + column * 690, y } };
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

  const runWorkflowPreview = async () => {
    if (workflowRunning) return;
    if (!nodes.length) return message.warning('画布中还没有可执行节点');
    setWorkflowRunning(true);
    const stageOrder = ['A', 'B', 'C', 'D', 'E'] as const;
    const sourceNodeKinds = new Set<WorkflowNodeKind>(['product', 'scene', 'character', 'storyboard']);
    useWorkflowStore.setState((state) => ({
      nodes: state.nodes.map((node) => ({ ...node, data: { ...node.data, status: 'idle', progress: 0, taskId: undefined } })),
    }));
    try {
      for (const stage of stageOrder) {
        const stageNodes = useWorkflowStore.getState().nodes.filter((node) => node.data.stage === stage);
        if (!stageNodes.length) continue;
        stageNodes.forEach((node) => updateNodeData(node.id, {
          status: sourceNodeKinds.has(node.data.kind) ? 'success' : 'running',
          progress: sourceNodeKinds.has(node.data.kind) ? 100 : 16,
        }));
        await wait(stage === 'D' ? 760 : 460);
        stageNodes.forEach((node) => updateNodeData(node.id, { status: 'success', progress: 100, taskId: `dry-run-${Date.now()}-${node.id}` }));
      }
      message.success(`工作流校验通过：计划生成 ${productionSummary.materialCount} 个镜头素材，组装 ${productionSummary.outputCount} 条视频`);
    } finally {
      setWorkflowRunning(false);
    }
  };

  const resetProductionTemplate = () => Modal.confirm({
    title: '载入产品视频生产模板？',
    content: '这会替换当前画布，可以通过撤销恢复。',
    okText: '载入模板',
    cancelText: '取消',
    onOk: () => {
      createVideoProductionDraft();
      window.setTimeout(() => fitView({ padding: 0.1, minZoom: 0.18, maxZoom: 0.78, duration: 520 }), 40);
      message.success('已载入 A–E 产品视频生产工作流');
    },
  });

  return (
    <section className="visual-canvas-panel" ref={wrapperRef}>
      <div className="workflow-canvas-stage">
        <div className="workflow-flow-wrap" onDrop={handleDrop} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}>
          <header className="workflow-canvas-header">
            <div className="workflow-canvas-title" title={projectTitle}>
              <AppstoreOutlined className="workflow-canvas-brand" />
              <strong>{projectTitle}</strong>
              <i />
              <span>{mode === 'image' ? '画布 1' : '视频画布 1'}</span>
              <NodeIndexOutlined />
            </div>
            <div className="workflow-header-actions">
              <span className="workflow-production-summary">
                <b>{productionSummary.materialCount || 0}</b> 镜头
                <i />
                <b>{productionSummary.outputCount || 0}</b> 成片
              </span>
              <button className="workflow-template-button" aria-label="载入视频生产模板" onClick={resetProductionTemplate} title="载入 A–E 视频生产模板"><ThunderboltOutlined /><span>生产模板</span></button>
              <button className="workflow-run-all-button" aria-label="运行完整工作流" disabled={workflowRunning} onClick={() => { void runWorkflowPreview(); }} title="校验并试运行完整工作流">
                {workflowRunning ? <LoadingOutlined spin /> : <PlayCircleFilled />}<span>{workflowRunning ? '执行中' : '运行全链路'}</span>
              </button>
              <button aria-label="分享画布" onClick={() => { void navigator.clipboard?.writeText(window.location.href); message.success('画布链接已复制'); }} title="分享画布"><ShareAltOutlined /></button>
              <button aria-label="素材库" onClick={() => setLibraryOpen(true)} title="素材库"><ShopOutlined /></button>
              <span className="workflow-save-state"><CloudOutlined />已保存</span>
              <button aria-label="复制所选节点" disabled={!selectedCount} onClick={duplicateSelection} title="复制所选"><CopyOutlined /></button>
              <button aria-label="删除所选节点" disabled={!selectedCount} onClick={deleteSelection} title="删除所选"><DeleteOutlined /></button>
              <button aria-label="保存画布" onClick={() => { void saveWorkflow(); }} title="保存到项目"><SaveOutlined /></button>
              <button aria-label="画布助手" className={agentOpen ? 'active' : ''} onClick={() => setAgentOpen((open) => !open)} title="Agent 画布助手"><RobotOutlined /><span>Agent</span></button>
            </div>
          </header>

          <ReactFlow<WorkflowNode>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            connectionMode={ConnectionMode.Loose}
            onNodeDragStart={handleNodeDragStart}
            onNodeContextMenu={handleNodeContextMenu}
            onPaneContextMenu={handlePaneContextMenu}
            onPaneClick={() => { setContextMenu(null); setLibraryAnchor(null); }}
            onMoveStart={() => setContextMenu(null)}
            onMove={updateSelectionEditorAnchor}
            isValidConnection={isValidConnection}
            deleteKeyCode={null}
            selectionOnDrag
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
              <WorkflowNodeSelectionEditor id={selectedEditorNode.id} data={selectedEditorNode.data} />
            </div>
          ) : null}

          <div className="workflow-floating-tools" aria-label="画布工具">
            <button aria-label="添加节点" className={`workflow-add-node-button${libraryOpen ? ' active' : ''}`} onClick={() => { setLibraryAnchor(null); setContextMenu(null); setLibraryOpen((open) => !open); }} title="添加节点">{libraryOpen ? <CloseOutlined /> : <PlusOutlined />}</button>
            <button aria-label="选择工具" onClick={clearSelection} title="选择工具"><DragOutlined /></button>
            <button aria-label="连接节点" onClick={() => message.info('拖动节点两侧的连接点即可建立工作流')} title="连接节点"><NodeIndexOutlined /></button>
            <button aria-label="素材与图片" onClick={() => setLibraryOpen(true)} title="素材与图片"><PictureOutlined /></button>
            <button aria-label="自动排版" onClick={arrangeNodes} title="自动排版"><LayoutOutlined /></button>
            <span className="workflow-tool-divider" />
            <button aria-label="撤销" disabled={!pastCount} onClick={undo} title="撤销"><UndoOutlined /></button>
            <button aria-label="重做" disabled={!futureCount} onClick={redo} title="重做"><RedoOutlined /></button>
            <button aria-label="适配画布" onClick={() => fitView({ padding: 0.16, duration: 420 })} title="适配画布"><AimOutlined /></button>
            <button aria-label="切换小地图" className={showMinimap ? 'active' : ''} onClick={() => setShowMinimap((visible) => !visible)} title="切换小地图"><ApartmentOutlined /></button>
            <button aria-label="历史记录" onClick={() => message.info(`当前可撤销 ${pastCount} 步，可重做 ${futureCount} 步`)} title="历史记录"><HistoryOutlined /></button>
            <button aria-label="快捷键" onClick={showShortcutHelp} title="快捷键"><AppstoreOutlined /></button>
            <button aria-label="帮助" onClick={() => message.info('节点可拖动、连线和组合；选中节点后可以编辑详细参数')} title="帮助"><QuestionCircleOutlined /></button>
            <button
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

          {libraryOpen ? (
            <div
              className={`workflow-library-popover${libraryAnchor ? ' is-context' : ''}`}
              style={libraryAnchor ? { left: libraryAnchor.x, top: libraryAnchor.y } : undefined}
              onMouseDown={(event) => event.stopPropagation()}
            >
              <NodeLibrary
                onAddNode={(kind) => { addNode(kind, libraryAnchor?.flowPosition); setLibraryOpen(false); setLibraryAnchor(null); }}
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
                  <button onClick={() => { addNode('character', contextMenu.flowPosition); setContextMenu(null); }}><RobotOutlined /><span>创建主体节点</span></button>
                  <i />
                  <button onClick={() => { copySelection(); setContextMenu(null); }}><CopyOutlined /><span>复制节点</span><kbd>⌘C</kbd></button>
                  <button onClick={() => { duplicateSelection(); setContextMenu(null); }}><PlusOutlined /><span>创建副本</span><kbd>⌘D</kbd></button>
                  <button onClick={() => { pasteClipboard(contextMenu.flowPosition); setContextMenu(null); }}><AppstoreOutlined /><span>粘贴</span><kbd>⌘V</kbd></button>
                  <button className="is-danger" onClick={() => { deleteSelection(); setContextMenu(null); }}><DeleteOutlined /><span>删除</span><kbd>⌫</kbd></button>
                </>
              ) : (
                <>
                  <button onClick={() => { addNode('product', contextMenu.flowPosition); setContextMenu(null); }}><PictureOutlined /><span>上传产品素材</span></button>
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
