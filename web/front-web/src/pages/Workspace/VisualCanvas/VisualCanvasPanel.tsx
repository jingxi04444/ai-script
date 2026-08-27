import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AimOutlined,
  ApartmentOutlined,
  ClearOutlined,
  CloudOutlined,
  CopyOutlined,
  DeleteOutlined,
  LayoutOutlined,
  MinusOutlined,
  PlusOutlined,
  RedoOutlined,
  RobotOutlined,
  SaveOutlined,
  SendOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { message, Modal } from 'antd';
import {
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type IsValidConnection,
  type OnConnect,
  type OnNodeDrag,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { generationApi } from '../../../api/generation';
import { useWorkflowStore } from '../../../stores/workflowStore';
import type { WorkflowMode, WorkflowNode, WorkflowNodeKind } from '../../../types/workflow';
import NodeLibrary from './NodeLibrary';
import WorkflowNodeCard from './WorkflowNodeCard';
import './visual-canvas-panel.css';

interface VisualCanvasPanelProps {
  mode: WorkflowMode;
  projectId: string | null;
  ensureProjectId: () => Promise<string>;
}

const nodeTypes = { workflow: WorkflowNodeCard };

const VisualCanvasWorkspace = ({ mode, projectId, ensureProjectId }: VisualCanvasPanelProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const persistTimerRef = useRef<number>();
  const [agentPrompt, setAgentPrompt] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(true);
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
  const clearCanvas = useWorkflowStore((state) => state.clearCanvas);
  const undo = useWorkflowStore((state) => state.undo);
  const redo = useWorkflowStore((state) => state.redo);
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const consumeRunRequest = useWorkflowStore((state) => state.consumeRunRequest);
  const createAgentDraft = useWorkflowStore((state) => state.createAgentDraft);
  const { fitView, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow<WorkflowNode>();

  const selectedCount = useMemo(
    () => nodes.reduce((count, node) => count + (node.selected ? 1 : 0), 0) + edges.reduce((count, edge) => count + (edge.selected ? 1 : 0), 0),
    [edges, nodes],
  );

  useEffect(() => {
    load(projectId, mode);
    window.setTimeout(() => fitView({ padding: 0.18, duration: 420 }), 80);
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
      } else if (command && event.key.toLowerCase() === 'a') {
        event.preventDefault();
        selectAll();
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        event.preventDefault();
        deleteSelection();
      }
    };
    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [deleteSelection, duplicateSelection, redo, selectAll, undo]);

  useEffect(() => {
    if (!pendingRunNodeId) return;
    const node = useWorkflowStore.getState().nodes.find((item) => item.id === pendingRunNodeId);
    consumeRunRequest();
    if (!node) return;
    if (node.data.kind === 'image') {
      message.info('图片节点已经配置完成；下一阶段接入图片生成 Provider 后即可运行');
      return;
    }
    if (node.data.kind !== 'video') return;

    const runVideo = async () => {
      updateNodeData(node.id, { status: 'running', taskId: undefined });
      try {
        const currentProjectId = await ensureProjectId();
        const result = await generationApi.generateVideo({
          projectId: currentProjectId,
          prompt: node.data.prompt,
          durationSeconds: 5,
          tagsJson: JSON.stringify({ source: 'visual-canvas', nodeId: node.id }),
        });
        updateNodeData(node.id, { status: 'queued', taskId: result.taskId || result.id });
        message.success('视频节点已进入生成队列');
      } catch {
        updateNodeData(node.id, { status: 'failed' });
        message.error('视频节点运行失败');
      }
    };
    void runVideo();
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
      character: 0,
      scene: 0,
      product: 0,
      note: 0,
      prompt: 1,
      image: 2,
      result: 3,
      video: 4,
    };
    const rowByColumn = new Map<number, number>();
    useWorkflowStore.setState((state) => ({
      nodes: state.nodes.map((node) => {
        const column = columnOrder[node.data.kind];
        const row = rowByColumn.get(column) || 0;
        rowByColumn.set(column, row + 1);
        return { ...node, position: { x: 90 + column * 370, y: 80 + row * 285 } };
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

  return (
    <section className={`visual-canvas-panel${libraryOpen ? '' : ' library-collapsed'}`} ref={wrapperRef}>
      {libraryOpen ? <NodeLibrary onAddNode={(kind) => addNode(kind)} /> : null}

      <div className="workflow-canvas-stage">
        <header className="workflow-canvas-header">
          <button className="workflow-library-toggle" onClick={() => setLibraryOpen((open) => !open)}>
            <ApartmentOutlined />{libraryOpen ? '收起能力' : '打开能力库'}
          </button>
          <div className="workflow-canvas-title">
            <span className="workflow-live-dot" />
            <strong>{mode === 'image' ? '视觉生成画布' : '分镜视频画布'}</strong>
            <small>{nodes.length} 个节点 · {edges.length} 条连接</small>
          </div>
          <div className="workflow-save-state"><CloudOutlined />自动保存到当前项目</div>
          <div className="workflow-header-actions">
            <button disabled={!pastCount} onClick={undo} title="撤销"><UndoOutlined /></button>
            <button disabled={!futureCount} onClick={redo} title="重做"><RedoOutlined /></button>
            <button disabled={!selectedCount} onClick={duplicateSelection} title="复制"><CopyOutlined /></button>
            <button disabled={!selectedCount} onClick={deleteSelection} title="删除"><DeleteOutlined /></button>
            <button onClick={() => { persist(); message.success('画布已保存'); }} title="保存"><SaveOutlined /></button>
          </div>
        </header>

        <div className="workflow-flow-wrap" onDrop={handleDrop} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; }}>
          <ReactFlow<WorkflowNode>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnect}
            onNodeDragStart={handleNodeDragStart}
            isValidConnection={isValidConnection}
            deleteKeyCode={null}
            selectionOnDrag
            panOnScroll
            minZoom={0.18}
            maxZoom={1.8}
            defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
            proOptions={{ hideAttribution: true }}
          >
            <MiniMap
              className="workflow-minimap"
              pannable
              zoomable
              nodeColor={(node) => {
                const kind = (node.data as { kind?: WorkflowNodeKind })?.kind;
                if (kind === 'image' || kind === 'result') return '#7bf178';
                if (kind === 'video') return '#ffb45f';
                if (kind === 'prompt') return '#6fc8ff';
                return '#89979a';
              }}
              maskColor="rgba(7, 11, 12, .72)"
            />
          </ReactFlow>

          <div className="workflow-floating-tools" aria-label="画布工具">
            <button onClick={() => zoomIn({ duration: 180 })} title="放大"><PlusOutlined /></button>
            <button onClick={() => zoomOut({ duration: 180 })} title="缩小"><MinusOutlined /></button>
            <button onClick={() => fitView({ padding: 0.16, duration: 420 })} title="适配画布"><AimOutlined /></button>
            <button onClick={arrangeNodes} title="自动排版"><LayoutOutlined /></button>
            <button
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

          {!nodes.length ? (
            <div className="workflow-empty-canvas">
              <ApartmentOutlined />
              <h2>从一个创作节点开始</h2>
              <p>从左侧拖入能力，或者让画布助手生成一套工作流草案。</p>
              <button onClick={() => addNode('storyboard')}>添加分镜节点</button>
            </div>
          ) : null}

          <div className="workflow-agent-bar">
            <span className="workflow-agent-avatar"><RobotOutlined /></span>
            <div className="workflow-agent-copy">
              <strong>画布助手</strong>
              <span>描述你想生成的画面，我会搭建一份可编辑草案</span>
            </div>
            <input
              value={agentPrompt}
              onChange={(event) => setAgentPrompt(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') submitAgentDraft(); }}
              placeholder="例如：根据产品卖点生成 3 个竖屏生活方式广告镜头…"
            />
            <button onClick={submitAgentDraft}><SendOutlined />生成草案</button>
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
