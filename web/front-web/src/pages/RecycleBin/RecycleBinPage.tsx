import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClockCircleOutlined,
  DeleteOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  ReloadOutlined,
  RestOutlined,
  RollbackOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { Empty, Input, Modal, Pagination, Skeleton, message } from 'antd';
import HomeRail from '../../components/Layout/HomeRail';
import { recycleBinApi } from '../../api/recycleBin';
import type { RecycleBinItem, RecycleBinSummary, RecycleResourceType } from '../../types/recycleBin';
import { formatDateTime } from '../../utils/format';
import './recycle-bin-page.css';

type RecycleFilter = 'all' | RecycleResourceType;

const emptySummary: RecycleBinSummary = {
  total: 0,
  projectCount: 0,
  briefCount: 0,
  scriptCount: 0,
  retentionDays: 7,
};

const resourceMeta: Record<RecycleResourceType, {
  label: string;
  description: string;
  icon: typeof FolderOpenOutlined;
}> = {
  project: { label: '项目', description: '项目结构和关联内容仍被保留', icon: FolderOpenOutlined },
  brief: { label: 'Brief', description: '版本、卖点与协作信息仍被保留', icon: FileTextOutlined },
  script: { label: '脚本', description: '历史版本和审核记录仍被保留', icon: RestOutlined },
};

