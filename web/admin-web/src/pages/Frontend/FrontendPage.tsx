import { useEffect, useMemo, useState } from 'react';
import { Database, Plus, RefreshCcw, Settings2, Trash2 } from 'lucide-react';
import { tenantApi, type Tenant } from '../../api/tenant';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, PageHeader, Pagination, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import { optionalNumberFromInput } from '../../utils/form';

type TenantForm = Partial<Tenant>;

const emptyForm: TenantForm = {
  tenantName: '',
  tenantCode: '',
  domain: '',
  contactName: '',
  contactPhone: '',
  status: 1,
};

const FrontendPage = () => {
  const { notify } = useAdminShell();
  const [keyword, setKeyword] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [editorOpen, setEditorOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Tenant | null>(null);
  const [form, setForm] = useState<TenantForm>(emptyForm);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const load = async () => {
    setLoading(true);
    try {
      const data = await tenantApi.getList({ page, pageSize, keyword: keyword || undefined });
      setTenants(data.list || []);
      setTotal(data.total || 0);
    } catch {
      setTenants([]);
      setTotal(0);
      notify('前台配置数据加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [page, pageSize]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setEditorOpen(true);
  };

  const openEdit = (tenant: Tenant) => {
    setEditing(tenant);
    setForm(tenant);
    setEditorOpen(true);
  };

  const save = async () => {
    if (!form.tenantName?.trim()) {
      notify('请填写租户名称');
      return;
    }
    try {
      if (editing) {
        await tenantApi.update(editing.id, form);
        notify('租户已更新');
      } else {
        await tenantApi.create(form);
        notify('租户已创建');
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
      await tenantApi.delete(deleteId);
      notify('租户已删除');
      setDeleteId(null);
      load();
    } catch {
      notify('删除失败');
    }
  };

  const rows = useMemo(() => tenants, [tenants]);

  return (
    <div className="page-stack">
      <PageHeader
        title="前台配置"
        description="当前优先承载租户和品牌配置；前台开关策略可继续扩展。"
        actions={
          <div className="toolbar-group">
            <input className="toolbar-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索租户 / 品牌 / 域名" />
            <button className="toolbar-btn" onClick={() => { setPage(1); if (page === 1) load(); }} type="button"><RefreshCcw size={16} />刷新</button>
            <button className="toolbar-btn primary" onClick={openCreate} type="button"><Plus size={16} />新增租户</button>
          </div>
        }
      />

      <div className="page-grid">
        <SectionCard title="前台开关" description="未接入专门配置接口，先保留结构化入口。">
          <EmptyState
            title="前台配置面板"
            description="登录拦截、首页开关、充值入口和脚本入口策略后续可对接专门配置接口。"
            icon={<Settings2 size={22} />}
          />
        </SectionCard>

        <SectionCard title="租户数据" description="与前台品牌、域名、联系人等基础配置相关。">
          {rows.length ? (
            <>
            <div className="admin-table">
              <div className="table-head" style={{ gridTemplateColumns: '1.2fr 0.9fr 1.2fr 0.8fr 0.8fr 0.8fr' }}>
                <span>租户名称</span><span>编码</span><span>域名</span><span>联系人</span><span>状态</span><span>操作</span>
              </div>
              {rows.map((tenant) => (
                <div className="table-row" style={{ gridTemplateColumns: '1.2fr 0.9fr 1.2fr 0.8fr 0.8fr 0.8fr' }} key={tenant.id}>
                  <strong>{tenant.tenantName || '-'}</strong>
                  <span>{tenant.tenantCode || '-'}</span>
                  <span>{tenant.domain || '-'}</span>
                  <span>{tenant.contactName || '-'}</span>
                  <StatusBadge tone={tenant.status === 0 ? 'gray' : 'green'}>{tenant.status === 0 ? '禁用' : '启用'}</StatusBadge>
                  <div className="table-actions">
                    <button className="table-btn" type="button" onClick={() => openEdit(tenant)}>编辑</button>
                    <button className="table-btn danger" type="button" onClick={() => setDeleteId(tenant.id)}><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
            </>
          ) : (
            <EmptyState
              title={loading ? '加载中...' : '暂无租户数据'}
              description="可以先创建一个租户，或等待后端返回真实数据。"
              icon={<Database size={22} />}
            />
          )}
        </SectionCard>
      </div>

      <Modal
        open={editorOpen}
        title={editing ? '编辑租户' : '新增租户'}
        description="填写基础信息后保存到后端。"
        onClose={() => setEditorOpen(false)}
        footer={<><button className="modal-btn" type="button" onClick={() => setEditorOpen(false)}>取消</button><button className="modal-btn primary" type="button" onClick={save}>保存</button></>}
      >
        <div className="field-grid">
          <label className="field"><span>租户名称</span><input value={form.tenantName || ''} onChange={(e) => setForm({ ...form, tenantName: e.target.value })} placeholder="例如：品牌 A" /></label>
          <label className="field"><span>租户编码</span><input value={form.tenantCode || ''} onChange={(e) => setForm({ ...form, tenantCode: e.target.value })} placeholder="tenant-a" /></label>
          <label className="field"><span>域名</span><input value={form.domain || ''} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="https://example.com" /></label>
          <label className="field"><span>状态</span><input type="number" value={form.status ?? ''} onChange={(e) => setForm({ ...form, status: optionalNumberFromInput(e.target.value) })} placeholder="1 / 0" /></label>
          <label className="field"><span>联系人</span><input value={form.contactName || ''} onChange={(e) => setForm({ ...form, contactName: e.target.value })} /></label>
          <label className="field"><span>联系电话</span><input value={form.contactPhone || ''} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} /></label>
        </div>
      </Modal>

      <Modal
        open={Boolean(deleteId)}
        title="删除租户"
        description="删除后无法恢复，确认继续？"
        onClose={() => setDeleteId(null)}
        footer={<><button className="modal-btn" type="button" onClick={() => setDeleteId(null)}>取消</button><button className="modal-btn danger" type="button" onClick={remove}>删除</button></>}
      >
        <EmptyState title="危险操作" description="请确认该租户未被前台业务继续使用。" icon={<Trash2 size={22} />} />
      </Modal>
    </div>
  );
};

export default FrontendPage;
