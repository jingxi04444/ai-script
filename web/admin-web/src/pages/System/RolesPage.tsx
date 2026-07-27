import { useEffect, useMemo, useState } from 'react';
import { KeyRound, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { systemApi, type Role } from '../../api/system';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, PageHeader, Pagination, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import { optionalNumberFromInput } from '../../utils/form';

type RoleForm = Partial<Role>;

const emptyRole: RoleForm = { roleName: '', roleCode: '', description: '', status: 1 };

const RolesPage = () => {
  const { notify } = useAdminShell();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyRole);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const load = async () => {
    setLoading(true);
    try {
      const data = await systemApi.getRoles({ page, pageSize });
      setRoles(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setRoles([]);
      setTotal(0);
      notify('角色加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize]);

  const save = async () => {
    if (!form.roleName?.trim()) {
      notify('请填写角色名称');
      return;
    }
    try {
      if (editing) {
        await systemApi.updateRole(editing.id, form);
        notify('角色已更新');
      } else {
        await systemApi.createRole(form);
        notify('角色已创建');
      }
      setEditorOpen(false);
      load();
    } catch {
      notify('保存失败');
    }
  };

  const remove = async () => {
    if (!deleteId) return;
    try {
      await systemApi.deleteRole(deleteId);
      notify('角色已删除');
      setDeleteId(null);
      load();
    } catch {
      notify('删除失败');
    }
  };

  const rows = useMemo(() => roles, [roles]);

  return (
    <div className="page-stack">
      <PageHeader
        title="角色管理"
        description="角色作为单独菜单展示，不再和权限放在一个页面。"
        actions={<div className="toolbar-group"><button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button><button className="toolbar-btn primary" type="button" onClick={() => { setEditing(null); setForm(emptyRole); setEditorOpen(true); }}><Save size={16} />新增角色</button></div>}
      />

      <SectionCard title="角色列表" description="对接 /system/roles。">
        {rows.length ? (
          <>
          <div className="admin-table">
            <div className="table-head" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr' }}>
              <span>名称</span><span>编码</span><span>状态</span><span>操作</span>
            </div>
            {rows.map((item) => (
              <div className="table-row" style={{ gridTemplateColumns: '1.2fr 1fr 1fr 0.8fr' }} key={item.id}>
                <strong>{item.roleName || '-'}</strong>
                <span>{item.roleCode || '-'}</span>
                <StatusBadge tone={item.status === 0 ? 'gray' : 'green'}>{item.status === 0 ? '禁用' : '启用'}</StatusBadge>
                <div className="table-actions">
                  <button className="table-btn" type="button" onClick={() => { setEditing(item); setForm(item); setEditorOpen(true); }}>编辑</button>
                  <button className="table-btn danger" type="button" onClick={() => setDeleteId(item.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
          <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
          </>
        ) : (
          <EmptyState title={loading ? '加载中...' : '暂无角色'} description="后端没有数据时显示空态。" icon={<KeyRound size={22} />} />
        )}
      </SectionCard>

      <Modal open={editorOpen} title={editing ? '编辑角色' : '新增角色'} description="保存后同步到后端。" onClose={() => setEditorOpen(false)} footer={<><button className="modal-btn" type="button" onClick={() => setEditorOpen(false)}>取消</button><button className="modal-btn primary" type="button" onClick={save}><Save size={16} />保存</button></>}>
        <div className="field-grid">
          <label className="field"><span>名称</span><input value={form.roleName || ''} onChange={(e) => setForm({ ...form, roleName: e.target.value })} /></label>
          <label className="field"><span>编码</span><input value={form.roleCode || ''} onChange={(e) => setForm({ ...form, roleCode: e.target.value })} /></label>
          <label className="field"><span>状态</span><input type="number" value={form.status ?? ''} onChange={(e) => setForm({ ...form, status: optionalNumberFromInput(e.target.value) })} /></label>
        </div>
        <label className="field" style={{ marginTop: 14 }}><span>描述</span><textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      </Modal>

      <Modal open={Boolean(deleteId)} title="删除角色" description="确认删除该角色？" onClose={() => setDeleteId(null)} footer={<><button className="modal-btn" type="button" onClick={() => setDeleteId(null)}>取消</button><button className="modal-btn danger" type="button" onClick={remove}>删除</button></>}>
        <EmptyState title="危险操作" description="删除角色前请确认未被用户使用。" icon={<Trash2 size={22} />} />
      </Modal>
    </div>
  );
};

export default RolesPage;
