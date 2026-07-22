import { useEffect, useMemo, useState } from 'react';
import { RefreshCcw, Trash2, UploadCloud } from 'lucide-react';
import { systemApi, type ImportTemplate } from '../../api/system';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, PageHeader, Pagination, SectionCard } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';

const ImportTemplatesPage = () => {
  const { notify } = useAdminShell();
  const [templates, setTemplates] = useState<ImportTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const load = async () => {
    setLoading(true);
    try {
      const data = await systemApi.getImportTemplates({ page, pageSize });
      setTemplates(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setTemplates([]);
      setTotal(0);
      notify('导入模板加载失败');
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
      await systemApi.deleteImportTemplate(deleteId);
      notify('导入模板已删除');
      setDeleteId(null);
      load();
    } catch {
      notify('删除失败');
    }
  };

  const upload = async (id: string, file?: File) => {
    if (!file) return;
    setUploadingId(id);
    try {
      const updated = await systemApi.uploadImportTemplateFile(id, file);
      setTemplates((items) => items.map((item) => (item.id === id ? { ...item, ...updated } : item)));
      notify('模板文件已上传，链接已更新');
      await load();
    } catch {
      notify('上传失败');
    } finally {
      setUploadingId(null);
    }
  };

  const rows = useMemo(() => templates, [templates]);

  return (
    <div className="page-stack">
      <PageHeader
        title="导入模板"
        description="单独管理卖点、爆款脚本等导入模板文件。"
        actions={<button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button>}
      />

      <SectionCard title="导入模板列表" description="对接 /system/import-templates。" action={<span className="status-badge purple">{rows.length} 条</span>}>
        {rows.length ? (
          <>
          <div className="admin-table">
            <div className="table-head" style={{ gridTemplateColumns: '1fr 0.8fr 1fr 1.2fr 0.7fr 0.9fr' }}>
              <span>模板名称</span><span>类型</span><span>下载文件名</span><span>文件链接</span><span>状态</span><span>操作</span>
            </div>
            {rows.map((item) => (
              <div className="table-row" style={{ gridTemplateColumns: '1fr 0.8fr 1fr 1.2fr 0.7fr 0.9fr' }} key={item.id}>
                <strong>{item.templateName || '-'}</strong>
                <span>{item.templateType || '-'}</span>
                <span>{item.downloadFileName || '-'}</span>
                {item.templateFileUrl ? <a className="table-link" href={item.templateFileUrl} target="_blank" rel="noreferrer">查看文件</a> : <span>-</span>}
                <span>{item.status === 0 ? '禁用' : '启用'}</span>
                <div className="table-actions">
                  <label className="table-btn upload-btn">
                    <UploadCloud size={16} />{uploadingId === item.id ? '上传中' : '上传'}
                    <input type="file" hidden onChange={(event) => upload(item.id, event.target.files?.[0])} />
                  </label>
                  <button className="table-btn danger" type="button" onClick={() => setDeleteId(item.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
          </>
        ) : (
          <EmptyState title={loading ? '加载中...' : '暂无导入模板'} description="导入模板独立展示，避免和 Prompt/脚本模板混在一起。" icon={<UploadCloud size={22} />} />
        )}
      </SectionCard>

      <Modal open={Boolean(deleteId)} title="删除导入模板" description="确认删除该导入模板？" onClose={() => setDeleteId(null)} footer={<><button className="modal-btn" type="button" onClick={() => setDeleteId(null)}>取消</button><button className="modal-btn danger" type="button" onClick={remove}>删除</button></>}>
        <EmptyState title="危险操作" description="删除后相关导入配置将失效。" icon={<Trash2 size={22} />} />
      </Modal>
    </div>
  );
};

export default ImportTemplatesPage;
