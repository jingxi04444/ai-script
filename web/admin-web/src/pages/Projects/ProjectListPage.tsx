import { useEffect, useMemo, useState } from 'react';
import { FolderKanban, RefreshCcw, Trash2 } from 'lucide-react';
import { projectApi, type Project } from '../../api/project';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, PageHeader, Pagination, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';

const ProjectListPage = () => {
  const { notify } = useAdminShell();
  const [keyword, setKeyword] = useState('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const load = async () => {
    setLoading(true);
    try {
      const data = await projectApi.getList({ page, pageSize, keyword: keyword || undefined });
      setProjects(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setProjects([]);
      setTotal(0);
      notify('项目列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize]);

  const remove = async () => {
    if (!deleteId) return;
    try {
      await projectApi.delete(deleteId);
      notify('项目已删除');
      setDeleteId(null);
      load();
    } catch {
      notify('删除失败');
    }
  };

  const rows = useMemo(() => projects, [projects]);

  return (
    <div className="page-stack">
      <PageHeader
        title="项目管理"
        description="查看用户项目、状态和更新时间，支持删除操作。"
        actions={
          <div className="toolbar-group">
            <input className="toolbar-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索项目名称 / 用户" />
            <button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button>
          </div>
        }
      />

      <SectionCard title="项目列表" description="对接 /api/admin/projects。">
        {rows.length ? (
          <>
            <div className="admin-table">
              <div className="table-head" style={{ gridTemplateColumns: '1.4fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr' }}>
                <span>项目名称</span><span>所属用户</span><span>分类</span><span>状态</span><span>更新时间</span><span>操作</span>
              </div>
              {rows.map((project) => (
                <div className="table-row" style={{ gridTemplateColumns: '1.4fr 0.8fr 0.8fr 0.8fr 0.8fr 0.8fr' }} key={project.id}>
                  <strong>{project.name || '-'}</strong>
                  <span>{project.username || project.userId || '-'}</span>
                  <span>{project.category || '-'}</span>
                  <StatusBadge tone={project.status === 'published' ? 'blue' : project.status === 'disabled' ? 'gray' : 'green'}>{project.status || '-'}</StatusBadge>
                  <span>{project.updatedAt || project.updateTime || project.createdAt || '-'}</span>
                  <div className="table-actions">
                    <button className="table-btn danger" type="button" onClick={() => setDeleteId(project.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
          </>
        ) : (
          <EmptyState
            title={loading ? '加载中...' : '暂无项目数据'}
            description="没有硬编码 mock 列表，后端返回空时会显示空态。"
            icon={<FolderKanban size={22} />}
          />
        )}
      </SectionCard>

      <Modal
        open={Boolean(deleteId)}
        title="删除项目"
        description="删除后无法恢复。"
        onClose={() => setDeleteId(null)}
        footer={<><button className="modal-btn" type="button" onClick={() => setDeleteId(null)}>取消</button><button className="modal-btn danger" type="button" onClick={remove}>删除</button></>}
      >
        <EmptyState title="请确认" description="该操作会删除项目记录及其入口。" icon={<Trash2 size={22} />} />
      </Modal>
    </div>
  );
};

export default ProjectListPage;
