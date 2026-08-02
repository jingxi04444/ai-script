import { useEffect, useMemo, useState } from 'react';
import { Edit2, RefreshCcw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { userApi, type User } from '../../api/user';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, PageHeader, Pagination, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';

type UserForm = Partial<User>;

const UserListPage = () => {
  const { notify } = useAdminShell();
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState<User | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<UserForm>({});
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await userApi.getList({ page, pageSize, keyword: keyword || undefined });
      setUsers(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setUsers([]);
      setTotal(0);
      notify('用户列表加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize]);

  const openEdit = (user: User) => {
    setEditing(user);
    setForm(user);
    setEditorOpen(true);
  };

  const save = async () => {
    if (!editing) return;
    try {
      await userApi.update(editing.id, form);
      notify('用户已保存');
      setEditorOpen(false);
      load();
    } catch {
      notify('保存失败');
    }
  };

  const toggleStatus = async () => {
    if (!actionId) return;
    const current = users.find((item) => item.id === actionId);
    try {
      if (current?.status === 'disabled') {
        await userApi.enable(actionId);
        notify('用户已启用');
      } else {
        await userApi.disable(actionId);
        notify('用户已禁用');
      }
      setActionId(null);
      load();
    } catch {
      notify('状态变更失败');
    }
  };

  const rows = useMemo(() => users, [users]);

  return (
    <div className="page-stack">
      <PageHeader
        title="用户与权限"
        description="支持搜索、编辑、启用和禁用。"
        actions={
          <div className="toolbar-group">
            <input className="toolbar-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索用户名 / 邮箱 / 手机号" />
            <button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button>
          </div>
        }
      />

      <SectionCard title="用户列表" description="对接 /api/admin/users。">
        {rows.length ? (
          <>
            <div className="admin-table">
              <div className="table-head" style={{ gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 0.8fr 1fr' }}>
                <span>用户名</span><span>邮箱 / 手机</span><span>会员等级</span><span>状态</span><span>注册时间</span><span>操作</span>
              </div>
              {rows.map((user) => (
                <div className="table-row" style={{ gridTemplateColumns: '1.2fr 1fr 0.8fr 0.8fr 0.8fr 1fr' }} key={user.id}>
                  <strong>{user.username || user.nickname || '-'}</strong>
                  <span>{user.email || user.phone || '-'}</span>
                  <span>{user.memberLevel ?? '-'}</span>
                  <StatusBadge tone={user.status === 'disabled' ? 'gray' : 'green'}>{user.status || '-'}</StatusBadge>
                  <span>{user.createdAt || user.updateTime || '-'}</span>
                  <div className="table-actions">
                    <button className="table-btn" type="button" onClick={() => openEdit(user)}><Edit2 size={16} /></button>
                    <button className="table-btn" type="button" onClick={() => setActionId(user.id)}>{user.status === 'disabled' ? '启用' : '禁用'}</button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
          </>
        ) : (
          <EmptyState title={loading ? '加载中...' : '暂无用户数据'} description="列表为空时保持空态，不使用 mock 冒充真实数据。" icon={<ShieldCheck size={22} />} />
        )}
      </SectionCard>

      <Modal
        open={editorOpen}
        title="编辑用户"
        description="仅做基础字段编辑，具体字段以后端 VO 为准。"
        onClose={() => setEditorOpen(false)}
        footer={<><button className="modal-btn" type="button" onClick={() => setEditorOpen(false)}>取消</button><button className="modal-btn primary" type="button" onClick={save}><Save size={16} />保存</button></>}
      >
        <div className="field-grid">
          <label className="field"><span>用户名</span><input value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
          <label className="field"><span>邮箱</span><input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="field"><span>手机号</span><input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="field"><span>会员等级</span><input value={String(form.memberLevel ?? '')} onChange={(e) => setForm({ ...form, memberLevel: e.target.value })} /></label>
          <label className="field"><span>状态</span><input value={form.status || ''} onChange={(e) => setForm({ ...form, status: e.target.value as User['status'] })} placeholder="active / disabled" /></label>
        </div>
      </Modal>

      <Modal
        open={Boolean(actionId)}
        title="切换用户状态"
        description="确认启用或禁用该用户？"
        onClose={() => setActionId(null)}
        footer={<><button className="modal-btn" type="button" onClick={() => setActionId(null)}>取消</button><button className="modal-btn primary" type="button" onClick={toggleStatus}>确认</button></>}
      >
        <EmptyState title="状态切换" description="后台会调用 /enable 或 /disable 接口。" icon={<Trash2 size={22} />} />
      </Modal>
    </div>
  );
};

export default UserListPage;
