import { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, RefreshCcw, Trash2 } from 'lucide-react';
import { systemApi, type ScriptFormat } from '../../api/system';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, PageHeader, Pagination, SectionCard } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import { optionalNumberFromInput } from '../../utils/form';
import './script-formats-page.css';

const emptyForm: Partial<ScriptFormat> = { name: '', code: '', formatRequirement: '', sortOrder: 0, status: 1 };

interface ScriptFormatsPageProps {
  briefMode?: boolean;
  embedded?: boolean;
}

const ScriptFormatsPage = ({ briefMode = false, embedded = false }: ScriptFormatsPageProps) => {
  const { notify } = useAdminShell();
  const [formats, setFormats] = useState<ScriptFormat[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Partial<ScriptFormat> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await systemApi.getScriptFormats({ page, pageSize });
      setFormats(data.list || []);
      setTotal(data.total || 0);
    } catch {
      notify('脚本格式加载失败');
      setFormats([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, pageSize]);

  const rows = useMemo(() => formats, [formats]);

  const save = async () => {
    if (!editing?.name || !editing?.code) {
      notify('请填写名称和编码');
      return;
    }
    try {
      if (editing.id) await systemApi.updateScriptFormat(editing.id, editing);
      else await systemApi.createScriptFormat(editing);
      notify('脚本格式已保存');
      setEditing(null);
      load();
    } catch {
      notify('保存失败');
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      await systemApi.deleteScriptFormat(deleteId);
      notify('脚本格式已删除');
      setDeleteId(null);
      load();
    } catch {
      notify('删除失败');
    }
  };

  return (
    <div className={embedded ? 'page-stack script-formats-embedded' : 'page-stack'}>
      {!embedded && <PageHeader
        title={briefMode ? '脚本格式（产品和剧情类）' : '脚本格式'}
        description={briefMode ? '统一维护卖点 Brief 后续生成产品类、剧情类脚本时可选择的输出格式与格式要求。' : '维护前台可选的脚本输出格式和格式要求。'}
        actions={<><button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button><button className="toolbar-btn primary" type="button" onClick={() => setEditing(emptyForm)}><Plus size={16} />新增格式</button></>}
      />}

      <SectionCard title={briefMode ? '产品和剧情类脚本格式' : '脚本格式列表'} description={briefMode ? '产品类与剧情类生成流程共用当前启用的格式配置。' : '维护脚本生成器可选的输出格式和格式要求。'} action={<div className="table-actions"><span className="status-badge purple">{rows.length} 条</span>{embedded && <><button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button><button className="toolbar-btn primary" type="button" onClick={() => setEditing(emptyForm)}><Plus size={16} />新增格式</button></>}</div>}>
        {rows.length ? <>
          <div className="admin-table script-format-table">
            <div className="table-head">
              <span>名称</span><span>编码</span><span>格式要求</span><span>排序</span><span>状态</span><span>操作</span>
            </div>
            {rows.map((item) => (
              <div className="table-row" key={item.id}>
                <strong>{item.name || '-'}</strong><span>{item.code || '-'}</span><span title={item.formatRequirement || '-'}>{item.formatRequirement || '-'}</span><span>{item.sortOrder ?? 0}</span><span>{item.status === 0 ? '禁用' : '启用'}</span>
                <div className="table-actions"><button className="table-btn" type="button" onClick={() => setEditing(item)}><Edit3 size={16} /></button><button className="table-btn danger" type="button" onClick={() => setDeleteId(item.id)}><Trash2 size={16} /></button></div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
        </> : <EmptyState title={loading ? '加载中...' : '暂无脚本格式'} description="新增 storyboard、oral、shot 等格式后，前台可读取启用列表。" icon={<Edit3 size={22} />} />}
      </SectionCard>

      <Modal open={Boolean(editing)} title={editing?.id ? '编辑脚本格式' : '新增脚本格式'} onClose={() => setEditing(null)} footer={<><button className="modal-btn" type="button" onClick={() => setEditing(null)}>取消</button><button className="modal-btn primary" type="button" onClick={save}>保存</button></>}>
        <div className="field-grid">
          <label className="field"><span>名称</span><input value={editing?.name || ''} onChange={(e) => setEditing((v) => ({ ...v, name: e.target.value }))} /></label>
          <label className="field"><span>编码</span><input value={editing?.code || ''} onChange={(e) => setEditing((v) => ({ ...v, code: e.target.value }))} /></label>
          <label className="field"><span>排序</span><input type="number" value={editing?.sortOrder ?? ''} onChange={(e) => setEditing((v) => ({ ...v, sortOrder: optionalNumberFromInput(e.target.value) }))} /></label>
          <label className="field"><span>状态</span><input type="number" value={editing?.status ?? ''} onChange={(e) => setEditing((v) => ({ ...v, status: optionalNumberFromInput(e.target.value) }))} placeholder="1启用 / 0禁用" /></label>
        </div>
        <label className="field" style={{ marginTop: 14 }}><span>格式要求</span><textarea rows={6} value={editing?.formatRequirement || ''} onChange={(e) => setEditing((v) => ({ ...v, formatRequirement: e.target.value }))} /></label>
      </Modal>

      <Modal open={Boolean(deleteId)} title="删除脚本格式" description="确认删除该脚本格式？" onClose={() => setDeleteId(null)} footer={<><button className="modal-btn" type="button" onClick={() => setDeleteId(null)}>取消</button><button className="modal-btn danger" type="button" onClick={remove}>删除</button></>}>
        <EmptyState title="危险操作" description="删除后前台将不再读取该格式。" icon={<Trash2 size={22} />} />
      </Modal>
    </div>
  );
};

export default ScriptFormatsPage;