const RecycleBinPage = () => {
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [summary, setSummary] = useState<RecycleBinSummary>(emptySummary);
  const [filter, setFilter] = useState<RecycleFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [operating, setOperating] = useState(false);
  const pageSize = 12;

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [pageResult, summaryResult] = await Promise.all([
        recycleBinApi.list({
          page,
          pageSize,
          resourceType: filter === 'all' ? undefined : filter,
          keyword: keyword || undefined,
        }),
        recycleBinApi.summary(),
      ]);
      setItems(Array.isArray(pageResult?.list) ? pageResult.list : []);
      setTotal(Number(pageResult?.total) || 0);
      setSummary(summaryResult || emptySummary);
      setSelectedIds([]);
    } catch {
      setItems([]);
      setTotal(0);
      setLoadError('回收站暂时无法加载，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [filter, keyword, page]);

  useEffect(() => { void load(); }, [load]);

  const changeFilter = (nextFilter: RecycleFilter) => {
    setFilter(nextFilter);
    setPage(1);
    setSelectedIds([]);
  };

  const submitSearch = () => {
    setKeyword(searchValue.trim());
    setPage(1);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => current.includes(id)
      ? current.filter((candidate) => candidate !== id)
      : [...current, id]);
  };

  const restoreItems = async (ids: string[]) => {
    if (!ids.length) return;
    setOperating(true);
    try {
      if (ids.length === 1) await recycleBinApi.restore(ids[0]);
      else await recycleBinApi.restoreBatch(ids);
      message.success(ids.length === 1 ? '内容已恢复' : `已恢复 ${ids.length} 项内容`);
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : '恢复失败，请稍后重试');
    } finally {
      setOperating(false);
    }
  };

  const confirmPurge = (ids: string[], names?: string[]) => {
    if (!ids.length) return;
    const targetLabel = ids.length === 1 && names?.[0] ? `“${names[0]}”` : `选中的 ${ids.length} 项内容`;
    Modal.confirm({
      centered: true,
      title: `永久删除${targetLabel}？`,
      content: '永久删除后无法恢复。系统仍会保留必要的操作审计记录。',
      okText: '永久删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setOperating(true);
        try {
          if (ids.length === 1) await recycleBinApi.purge(ids[0]);
          else await recycleBinApi.purgeBatch(ids);
          message.success(ids.length === 1 ? '已永久删除' : `已永久删除 ${ids.length} 项内容`);
          await load();
        } catch (error) {
          message.error(error instanceof Error ? error.message : '永久删除失败，请稍后重试');
          throw error;
        } finally {
          setOperating(false);
        }
      },
    });
  };

  const filterItems: Array<{ key: RecycleFilter; label: string; count: number }> = [
    { key: 'all', label: '全部', count: summary.total },
    { key: 'project', label: '项目', count: summary.projectCount },
    { key: 'brief', label: 'Brief', count: summary.briefCount },
    { key: 'script', label: '脚本', count: summary.scriptCount },
  ];

  return (
    <div className="recycle-bin-shell">
      <HomeRail activeLabel="回收站" />
      <main className="recycle-bin-page">
        <header className="recycle-bin-hero">
          <div className="recycle-bin-hero-copy">
            <span className="recycle-bin-eyebrow"><RestOutlined /> RECOVERY ARCHIVE</span>
            <h1>回收站</h1>
            <p>误删不必重做。项目、Brief 和脚本会在这里完整保留 {summary.retentionDays} 天。</p>
          </div>
          <div className="recycle-bin-retention-card" aria-label={`默认保留 ${summary.retentionDays} 天`}>
            <div><ClockCircleOutlined /></div>
            <span>自动保留</span>
            <strong>{summary.retentionDays}<small>天</small></strong>
            <p>到期后系统将在凌晨自动清理</p>
          </div>
        </header>

        <section className="recycle-bin-overview" aria-label="回收站统计">
          {(['project', 'brief', 'script'] as RecycleResourceType[]).map((type) => {
            const meta = resourceMeta[type];
            const Icon = meta.icon;
            const count = type === 'project' ? summary.projectCount : type === 'brief' ? summary.briefCount : summary.scriptCount;
            return (
              <button key={type} type="button" className={filter === type ? 'is-active' : ''} onClick={() => changeFilter(type)}>
                <span><Icon /></span>
                <div><small>{meta.label}</small><strong>{count}</strong></div>
                <em>待处理</em>
              </button>
            );
          })}
        </section>

        <section className="recycle-bin-panel">
          <div className="recycle-bin-toolbar">
            <nav aria-label="回收站类型筛选">
              {filterItems.map((item) => (
                <button key={item.key} className={filter === item.key ? 'is-active' : ''} type="button" onClick={() => changeFilter(item.key)}>
                  {item.label}<span>{item.count}</span>
                </button>
              ))}
            </nav>
            <div className="recycle-bin-search">
              <Input
                allowClear
                prefix={<SearchOutlined />}
                placeholder="搜索已删除内容"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                onPressEnter={submitSearch}
                onClear={() => { setSearchValue(''); setKeyword(''); setPage(1); }}
              />
              <button type="button" onClick={submitSearch}>搜索</button>
              <button type="button" className="is-icon" aria-label="刷新回收站" onClick={() => void load()}><ReloadOutlined /></button>
            </div>
          </div>

          {selectedIds.length ? (
            <div className="recycle-bin-batch-bar">
              <span>已选择 <strong>{selectedIds.length}</strong> 项</span>
              <div>
                <button type="button" disabled={operating} onClick={() => void restoreItems(selectedIds)}><RollbackOutlined /> 批量恢复</button>
                <button type="button" className="is-danger" disabled={operating} onClick={() => confirmPurge(selectedIds)}><DeleteOutlined /> 永久删除</button>
              </div>
            </div>
          ) : null}

          {loadError ? (
            <div className="recycle-bin-state is-error" role="alert">
              <RestOutlined />
              <strong>回收站加载失败</strong>
              <p>{loadError}</p>
              <button type="button" onClick={() => void load()}><ReloadOutlined /> 重新加载</button>
            </div>
          ) : loading ? (
            <div className="recycle-bin-skeletons">
              {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} active avatar paragraph={{ rows: 1 }} />)}
            </div>
          ) : items.length ? (
            <div className="recycle-bin-list">
              {items.map((item) => {
                const meta = resourceMeta[item.resourceType];
                const Icon = meta.icon;
                const selected = selectedIdSet.has(item.id);
                const urgent = item.remainingDays <= 1;
                return (
                  <article key={item.id} className={`${selected ? 'is-selected' : ''} ${urgent ? 'is-urgent' : ''}`}>
                    <button
                      type="button"
                      className={`recycle-bin-check ${selected ? 'is-checked' : ''}`}
                      aria-label={selected ? `取消选择 ${item.resourceName}` : `选择 ${item.resourceName}`}
                      aria-pressed={selected}
                      onClick={() => toggleSelected(item.id)}
                    ><span /></button>
                    <div className={`recycle-bin-resource-icon is-${item.resourceType}`}><Icon /></div>
                    <div className="recycle-bin-item-copy">
                      <div><span>{meta.label}</span>{item.parentId ? <small>项目 #{item.parentId}</small> : null}</div>
                      <strong>{item.resourceName || `未命名${meta.label}`}</strong>
                      <p>{meta.description}</p>
                    </div>
                    <div className="recycle-bin-item-time">
                      <small>删除时间</small>
                      <span>{formatDateTime(item.deletedAt)}</span>
                    </div>
                    <div className={`recycle-bin-countdown ${urgent ? 'is-urgent' : ''}`}>
                      <small>{item.remainingDays === 0 ? '即将清理' : '剩余时间'}</small>
                      <strong>{item.remainingDays === 0 ? '今天' : `${item.remainingDays} 天`}</strong>
                      <span>{formatDateTime(item.expireAt)}</span>
                    </div>
                    <div className="recycle-bin-item-actions">
                      <button type="button" disabled={operating} onClick={() => void restoreItems([item.id])}><RollbackOutlined /> 恢复</button>
                      <button type="button" className="is-danger" disabled={operating} onClick={() => confirmPurge([item.id], [item.resourceName])}><DeleteOutlined /> 永久删除</button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="recycle-bin-empty">
              <Empty image={<RestOutlined />} description={keyword ? '没有找到匹配的已删除内容' : '回收站是空的'} />
              <p>{keyword ? '可以更换关键词或类型后再试。' : '删除的项目、Brief 和脚本会在这里保留一段时间。'}</p>
            </div>
          )}

          {total > pageSize ? (
            <Pagination current={page} pageSize={pageSize} total={total} showSizeChanger={false} onChange={setPage} />
          ) : null}
        </section>
      </main>
    </div>
  );
};

export default RecycleBinPage;
