import { memo, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseOutlined,
  ExclamationCircleFilled,
  LoadingOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { WorkflowNode, WorkflowNodeRun, WorkflowRun } from '../../../types/workflow';
import './workflow-run-monitor.css';

interface WorkflowRunMonitorProps {
  open: boolean;
  run: WorkflowRun | null;
  canvasNodes: WorkflowNode[];
  onClose: () => void;
}

interface MonitorNodeRow {
  id: string;
  title: string;
  kind: string;
  stage?: string;
  status: string;
  progress: number;
  attempt: number;
  startedAt?: string;
  finishedAt?: string;
  errorCode?: string;
  errorMessage?: string;
  skillCode?: string;
  outputJson?: string;
}

const terminalStatuses = new Set(['success', 'failed', 'canceled']);

const statusLabel = (status: string) => {
  switch (status) {
    case 'queued': return '排队中';
    case 'pending': return '等待中';
    case 'running': return '运行中';
    case 'retrying': return '准备重试';
    case 'success': return '已完成';
    case 'failed': return '执行失败';
    case 'canceling': return '取消中';
    case 'canceled': return '已取消';
    case 'skipped': return '已跳过';
    default: return '等待中';
  }
};

const parseTime = (value?: string) => {
  if (!value) return undefined;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : undefined;
};

const elapsedMs = (startedAt?: string, finishedAt?: string, now = Date.now()) => {
  const started = parseTime(startedAt);
  if (started === undefined) return undefined;
  const finished = parseTime(finishedAt);
  return Math.max(0, (finished ?? now) - started);
};

const formatElapsed = (milliseconds?: number) => {
  if (milliseconds === undefined) return '—';
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(milliseconds < 10_000 ? 1 : 0)} 秒`;
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const formatClock = (value?: string) => {
  const timestamp = parseTime(value);
  if (timestamp === undefined) return '—';
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(timestamp);
};

const outputMeta = (outputJson?: string) => {
  if (!outputJson) return null;
  try {
    const output = JSON.parse(outputJson) as Record<string, unknown>;
    return {
      taskId: typeof output.taskId === 'string' ? output.taskId : undefined,
      provider: typeof output.provider === 'string' ? output.provider : undefined,
      assetUrl: typeof output.assetUrl === 'string' ? output.assetUrl : undefined,
    };
  } catch {
    return null;
  }
};

const nodeStatusIcon = (status: string) => {
  if (status === 'success') return <CheckCircleFilled />;
  if (status === 'failed') return <ExclamationCircleFilled />;
  if (status === 'running' || status === 'retrying') return <LoadingOutlined spin />;
  return <span className="workflow-monitor-wait-dot" />;
};

const latestNodeAttempts = (nodeRuns: WorkflowNodeRun[]) => {
  const latest = new Map<string, WorkflowNodeRun>();
  nodeRuns.forEach((nodeRun) => {
    const current = latest.get(nodeRun.nodeId);
    if (!current || nodeRun.attempt >= current.attempt) latest.set(nodeRun.nodeId, nodeRun);
  });
  return latest;
};

const WorkflowRunMonitor = memo(({ open, run, canvasNodes, onClose }: WorkflowRunMonitorProps) => {
  const isLive = Boolean(run && !terminalStatuses.has(run.status));
  const [now, setNow] = useState(() => Date.now());
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !isLive) return undefined;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isLive, open]);

  const rows = useMemo<MonitorNodeRow[]>(() => {
    if (!run) return [];
    const latest = latestNodeAttempts(run.nodes || []);
    const canvasIds = new Set(canvasNodes.map((node) => node.id));
    const mapped: MonitorNodeRow[] = canvasNodes.map((node) => {
      const nodeRun = latest.get(node.id);
      return {
        id: node.id,
        title: node.data.title,
        kind: node.data.kind,
        stage: node.data.stage,
        status: nodeRun?.status || (node.data.status === 'idle' ? 'pending' : node.data.status),
        progress: nodeRun?.progress ?? node.data.progress ?? 0,
        attempt: nodeRun?.attempt || 1,
        startedAt: nodeRun?.startedAt,
        finishedAt: nodeRun?.finishedAt,
        errorCode: nodeRun?.errorCode,
        errorMessage: nodeRun?.errorMessage,
        skillCode: nodeRun?.skillCode,
        outputJson: nodeRun?.outputJson,
      };
    });
    run.nodes.forEach((nodeRun) => {
      if (canvasIds.has(nodeRun.nodeId) || latest.get(nodeRun.nodeId) !== nodeRun) return;
      mapped.push({
        id: nodeRun.nodeId,
        title: nodeRun.nodeId,
        kind: nodeRun.nodeKind,
        status: nodeRun.status,
        progress: nodeRun.progress,
        attempt: nodeRun.attempt,
        startedAt: nodeRun.startedAt,
        finishedAt: nodeRun.finishedAt,
        errorCode: nodeRun.errorCode,
        errorMessage: nodeRun.errorMessage,
        skillCode: nodeRun.skillCode,
        outputJson: nodeRun.outputJson,
      });
    });
    return mapped;
  }, [canvasNodes, run]);

  if (!open) return null;

  const totalNodes = run?.totalNodes || rows.length;
  const completedNodes = run?.completedNodes ?? rows.filter((row) => row.status === 'success').length;
  const failedNodes = run?.failedNodes ?? rows.filter((row) => row.status === 'failed').length;
  const progress = Math.max(0, Math.min(100, run?.progress || 0));
  const runDuration = elapsedMs(run?.startedAt, run?.finishedAt, now);

  return (
    <aside className="workflow-run-monitor" aria-label="工作流执行监控">
      <header className="workflow-monitor-header">
        <div>
          <small>{isLive ? 'LIVE RUN' : 'RUN LOG'}</small>
          <strong>执行监控</strong>
        </div>
        <button type="button" aria-label="关闭执行监控" onClick={onClose}><CloseOutlined /></button>
      </header>

      {!run ? (
        <div className="workflow-monitor-empty">
          <ClockCircleOutlined />
          <strong>还没有运行记录</strong>
          <span>运行画布后，这里会实时显示节点状态和耗时。</span>
        </div>
      ) : (
        <>
          <section className="workflow-monitor-overview">
            <div className={`workflow-monitor-ring is-${run.status}`} style={{ '--run-progress': `${progress * 3.6}deg` } as CSSProperties}>
              <span><b>{progress}</b><small>%</small></span>
            </div>
            <div className="workflow-monitor-overview-copy">
              <span className={`workflow-monitor-run-state is-${run.status}`}><i />{statusLabel(run.status)}</span>
              <strong>{formatElapsed(runDuration)}</strong>
              <small>运行编号 · {run.id.slice(-10)}</small>
            </div>
            <dl>
              <div><dt>完成</dt><dd>{completedNodes}<small>/{totalNodes}</small></dd></div>
              <div><dt>失败</dt><dd className={failedNodes ? 'has-error' : ''}>{failedNodes}</dd></div>
            </dl>
          </section>

          <section className="workflow-monitor-progress-track" aria-label={`工作流进度 ${progress}%`}>
            <i style={{ width: `${progress}%` }} />
          </section>

          {run.errorMessage ? (
            <div className="workflow-monitor-run-error">
              <ExclamationCircleFilled />
              <div><strong>{run.errorCode || 'WORKFLOW_FAILED'}</strong><span>{run.errorMessage}</span></div>
            </div>
          ) : null}

          <div className="workflow-monitor-list-heading">
            <span>节点时间线</span>
            <small>{rows.filter((row) => row.status === 'running' || row.status === 'retrying').length} 个正在执行</small>
          </div>

          <ol className="workflow-monitor-timeline">
            {rows.map((row) => {
              const expanded = expandedNodeId === row.id;
              const metadata = outputMeta(row.outputJson);
              return (
                <li key={row.id} className={`is-${row.status}${expanded ? ' is-expanded' : ''}`}>
                  <button type="button" className="workflow-monitor-node-row" onClick={() => setExpandedNodeId(expanded ? null : row.id)} aria-expanded={expanded}>
                    <span className="workflow-monitor-node-icon">{nodeStatusIcon(row.status)}</span>
                    <span className="workflow-monitor-node-copy">
                      <span><strong>{row.title}</strong>{row.stage ? <em>{row.stage}</em> : null}</span>
                      <small>{statusLabel(row.status)}{row.attempt > 1 ? ` · 第 ${row.attempt} 次` : ''}</small>
                    </span>
                    <span className="workflow-monitor-node-time">{formatElapsed(elapsedMs(row.startedAt, row.finishedAt, now))}</span>
                    <RightOutlined className="workflow-monitor-node-chevron" />
                  </button>
                  {expanded ? (
                    <div className="workflow-monitor-node-detail">
                      <dl>
                        <div><dt>开始</dt><dd>{formatClock(row.startedAt)}</dd></div>
                        <div><dt>结束</dt><dd>{formatClock(row.finishedAt)}</dd></div>
                        <div><dt>进度</dt><dd>{row.progress}%</dd></div>
                        <div><dt>执行次数</dt><dd>{row.attempt}</dd></div>
                      </dl>
                      {row.skillCode ? <p><span>Skill</span><code>{row.skillCode}</code></p> : null}
                      {metadata?.provider ? <p><span>供应商</span><code>{metadata.provider}</code></p> : null}
                      {metadata?.taskId ? <p><span>任务 ID</span><code>{metadata.taskId}</code></p> : null}
                      {row.errorMessage ? <p className="is-error"><span>{row.errorCode || 'NODE_FAILED'}</span>{row.errorMessage}</p> : null}
                      {metadata?.assetUrl ? <a href={metadata.assetUrl} target="_blank" rel="noreferrer">查看生成结果</a> : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>

          <footer className="workflow-monitor-footer">
            <span><i className={`is-${run.status}`} />{statusLabel(run.status)}</span>
            <small>{formatClock(run.startedAt)} 开始</small>
          </footer>
        </>
      )}
    </aside>
  );
});

WorkflowRunMonitor.displayName = 'WorkflowRunMonitor';

export default WorkflowRunMonitor;
