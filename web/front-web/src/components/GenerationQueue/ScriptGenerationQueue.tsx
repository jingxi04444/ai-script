import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseCircleFilled,
  CrownFilled,
  DownloadOutlined,
  DragOutlined,
  FileZipOutlined,
  LoadingOutlined,
  OrderedListOutlined,
  ReloadOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import { Drawer, Progress, message } from 'antd';
import { generationApi } from '../../api/generation';
import { scriptApi } from '../../api/script';
import type { ExportJob, ScriptQueueItem, ScriptQueueState } from '../../types/generation';
import { formatDateTime } from '../../utils/format';
import { useTaskCenterPosition } from './useTaskCenterPosition';
import { isPolishWorking, useScriptPolishStore, type PolishSession } from '../../stores/scriptPolishStore';
import PolishTaskList from './PolishTaskList';
import './script-generation-queue.css';

type TaskCenterTab = 'generation' | 'downloads' | 'polish';

const EMPTY_QUEUE: ScriptQueueState = {
  items: [],
  pendingCount: 0,
  runningCount: 0,
  activeCount: 0,
  concurrency: 1,
  maxConcurrency: 1,
  parallelConfigurable: false,
};

const generationStatusMeta: Record<ScriptQueueItem['status'], { label: string; icon: ReactNode }> = {
  pending: { label: '等待中', icon: <OrderedListOutlined /> },
  running: { label: '生成中', icon: <LoadingOutlined spin /> },
  success: { label: '已完成', icon: <CheckCircleFilled /> },
  failed: { label: '失败', icon: <CloseCircleFilled /> },
  canceled: { label: '已取消', icon: <CloseCircleFilled /> },
};

const exportStatusMeta: Record<NonNullable<ExportJob['status']>, { label: string; icon: ReactNode }> = {
  pending: { label: '等待打包', icon: <ClockCircleOutlined /> },
  running: { label: '正在打包', icon: <LoadingOutlined spin /> },
  success: { label: '可以下载', icon: <CheckCircleFilled /> },
  failed: { label: '打包失败', icon: <CloseCircleFilled /> },
  canceled: { label: '已取消', icon: <CloseCircleFilled /> },
  expired: { label: '已过期', icon: <ClockCircleOutlined /> },
};

