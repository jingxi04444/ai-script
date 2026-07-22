import { useEffect, useMemo, useState } from 'react';
import { ListChecks, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { systemApi, type Permission } from '../../api/system';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, PageHeader, Pagination, SectionCard } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';

type PermissionForm = Partial<Permission>;

const emptyPermission: PermissionForm = { permissionName: '', permissionCode: '', moduleCode: '', permissionType: '', status: 1 };

const PermissionsPage = () => {
  const { notify } = useAdminShell();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(false);
  const [permissionPage, setPermissionPage] = useState(1);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Permission | null>(null);
  const [form, setForm] = useState<PermissionForm>(emptyPermission);
  const [permissionPageSize, setPermissionPageSize] = useState(DEFAULT_PAGE_SIZE);

  const load = async () => {
    setLoading(true);
    try {
      const permissionData = await systemApi.getPermissions();
      setPermissions(Array.isArray(permissionData) ? permissionData : []);
    } catch {
      setPermissions([]);
      notify('权限数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    if (!form.permissionName?.trim()) {
      notify('请填写权限名称');
      return;
    }
    try {
      if (editing) {
        await systemApi.updatePermission(editing.id, form);
        notify('权限已更新');
      } else {
        await systemApi.createPermission(form);
        notify('权限已创建');
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
      await systemApi.deletePermission(deleteId);
      notify('权限已删除');
      setDeleteId(null);
      load();
    } catch {
      notify('删除失败');
    }
  };

  const permissionRows = useMemo(() => {
    const start = (permissionPage - 1) * permissionPageSize;
    return permissions.slice(start, start + permissionPageSize);
  }, [permissionPage, permissionPageSize, permissions]);

  return (
    <div className="page-stack">
      <PageHeader
        title="权限管理"
        description="权限列表单独展示；操作日志请在左侧菜单进入。"
        actions={<div className="toolbar-group"><button className="toolbar-btn" type="button" onClick={() => { setPermissionPage(1); load(); }}><RefreshCcw size={16} />刷新</button><button className="toolbar-btn primary" type="button" onClick={() => { setEditing(null); setForm(emptyPermission); setEditorOpen(true); }}><Save size={16} />新增权限</button></div>}
      />

      <SectionCard title="权限列表" description="对接 /system/permissions。">
        {permissionRows.length ? (
          <>
            <div className="admin-table">
            <div className="table-head" style={{ gridTemplateColumns: '1fr 1fr 0.8fr 0.8fr 0.7fr' }}>
              <span>名称</span><span>编码</span><span>模块</span><span>类型</span><span>操作</span>
            </div>
            {permissionRows.map((item) => (
              <div className="table-row" style={{ gridTemplateColumns: '1fr 1fr 0.8fr 0.8fr 0.7fr' }} key={item.id}>
                <strong>{item.permissionName || '-'}</strong>
                <span>{item.permissionCode || '-'}</span>
                <span>{item.moduleCode || '-'}</span>
                <span>{item.permissionType || '-'}</span>
                <div className="table-actions">
                  <button className="table-btn" type="button" onClick={() => { setEditing(item); setForm(item); setEditorOpen(true); }}>编辑</button>
                  <button className="table-btn danger" type="button" onClick={() => setDeleteId(item.id)}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            </div>
            <Pagination page={permissionPage} pageSize={permissionPageSize} total={permissions.length} onChange={setPermissionPage} onPageSizeChange={(size) => { setPermissionPage(1); setPermissionPageSize(size); }} />
          </>
        ) : (
          <EmptyState title={loading ? '加载中...' : '暂无权限'} description="权限会展示为空态，直到后端返回数据。" icon={<ListChecks size={22} />} />
        )}
      </SectionCard>

      <Modal open={editorOpen} title={editing ? '编辑权限' : '新增权限'} description="保存后同步到后端。" onClose={() => setEditorOpen(false)} footer={<><button className="modal-btn" type="button" onClick={() => setEditorOpen(false)}>取消</button><button className="modal-btn primary" type="button" onClick={save}><Save size={16} />保存</button></>}> 
        <div className="field-grid">
          <label className="field"><span>名称</span><input value={form.permissionName || ''} onChange={(e) => setForm({ ...form, permissionName: e.target.value })} /></label>
          <label className="field"><span>编码</span><input value={form.permissionCode || ''} onChange={(e) => setForm({ ...form, permissionCode: e.target.value })} /></label>
          <label className="field"><span>模块</span><input value={form.moduleCode || ''} onChange={(e) => setForm({ ...form, moduleCode: e.target.value })} /></label>
          <label className="field"><span>类型</span><input value={form.permissionType || ''} onChange={(e) => setForm({ ...form, permissionType: e.target.value })} /></label>
        </div>
        <label className="field" style={{ marginTop: 14 }}><span>状态</span><input type="number" value={form.status ?? 1} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })} /></label>
      </Modal>

      <Modal open={Boolean(deleteId)} title="删除权限" description="确认删除该权限？" onClose={() => setDeleteId(null)} footer={<><button className="modal-btn" type="button" onClick={() => setDeleteId(null)}>取消</button><button className="modal-btn danger" type="button" onClick={remove}>删除</button></>}>
        <EmptyState title="危险操作" description="删除权限可能影响角色授权。" icon={<Trash2 size={22} />} />
      </Modal>
    </div>
  );
};

export default PermissionsPage;
