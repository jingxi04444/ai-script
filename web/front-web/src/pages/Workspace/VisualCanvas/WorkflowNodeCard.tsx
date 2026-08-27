import { memo } from 'react';
import {
  AppstoreOutlined,
  BulbOutlined,
  CheckCircleFilled,
  EditOutlined,
  ExclamationCircleFilled,
  FileImageOutlined,
  FileTextOutlined,
  LoadingOutlined,
  PlayCircleFilled,
  ProductOutlined,
  PushpinOutlined,
  UserOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useWorkflowStore } from '../../../stores/workflowStore';
import type { WorkflowNode, WorkflowNodeKind, WorkflowNodeStatus } from '../../../types/workflow';

const nodeIcons: Record<WorkflowNodeKind, React.ReactNode> = {
  storyboard: <FileTextOutlined />,
  character: <UserOutlined />,
  scene: <AppstoreOutlined />,
  product: <ProductOutlined />,
  prompt: <BulbOutlined />,
  image: <FileImageOutlined />,
  result: <CheckCircleFilled />,
  video: <VideoCameraOutlined />,
  note: <PushpinOutlined />,
};

const statusCopy: Record<WorkflowNodeStatus, string> = {
  idle: '待配置',
  queued: '排队中',
  running: '生成中',
  success: '已完成',
  failed: '失败',
};

const statusIcon = (status: WorkflowNodeStatus) => {
  if (status === 'queued' || status === 'running') return <LoadingOutlined spin />;
  if (status === 'success') return <CheckCircleFilled />;
  if (status === 'failed') return <ExclamationCircleFilled />;
  return <span className="workflow-status-dot" />;
};

const WorkflowNodeCard = memo(({ id, data, selected }: NodeProps<WorkflowNode>) => {
  const updateNodeData = useWorkflowStore((state) => state.updateNodeData);
  const requestRun = useWorkflowStore((state) => state.requestRun);
  const isSourceNode = ['storyboard', 'character', 'scene', 'product'].includes(data.kind);
  const hasTarget = !isSourceNode && data.kind !== 'note';
  const hasSource = !['video', 'note'].includes(data.kind);
  const canRun = data.kind === 'image' || data.kind === 'video';
  const isBusy = data.status === 'queued' || data.status === 'running';

  return (
    <article className={`workflow-node workflow-node-${data.kind}${selected ? ' selected' : ''}`}>
      {hasTarget ? <Handle className="workflow-handle workflow-handle-target" type="target" position={Position.Left} /> : null}

      <header className="workflow-node-head">
        <span className="workflow-node-icon" aria-hidden="true">{nodeIcons[data.kind]}</span>
        <div>
          <input
            className="workflow-node-title nodrag"
            value={data.title}
            aria-label="节点名称"
            onChange={(event) => updateNodeData(id, { title: event.target.value })}
          />
          <small>{data.description}</small>
        </div>
        <span className={`workflow-node-status ${data.status}`} title={statusCopy[data.status]}>
          {statusIcon(data.status)}
          {statusCopy[data.status]}
        </span>
      </header>

      <div className="workflow-node-body">
        {data.kind === 'result' ? (
          data.outputUrl ? (
            <img className="workflow-result-image nodrag" src={data.outputUrl} alt={data.title} />
          ) : (
            <div className="workflow-result-empty">
              <FileImageOutlined />
              <strong>等待生成结果</strong>
              <span>连接图片生成节点后，结果会出现在这里</span>
            </div>
          )
        ) : null}

        {['storyboard', 'character', 'scene', 'product', 'prompt', 'video', 'note'].includes(data.kind) ? (
          <label className="workflow-node-field">
            <span>{data.kind === 'note' ? '记录内容' : '创作描述'}</span>
            <textarea
              className="nodrag nowheel"
              value={data.prompt || ''}
              rows={data.kind === 'prompt' ? 5 : 4}
              onChange={(event) => updateNodeData(id, { prompt: event.target.value })}
            />
          </label>
        ) : null}

        {['character', 'scene', 'product'].includes(data.kind) ? (
          <label className="workflow-node-field compact">
            <span>参考素材 URL</span>
            <input
              className="nodrag"
              value={data.assetUrl || ''}
              placeholder="粘贴素材地址"
              onChange={(event) => updateNodeData(id, { assetUrl: event.target.value })}
            />
          </label>
        ) : null}

        {data.kind === 'image' || data.kind === 'video' ? (
          <div className="workflow-generation-config">
            <label className="workflow-node-field compact">
              <span>生成模型</span>
              <select
                className="nodrag"
                value={data.model || ''}
                onChange={(event) => updateNodeData(id, { model: event.target.value })}
              >
                <option value="通用商业生图模型">通用商业生图模型</option>
                <option value="高质感广告模型">高质感广告模型</option>
                <option value="通用图生视频模型">通用图生视频模型</option>
                <option value="高速视频模型">高速视频模型</option>
              </select>
            </label>
            <label className="workflow-node-field compact">
              <span>画面比例</span>
              <select
                className="nodrag"
                value={data.aspectRatio || '9:16'}
                onChange={(event) => updateNodeData(id, { aspectRatio: event.target.value })}
              >
                <option value="9:16">9:16 竖屏</option>
                <option value="16:9">16:9 横屏</option>
                <option value="1:1">1:1 方形</option>
                <option value="4:3">4:3 标准</option>
              </select>
            </label>
          </div>
        ) : null}
      </div>

      <footer className="workflow-node-foot">
        <span>{data.taskId ? `任务 ${data.taskId}` : `NODE · ${data.kind.toUpperCase()}`}</span>
        {canRun ? (
          <button className="nodrag" disabled={isBusy} onClick={() => requestRun(id)}>
            {isBusy ? <LoadingOutlined spin /> : <PlayCircleFilled />}
            {isBusy ? '处理中' : '运行节点'}
          </button>
        ) : (
          <span className="workflow-node-edit-hint"><EditOutlined />可编辑</span>
        )}
      </footer>

      {hasSource ? <Handle className="workflow-handle workflow-handle-source" type="source" position={Position.Right} /> : null}
    </article>
  );
});

WorkflowNodeCard.displayName = 'WorkflowNodeCard';

export default WorkflowNodeCard;