const ScriptGenerationQueue = () => {
  const navigate = useNavigate();
  const launcherPosition = useTaskCenterPosition();
  const polishSessionsById = useScriptPolishStore((state) => state.sessions);
  const polishSessions = Object.values(polishSessionsById);
  const activePolishCount = polishSessions.filter(isPolishWorking).length;
  const polishSessionCount = polishSessions.length;
  const [queue, setQueue] = useState<ScriptQueueState>(EMPTY_QUEUE);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TaskCenterTab>('generation');
  const [loading, setLoading] = useState(false);
  const [savingConcurrency, setSavingConcurrency] = useState(false);
  const previousGenerationActiveRef = useRef<number | null>(null);
  const previousActiveBatchesRef = useRef<Set<string>>(new Set());
  const seenGenerationSuccessRef = useRef<Set<string> | null>(null);
  const previousExportActiveRef = useRef<number | null>(null);
  const seenExportSuccessRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (!polishSessionCount) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [polishSessionCount]);

  const loadTaskCenter = useCallback(async (quiet = true) => {
    if (!quiet) setLoading(true);
    try {
      const [queueResult, exportResult] = await Promise.allSettled([
        scriptApi.getGenerationQueue(),
        generationApi.exports({ page: 1, pageSize: 30 }),
      ]);

      if (queueResult.status === 'fulfilled') {
        const next = queueResult.value;
        const currentSuccessIds = new Set(
          next.items.filter((item) => item.status === 'success').map((item) => item.id),
        );
        const newlyCompleted = seenGenerationSuccessRef.current
          ? [...currentSuccessIds].some((id) => !seenGenerationSuccessRef.current?.has(id))
          : false;
        if (newlyCompleted) {
          window.dispatchEvent(new Event('scripts:changed'));
          window.dispatchEvent(new Event('points:changed'));
        }
        if (previousGenerationActiveRef.current !== null
          && previousGenerationActiveRef.current > 0
          && next.activeCount === 0) {
          const completedBatchNos = previousActiveBatchesRef.current;
          const failedCount = next.items.filter((item) => (
            item.status === 'failed' && completedBatchNos.has(item.batchNo)
          )).length;
          if (failedCount > 0) message.warning('脚本任务已结束，部分任务生成失败');
          else message.success('本批脚本已全部生成完成，可以开始逐条润色和审核');
          window.dispatchEvent(new Event('notifications:changed'));
        }
        previousGenerationActiveRef.current = next.activeCount;
        previousActiveBatchesRef.current = new Set(
          next.items
            .filter((item) => item.status === 'pending' || item.status === 'running')
            .map((item) => item.batchNo),
        );
        seenGenerationSuccessRef.current = currentSuccessIds;
        setQueue(next);
      }

      if (exportResult.status === 'fulfilled') {
        const jobs = exportResult.value.list || [];
        let activeCount = 0;
        const successIds = new Set<string>();
        for (const job of jobs) {
          if (job.status === 'pending' || job.status === 'running') activeCount += 1;
          if (job.status === 'success') successIds.add(job.id);
        }
        const newlyCompleted = seenExportSuccessRef.current
          ? [...successIds].some((id) => !seenExportSuccessRef.current?.has(id))
          : false;
        if (previousExportActiveRef.current !== null
          && previousExportActiveRef.current > 0
          && activeCount === 0
          && newlyCompleted) {
          message.success('批量下载已准备完成，可在任务中心下载');
          window.dispatchEvent(new Event('notifications:changed'));
        }
        previousExportActiveRef.current = activeCount;
        seenExportSuccessRef.current = successIds;
        setExportJobs(jobs);
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTaskCenter();
    const handleQueueChanged = () => void loadTaskCenter(false);
    const handleExportChanged = () => {
      setActiveTab('downloads');
      void loadTaskCenter(false);
    };
    const handleOpen = (event: Event) => {
      const requestedTab = (event as CustomEvent<{ tab?: TaskCenterTab }>).detail?.tab;
      if (requestedTab) setActiveTab(requestedTab);
      setOpen(true);
      void loadTaskCenter(false);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void loadTaskCenter();
    };
    window.addEventListener('script-queue:changed', handleQueueChanged);
    window.addEventListener('export-queue:changed', handleExportChanged);
    window.addEventListener('task-center:open', handleOpen);
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('script-queue:changed', handleQueueChanged);
      window.removeEventListener('export-queue:changed', handleExportChanged);
      window.removeEventListener('task-center:open', handleOpen);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadTaskCenter]);

  let activeExportCount = 0;
  let completedExportCount = 0;
  for (const job of exportJobs) {
    if (job.status === 'pending' || job.status === 'running') activeExportCount += 1;
    else completedExportCount += 1;
  }
  const totalActiveCount = queue.activeCount + activeExportCount + activePolishCount;

  useEffect(() => {
    const interval = window.setInterval(
      () => void loadTaskCenter(),
      totalActiveCount > 0 ? 3000 : 15000,
    );
    return () => window.clearInterval(interval);
  }, [loadTaskCenter, totalActiveCount]);

  const updateConcurrency = async (concurrency: number) => {
    if (concurrency === queue.concurrency || savingConcurrency) return;
    setSavingConcurrency(true);
    try {
      const next = await scriptApi.updateGenerationConcurrency(concurrency);
      setQueue(next);
      message.success(`脚本队列并发数已调整为 ${concurrency}`);
    } finally {
      setSavingConcurrency(false);
    }
  };

  const cancelGeneration = async (item: ScriptQueueItem) => {
    await scriptApi.cancelGeneration(item.id);
    message.success('已从生成队列移除');
    await loadTaskCenter(false);
  };

  const openScript = (item: ScriptQueueItem) => {
    if (!item.scriptId) return;
    setOpen(false);
    const params = new URLSearchParams({
      step: 'script-generator',
      scriptMode: 'mine',
      editScriptId: item.scriptId,
    });
    if (item.projectId) params.set('projectId', item.projectId);
    navigate(`/workspace?${params.toString()}`);
  };

  const openPolishSession = (session: PolishSession) => {
    setOpen(false);
    const params = new URLSearchParams({
      step: 'storyboard', scriptMode: 'mine', returnStep: 'storyboard',
      editScriptId: session.draft.script.id, projectId: session.draft.script.projectId,
    });
    navigate(`/workspace?${params.toString()}`);
  };

  const cancelExport = async (job: ExportJob) => {
    try {
      await generationApi.cancelExport(job.id);
      message.success('已取消下载任务');
      await loadTaskCenter(false);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '任务已经开始处理，无法取消');
    }
  };

  const retryExport = async (job: ExportJob) => {
    try {
      await generationApi.retryExport(job.id);
      message.success('下载任务已重新加入队列');
      await loadTaskCenter(false);
    } catch (error) {
      message.error(error instanceof Error ? error.message : '重新打包失败');
    }
  };

  const runningGenerationItems: ScriptQueueItem[] = [];
  const pendingGenerationItems: ScriptQueueItem[] = [];
  const recentGenerationItems: ScriptQueueItem[] = [];
  for (const item of queue.items) {
    if (item.status === 'running') runningGenerationItems.push(item);
    else if (item.status === 'pending') pendingGenerationItems.push(item);
    else recentGenerationItems.push(item);
  }

  return (
    <>
      <button
        {...launcherPosition}
        type="button"
        className={`task-center-launcher${totalActiveCount > 0 ? ' is-active' : ''}`}
        onClick={() => {
          if (polishSessions.length) setActiveTab('polish');
          setOpen(true);
          void loadTaskCenter(false);
        }}
        aria-label={`任务中心，${totalActiveCount} 个任务进行中`}
        aria-description="点击查看任务；按住拖动或使用方向键调整位置，Home 键恢复默认位置"
        title="点击查看任务 · 按住拖动调整位置（方向键移动，Home 恢复默认）"
      >
        <span className="task-center-launcher-icon"><OrderedListOutlined /></span>
        <span>
          <strong>{totalActiveCount > 0 ? `${totalActiveCount} 个后台任务进行中` : '任务中心'}</strong>
          <small>{polishSessions.length ? `AI 润色 ${polishSessions.length} 篇 · 点击返回` : totalActiveCount > 0 ? '可以继续创作，完成后通知' : '生成与下载任务统一管理'}</small>
        </span>
        {totalActiveCount > 0 ? <em>{totalActiveCount}</em> : null}
        <DragOutlined className="task-center-launcher-drag" aria-hidden="true" />
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        width={560}
        placement="right"
        rootClassName="task-center-drawer-root"
        title={null}
      >
        <div className="task-center-drawer">
          <header className="task-center-header">
            <div className="task-center-heading">
              <span>BACKGROUND TASKS</span>
              <h2>任务中心</h2>
              <p>任务会在后台持续处理，你可以关闭面板继续创作。</p>
            </div>
            <button type="button" className="task-center-refresh" disabled={loading} onClick={() => void loadTaskCenter(false)}>
              {loading ? <LoadingOutlined spin /> : <ReloadOutlined />} {loading ? '刷新中' : '刷新'}
            </button>
            <nav className="task-center-tabs" aria-label="任务类型">
              <button type="button" className={activeTab === 'generation' ? 'is-active' : ''} onClick={() => setActiveTab('generation')}>
                生成任务 <span>{queue.activeCount || recentGenerationItems.length}</span>
              </button>
              <button type="button" className={activeTab === 'downloads' ? 'is-active' : ''} onClick={() => setActiveTab('downloads')}>
                下载任务 <span>{activeExportCount || completedExportCount}</span>
              </button>
              <button type="button" className={activeTab === 'polish' ? 'is-active' : ''} onClick={() => setActiveTab('polish')}>
                AI 润色 <span>{polishSessions.length}</span>
              </button>
            </nav>
          </header>

          {activeTab === 'polish' ? <PolishTaskList sessions={polishSessions} onOpen={openPolishSession} /> : activeTab === 'generation' ? (
            <div className="task-center-pane">
              <section className="task-center-concurrency">
                <div>
                  <strong>并发生成</strong>
                  <small>{queue.parallelConfigurable ? `至尊版最多同时生成 ${queue.maxConcurrency} 条` : '当前套餐按顺序逐条生成'}</small>
                </div>
                {queue.parallelConfigurable ? (
                  <div className="task-center-concurrency-options" aria-label="脚本生成并发数">
                    {Array.from({ length: queue.maxConcurrency }, (_, index) => index + 1).map((value) => (
                      <button
                        type="button"
                        key={value}
                        disabled={savingConcurrency}
                        className={value === queue.concurrency ? 'is-active' : ''}
                        onClick={() => void updateConcurrency(value)}
                      >{value}</button>
                    ))}
                  </div>
                ) : (
                  <button type="button" className="task-center-upgrade" onClick={() => { setOpen(false); navigate('/membership'); }}>
                    <CrownFilled />至尊版可调并发
                  </button>
                )}
              </section>

              <TaskSectionHeader title="当前批次" meta={queue.activeCount ? `${queue.activeCount} 个任务` : '队列空闲'} />
              <section className="task-center-list">
                {runningGenerationItems.map((item) => (
                  <GenerationCard key={item.id} item={item} detail="正在生成脚本结构与内容" />
                ))}
                {pendingGenerationItems.map((item, index) => (
                  <GenerationCard key={item.id} item={item} detail={`排队第 ${index + 1} 位`} onCancel={() => void cancelGeneration(item)} />
                ))}
                {!queue.activeCount ? <TaskEmpty type="generation" /> : null}
              </section>

              {recentGenerationItems.length > 0 ? (
                <>
                  <TaskSectionHeader title="最近完成" meta={`最近 ${Math.min(recentGenerationItems.length, 12)} 条`} />
                  <section className="task-center-list is-history">
                    {recentGenerationItems.slice(0, 12).map((item) => (
                      <GenerationCard key={item.id} item={item} detail={historyTaskDetail(item)} onOpen={() => openScript(item)} />
                    ))}
                  </section>
                </>
              ) : null}
            </div>
          ) : (
            <div className="task-center-pane">
              <section className="task-center-download-note">
                <FileZipOutlined />
                <div><strong>后台打包下载</strong><span>多个脚本会合并为一个 ZIP，完成后保留 7 天。</span></div>
              </section>
              <TaskSectionHeader title="下载列表" meta={activeExportCount ? `${activeExportCount} 个处理中` : `${exportJobs.length} 条记录`} />
              <section className="task-center-list is-downloads">
                {exportJobs.map((job) => (
                  <ExportCard
                    key={job.id}
                    job={job}
                    onCancel={() => void cancelExport(job)}
                    onRetry={() => void retryExport(job)}
                  />
                ))}
                {!exportJobs.length ? <TaskEmpty type="downloads" /> : null}
              </section>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
};

const TaskSectionHeader = ({ title, meta }: { title: string; meta: string }) => (
  <div className="task-center-section-title"><strong>{title}</strong><span>{meta}</span></div>
);

const TaskEmpty = ({ type }: { type: TaskCenterTab }) => (
  <div className="task-center-empty">
    {type === 'generation' ? <OrderedListOutlined /> : <DownloadOutlined />}
    <strong>{type === 'generation' ? '没有等待中的任务' : '暂无下载任务'}</strong>
    <span>{type === 'generation' ? '点击任意“生成脚本”，任务会自动出现在这里。' : '在脚本库选择多条内容后点击“批量下载”。'}</span>
  </div>
);

interface GenerationCardProps {
  item: ScriptQueueItem;
  detail: string;
  onCancel?: () => void;
  onOpen?: () => void;
}

const GenerationCard = ({ item, detail, onCancel, onOpen }: GenerationCardProps) => {
  const meta = generationStatusMeta[item.status];
  return (
    <article className={`task-center-card is-${item.status}`}>
      <span className="task-center-card-icon">{meta.icon}</span>
      <div className="task-center-card-copy">
        <strong>{item.taskLabel}</strong>
        <span>{item.errorMessage || detail}</span>
      </div>
      <div className="task-center-card-actions">
        <small>{meta.label}</small>
        {onCancel ? <button type="button" onClick={onCancel}>取消</button> : null}
        {onOpen && item.status === 'success' ? <button type="button" onClick={onOpen}>打开</button> : null}
      </div>
    </article>
  );
};

const ExportCard = ({ job, onCancel, onRetry }: { job: ExportJob; onCancel: () => void; onRetry: () => void }) => {
  const status = job.status || 'pending';
  const meta = exportStatusMeta[status];
  const progress = status === 'success' ? 100 : Math.max(0, Math.min(job.progress || 0, 99));
  return (
    <article className={`task-center-download-card is-${status}`}>
      <span className="task-center-download-icon"><FileZipOutlined /></span>
      <div className="task-center-download-main">
        <div className="task-center-download-title">
          <strong>{job.fileName || '脚本批量下载.zip'}</strong>
          <span>{meta.icon} {meta.label}</span>
        </div>
        <small>{job.sourceCount || 0} 条脚本 · {formatFileSize(job.fileSize)}</small>
        {(status === 'pending' || status === 'running') ? (
          <Progress percent={progress} size="small" showInfo={false} strokeColor="#70df9d" trailColor="rgba(255,255,255,.08)" />
        ) : null}
        {job.errorMessage ? <p>{job.errorMessage}</p> : null}
        <footer>
          <time>{job.createdAt ? formatDateTime(job.createdAt) : '刚刚创建'}</time>
          {job.expireAt && status === 'success' ? <em>有效至 {formatDateTime(job.expireAt)}</em> : null}
        </footer>
      </div>
      <div className="task-center-download-actions">
        {status === 'pending' ? <button type="button" onClick={onCancel}>取消</button> : null}
        {(status === 'failed' || status === 'canceled') ? <button type="button" onClick={onRetry}><SyncOutlined />重试</button> : null}
        {status === 'success' && job.downloadUrl ? (
          <a href={job.downloadUrl} target="_blank" rel="noreferrer"><DownloadOutlined />下载</a>
        ) : null}
      </div>
    </article>
  );
};

const formatFileSize = (size?: number) => {
  if (!size) return '等待生成文件';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const historyTaskDetail = (item: ScriptQueueItem) => {
  if (item.status === 'success') return '脚本已生成，可以打开查看';
  if (item.status === 'canceled') return '任务已取消';
  return '脚本生成失败';
};

export default ScriptGenerationQueue;
