import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, ScrollText } from 'lucide-react';
import { systemApi, type OperationLog } from '../../api/system';
import { DEFAULT_PAGE_SIZE, EmptyState, PageHeader, Pagination, SectionCard } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';

const logColumns = '0.7fr 0.8fr minmax(260px, 1.5fr) 0.7fr minmax(150px, 0.9fr) minmax(170px, 1fr)';

const resultText: Record<string, string> = {
  success: '成功',
  failed: '失败',
};

const resultClass: Record<string, string> = {
  success: 'green',
  failed: 'red',
};

const OperationLogsPage = () => {
  const { notify } = useAdminShell();
  const [logs, setLogs] = useState<OperationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const load = async () => {
    setLoading(true);
    try {
      const data = await systemApi.getLogs({ page, pageSize });
      setLogs(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setLogs([]);
      setTotal(0);
      notify('操作日志加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize]);

  const rows = useMemo(() => logs, [logs]);

  return (
    <div className="page-stack">
      <PageHeader
        title="操作日志"
        description="操作日志单独展示，便于排查后台操作和接口结果。"
        actions={<button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button>}
      />

      <SectionCard title="操作日志列表" description="对接 /operation-logs。" action={<span className="status-badge blue">{total} 条</span>}>
        {rows.length ? (
          <>
            <div className="admin-table">
              <div className="table-head operation-log-row" style={{ gridTemplateColumns: logColumns }}>
                <span>用户</span><span>模块</span><span>动作</span><span>结果</span><span>IP</span><span>时间</span>
              </div>
              {rows.map((item) => (
                <div className="table-row operation-log-row" style={{ gridTemplateColumns: logColumns }} key={item.id}>
                  <strong title={item.userId || '-'}>{item.userId || '-'}</strong>
                  <span title={item.moduleCode || '-'}>{item.moduleCode || '-'}</span>
                  <span title={item.actionCode || '-'}>{item.actionCode || '-'}</span>
                  <span>
                    <span className={`status-badge ${resultClass[item.resultStatus || ''] || 'blue'}`}>
                      {resultText[item.resultStatus || ''] || item.resultStatus || '-'}
                    </span>
                  </span>
                  <span title={item.ipAddress || '-'}>{item.ipAddress || '-'}</span>
                  <span title={item.createTime || '-'}>{item.createTime || '-'}</span>
                </div>
              ))}
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
          </>
        ) : (
          <EmptyState title={loading ? '加载中...' : '暂无操作日志'} description="日志为空时展示空态。" icon={<ScrollText size={22} />} />
        )}
      </SectionCard>
    </div>
  );
};

export default OperationLogsPage;
