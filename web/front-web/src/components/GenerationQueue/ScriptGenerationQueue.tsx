import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleFilled,
  CloseCircleFilled,
  CrownFilled,
  LoadingOutlined,
  OrderedListOutlined,
} from '@ant-design/icons';
import { Drawer, message } from 'antd';
import { scriptApi } from '../../api/script';
import type { ScriptQueueItem, ScriptQueueState } from '../../types/generation';
import { formatDateTime } from '../../utils/format';
import './script-generation-queue.css';

const EMPTY_QUEUE: ScriptQueueState = {
  items: [],
  pendingCount: 0,
  runningCount: 0,
  activeCount: 0,
  concurrency: 1,
  maxConcurrency: 1,
  parallelConfigurable: false,
};

const statusMeta: Record<ScriptQueueItem['status'], { label: string; icon: ReactNode }> = {
  pending: { label: '等待中', icon: <OrderedListOutlined /> },
  running: { label: '生成中', icon: <LoadingOutlined spin /> },
  success: { label: '已完成', icon: <CheckCircleFilled /> },
  failed: { label: '失败', icon: <CloseCircleFilled /> },
  canceled: { label: '已取消', icon: <CloseCircleFilled /> },
};

const ScriptGenerationQueue = () => {
  const navigate = useNavigate();
  const [queue, setQueue] = useState<ScriptQueueState>(EMPTY_QUEUE);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingConcurrency, setSavingConcurrency] = useState(false);
  const previousActiveRef = useRef<number | null>(null);
  const previousActiveBatchesRef = useRef<Set<string>>(new Set());
  const seenSuccessRef = useRef<Set<string> | null>(null);

  const loadQueue = useCallback(async (quiet = true) => {
    if (!quiet) setLoading(true);
    try {
      const next = await scriptApi.getGenerationQueue();
      const previousActive = previousActiveRef.current;
      const currentSuccessIds = new Set(
        next.items.filter((item) => item.status === 'success').map((item) => item.id),
      );
      const newlyCompleted = seenSuccessRef.current
        ? [...currentSuccessIds].some((id) => !seenSuccessRef.current?.has(id))
        : false;

      if (newlyCompleted) {
        window.dispatchEvent(new Event('scripts:changed'));
        window.dispatchEvent(new Event('points:changed'));
      }
      if (previousActive !== null && previousActive > 0 && next.activeCount === 0) {
        const completedBatchNos = previousActiveBatchesRef.current;
        const failedCount = next.items.filter((item) => (
          item.status === 'failed' && completedBatchNos.has(item.batchNo)
        )).length;
        if (failedCount > 0) {
          message.warning('本批脚本任务已结束，部分任务生成失败，可在任务队列中查看原因');
        } else {
          message.success('本批脚本已全部生成完成，可以开始逐条润色和审核');
        }
        window.dispatchEvent(new Event('notifications:changed'));
      }
      previousActiveRef.current = next.activeCount;
      previousActiveBatchesRef.current = new Set(
        next.items
          .filter((item) => item.status === 'pending' || item.status === 'running')
          .map((item) => item.batchNo),
      );
      seenSuccessRef.current = currentSuccessIds;
      setQueue(next);
    } catch {
      // 全局队列状态不阻塞当前页面使用，接口层已提供错误提示。
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
    const handleQueueChanged = () => void loadQueue(false);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') void loadQueue();
    };
    window.addEventListener('script-queue:changed', handleQueueChanged);
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('script-queue:changed', handleQueueChanged);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [loadQueue]);

  useEffect(() => {
    const interval = window.setInterval(
      () => void loadQueue(),
      queue.activeCount > 0 ? 3000 : 15000,
    );
    return () => window.clearInterval(interval);
  }, [loadQueue, queue.activeCount]);

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

  const cancelItem = async (item: ScriptQueueItem) => {
    await scriptApi.cancelGeneration(item.id);
    message.success('已从生成队列移除');
    await loadQueue(false);
  };

  const openScript = (item: ScriptQueueItem) => {
    if (!item.scriptId) return;
    setOpen(false);
    navigate(`/workspace?step=script&editScriptId=${encodeURIComponent(item.scriptId)}`);
  };

  const pendingItems = queue.items.filter((item) => item.status === 'pending');
  const recentItems = queue.items.filter((item) => item.status !== 'pending' && item.status !== 'running');

  return (
    <>
      <button
        type="button"
        className={`script-queue-launcher${queue.activeCount > 0 ? ' is-active' : ''}`}
        onClick={() => {
          setOpen(true);
          void loadQueue(false);
        }}
        aria-label={`脚本生成队列，${queue.activeCount} 个任务进行中`}
      >
        <span className="script-queue-launcher-icon"><OrderedListOutlined /></span>
        <span>
          <strong>{queue.activeCount > 0 ? `${queue.runningCount} 生成 · ${queue.pendingCount} 等待` : '脚本生成队列'}</strong>
          <small>{queue.activeCount > 0 ? `并发 ${queue.concurrency}` : '后台生成，完成后通知'}</small>
        </span>
        {queue.activeCount > 0 ? <em>{queue.activeCount}</em> : null}
      </button>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        width={440}
        placement="right"
        rootClassName="script-queue-drawer-root"
        title={null}
      >
        <div className="script-queue-drawer">
          <header className="script-queue-header">
            <span>BACKGROUND STUDIO</span>
            <h2>脚本生成队列</h2>
            <p>提交后可继续创作。任务会按队列顺序自动执行，批次结束后统一通知。</p>
          </header>

          <section className="script-queue-concurrency">
            <div>
              <strong>并发生成</strong>
              <small>{queue.parallelConfigurable ? `至尊版最多同时生成 ${queue.maxConcurrency} 条` : '当前套餐按顺序逐条生成'}</small>
            </div>
            {queue.parallelConfigurable ? (
              <div className="script-queue-concurrency-options" aria-label="脚本生成并发数">
                {Array.from({ length: queue.maxConcurrency }, (_, index) => index + 1).map((value) => (
                  <button
                    type="button"
                    key={value}
                    disabled={savingConcurrency}
                    className={value === queue.concurrency ? 'active' : ''}
                    onClick={() => void updateConcurrency(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
            ) : (
              <button type="button" className="script-queue-upgrade" onClick={() => { setOpen(false); navigate('/membership'); }}>
                <CrownFilled />至尊版可调并发
              </button>
            )}
          </section>

          <section className="script-queue-active-list">
            <div className="script-queue-section-title">
              <strong>当前批次</strong>
              <span>{queue.activeCount ? `${queue.activeCount} 个任务` : '队列空闲'}</span>
            </div>
            {queue.items.filter((item) => item.status === 'running').map((item) => (
              <QueueCard key={item.id} item={item} detail="正在生成脚本结构与内容" />
            ))}
            {pendingItems.map((item, index) => (
              <QueueCard key={item.id} item={item} detail={`排队第 ${index + 1} 位`} onCancel={() => void cancelItem(item)} />
            ))}
            {!queue.activeCount ? (
              <div className="script-queue-empty">
                <OrderedListOutlined />
                <strong>没有等待中的任务</strong>
                <span>点击任意“生成脚本”，任务会自动出现在这里。</span>
              </div>
            ) : null}
          </section>

          {recentItems.length > 0 ? (
            <section className="script-queue-history">
              <div className="script-queue-section-title">
                <strong>最近完成</strong>
                <button type="button" disabled={loading} onClick={() => void loadQueue(false)}>{loading ? '刷新中' : '刷新'}</button>
              </div>
              {recentItems.slice(0, 12).map((item) => (
                <QueueCard key={item.id} item={item} detail={item.finishTime ? formatDateTime(item.finishTime) : ''} onOpen={() => openScript(item)} />
              ))}
            </section>
          ) : null}
        </div>
      </Drawer>
    </>
  );
};

interface QueueCardProps {
  item: ScriptQueueItem;
  detail: string;
  onCancel?: () => void;
  onOpen?: () => void;
}

const QueueCard = ({ item, detail, onCancel, onOpen }: QueueCardProps) => {
  const meta = statusMeta[item.status];
  return (
    <article className={`script-queue-card is-${item.status}`}>
      <span className="script-queue-card-status">{meta.icon}</span>
      <div>
        <strong>{item.taskLabel}</strong>
        <span>{item.errorMessage || detail}</span>
      </div>
      <div className="script-queue-card-action">
        <small>{meta.label}</small>
        {onCancel ? <button type="button" onClick={onCancel}>取消</button> : null}
        {onOpen && item.status === 'success' ? <button type="button" onClick={onOpen}>打开</button> : null}
      </div>
    </article>
  );
};

export default ScriptGenerationQueue;
