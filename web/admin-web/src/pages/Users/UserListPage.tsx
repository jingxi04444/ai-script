import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Crown, Edit2, RefreshCcw, Save, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { membershipApi, type MembershipPlan } from '../../api/membership';
import {
  userApi,
  type UserMembershipAdjustPayload,
  type InternalUserCreatePayload,
  type User,
} from '../../api/user';
import { DEFAULT_PAGE_SIZE, EmptyState, Modal, PageHeader, Pagination, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import './user-list-page.css';

type UserForm = Pick<User, 'username' | 'email' | 'phone'>;

const emptyCreateForm: InternalUserCreatePayload = {
  username: '',
  email: '',
  phone: '',
  password: '123456',
  planId: '',
  skuId: '',
  validDays: 365,
};

const emptyMembershipForm: UserMembershipAdjustPayload = {
  planId: '',
  skuId: '',
  validDays: 365,
};

const UserListPage = () => {
  const { notify } = useAdminShell();
  const [keyword, setKeyword] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [editing, setEditing] = useState<User | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<UserForm>({ username: '', email: '', phone: '' });
  const [actionId, setActionId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<InternalUserCreatePayload>(emptyCreateForm);
  const [membershipUser, setMembershipUser] = useState<User | null>(null);
  const [membershipForm, setMembershipForm] = useState<UserMembershipAdjustPayload>(emptyMembershipForm);
  const [saving, setSaving] = useState(false);

  const enabledPlans = useMemo(() => plans.filter((plan) => plan.status === 1), [plans]);

  const getPlan = (planId: string) => enabledPlans.find((plan) => plan.id === planId);

  const selectInitialMembership = (preferredPlanId?: string, preferredSkuId?: string) => {
    const plan = getPlan(preferredPlanId || '') || enabledPlans[0];
    const skus = plan?.skus.filter((sku) => sku.status === 1) || [];
    return { planId: plan?.id || '', skuId: skus.find((sku) => sku.id === preferredSkuId)?.id || skus[0]?.id || '' };
  };

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

  useEffect(() => {
    membershipApi.getPlans().then(setPlans).catch(() => notify('会员套餐加载失败'));
  }, []);

  const openEdit = (user: User) => {
    setEditing(user);
    setForm({ username: user.username || '', email: user.email || '', phone: user.phone || '' });
    setEditorOpen(true);
  };

  const openCreate = () => {
    const selection = selectInitialMembership();
    setCreateForm({ ...emptyCreateForm, ...selection });
    setCreateOpen(true);
  };

  const openMembership = (user: User) => {
    const selection = selectInitialMembership(user.planId, user.skuId);
    setMembershipForm({ ...emptyMembershipForm, ...selection });
    setMembershipUser(user);
  };

  const changeCreatePlan = (planId: string) => {
    const plan = getPlan(planId);
    const skuId = plan?.skus.find((sku) => sku.status === 1)?.id || '';
    setCreateForm((current) => ({ ...current, planId, skuId }));
  };

  const changeMembershipPlan = (planId: string) => {
    const plan = getPlan(planId);
    const skuId = plan?.skus.find((sku) => sku.status === 1)?.id || '';
    setMembershipForm((current) => ({ ...current, planId, skuId }));
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await userApi.update(editing.id, form);
      notify('用户基础信息已保存');
      setEditorOpen(false);
      load();
    } catch {
      notify('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const createInternal = async () => {
    if (!createForm.username.trim() || !createForm.email.trim() || !createForm.password || !createForm.planId || !createForm.skuId) {
      notify('请完整填写账号、密码和会员套餐');
      return;
    }
    setSaving(true);
    try {
      await userApi.createInternal({ ...createForm, validDays: Number(createForm.validDays) });
      notify('内部员工账号已创建，会员权益已生效');
      setCreateOpen(false);
      setPage(1);
      if (page === 1) load();
    } catch {
      notify('内部账号创建失败，请检查邮箱是否已注册');
    } finally {
      setSaving(false);
    }
  };

  const adjustMembership = async () => {
    if (!membershipUser || !membershipForm.planId || !membershipForm.skuId) return;
    setSaving(true);
    try {
      await userApi.adjustMembership(membershipUser.id, {
        ...membershipForm,
        validDays: Number(membershipForm.validDays),
      });
      notify('会员套餐和到期时间已更新，权益已立即生效');
      setMembershipUser(null);
      load();
    } catch {
      notify('会员等级调整失败');
    } finally {
      setSaving(false);
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

  const currentCreatePlan = getPlan(createForm.planId);
  const currentMembershipPlan = getPlan(membershipForm.planId);

  return (
    <div className="page-stack user-account-page">
      <PageHeader
        title="用户与内部账号"
        description="管理全部用户，并为任意用户调整真实生效的会员套餐与有效期。"
        actions={
          <div className="toolbar-group">
            <input className="toolbar-input" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索用户名 / 邮箱 / 手机号" />
            <button className="toolbar-btn" type="button" onClick={() => { setPage(1); if (page === 1) load(); }}><RefreshCcw size={16} />刷新</button>
            <button className="toolbar-btn primary" type="button" onClick={openCreate}><UserPlus size={16} />新增内部账号</button>
          </div>
        }
      />

      <SectionCard title="用户列表" description="管理员可为全部用户调整套餐和有效期；调到付费套餐时保留原自动续费状态。">
        {users.length ? (
          <>
            <div className="admin-table user-account-table">
              <div className="table-head">
                <span>用户 / 登录账号</span><span>账号类型</span><span>当前套餐</span><span>到期时间</span><span>状态</span><span>操作</span>
              </div>
              {users.map((user) => (
                <div className="table-row" key={user.id}>
                  <div className="user-account-identity"><strong>{user.username || user.nickname || '-'}</strong><small>{user.account || user.email || user.phone || '-'}</small></div>
                  <span className={user.internalAccount ? 'internal-account-badge' : 'customer-account-badge'}>{user.internalAccount ? <><BadgeCheck size={14} />内部员工</> : '普通用户'}</span>
                  <div className="user-account-plan"><strong>{user.planName || `等级 ${user.memberLevel ?? 0}`}</strong><small>{user.skuName || '暂无有效订阅'}</small></div>
                  <span>{user.subscriptionEnd?.replace('T', ' ') || '-'}</span>
                  <StatusBadge tone={user.status === 'disabled' ? 'gray' : 'green'}>{user.status === 'disabled' ? '已禁用' : '正常'}</StatusBadge>
                  <div className="table-actions">
                    <button className="table-btn membership-action" type="button" onClick={() => openMembership(user)}><Crown size={15} />调等级</button>
                    <button className="table-btn" title="编辑基础信息" type="button" onClick={() => openEdit(user)}><Edit2 size={16} /></button>
                    <button className="table-btn" type="button" onClick={() => setActionId(user.id)}>{user.status === 'disabled' ? '启用' : '禁用'}</button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={page} pageSize={pageSize} total={total} onChange={setPage} onPageSizeChange={(size) => { setPage(1); setPageSize(size); }} />
          </>
        ) : (
          <EmptyState title={loading ? '加载中...' : '暂无用户数据'} description="可通过右上角新增内部员工测试账号。" icon={<ShieldCheck size={22} />} />
        )}
      </SectionCard>

      <Modal
        open={createOpen}
        title="新增内部员工账号"
        description="账号创建后可直接使用邮箱和密码登录，所选会员权益立即生效。"
        onClose={() => setCreateOpen(false)}
        footer={<><button className="modal-btn" type="button" onClick={() => setCreateOpen(false)}>取消</button><button className="modal-btn primary" disabled={saving} type="button" onClick={createInternal}><UserPlus size={16} />创建账号</button></>}
      >
        <div className="field-grid">
          <label className="field"><span>员工名称</span><input value={createForm.username} onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })} placeholder="例如：运营测试账号" /></label>
          <label className="field"><span>登录邮箱</span><input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} placeholder="employee@company.com" /></label>
          <label className="field"><span>手机号（选填）</span><input value={createForm.phone || ''} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} /></label>
          <label className="field"><span>初始密码</span><input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} /></label>
          <label className="field"><span>会员套餐</span><select value={createForm.planId} onChange={(e) => changeCreatePlan(e.target.value)}>{enabledPlans.map((plan) => <option value={plan.id} key={plan.id}>{plan.name}（等级 {plan.level}）</option>)}</select></label>
          <label className="field"><span>订阅方案</span><select value={createForm.skuId} onChange={(e) => setCreateForm({ ...createForm, skuId: e.target.value })}>{currentCreatePlan?.skus.filter((sku) => sku.status === 1).map((sku) => <option value={sku.id} key={sku.id}>{sku.name}</option>)}</select></label>
          <label className="field"><span>有效天数</span><input type="number" min="1" max="3650" value={createForm.validDays} onChange={(e) => setCreateForm({ ...createForm, validDays: Number(e.target.value) })} /></label>
        </div>
      </Modal>

      <Modal
        open={Boolean(membershipUser)}
        title={`调整会员等级${membershipUser ? ` · ${membershipUser.username}` : ''}`}
        description="调整会立即覆盖当前套餐和到期时间，并刷新用户权益；付费套餐保留原自动续费状态，免费套餐停止系统自动扣款。"
        onClose={() => setMembershipUser(null)}
        footer={<><button className="modal-btn" type="button" onClick={() => setMembershipUser(null)}>取消</button><button className="modal-btn primary" disabled={saving} type="button" onClick={adjustMembership}><Crown size={16} />确认调级</button></>}
      >
        <div className="field-grid">
          <label className="field"><span>会员套餐</span><select value={membershipForm.planId} onChange={(e) => changeMembershipPlan(e.target.value)}>{enabledPlans.map((plan) => <option value={plan.id} key={plan.id}>{plan.name}（等级 {plan.level}）</option>)}</select></label>
          <label className="field"><span>订阅方案</span><select value={membershipForm.skuId} onChange={(e) => setMembershipForm({ ...membershipForm, skuId: e.target.value })}>{currentMembershipPlan?.skus.filter((sku) => sku.status === 1).map((sku) => <option value={sku.id} key={sku.id}>{sku.name}</option>)}</select></label>
          <label className="field"><span>从现在起有效天数</span><input type="number" min="1" max="3650" value={membershipForm.validDays} onChange={(e) => setMembershipForm({ ...membershipForm, validDays: Number(e.target.value) })} /></label>
        </div>
      </Modal>

      <Modal
        open={editorOpen}
        title="编辑用户基础信息"
        description="会员等级不在这里直接修改，请使用列表中的“调等级”。"
        onClose={() => setEditorOpen(false)}
        footer={<><button className="modal-btn" type="button" onClick={() => setEditorOpen(false)}>取消</button><button className="modal-btn primary" disabled={saving} type="button" onClick={save}><Save size={16} />保存</button></>}
      >
        <div className="field-grid">
          <label className="field"><span>用户名</span><input value={form.username || ''} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
          <label className="field"><span>邮箱</span><input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="field"><span>手机号</span><input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
        </div>
      </Modal>

      <Modal
        open={Boolean(actionId)}
        title="切换用户状态"
        description="禁用后该账号将不能登录，已有订阅数据不会被删除。"
        onClose={() => setActionId(null)}
        footer={<><button className="modal-btn" type="button" onClick={() => setActionId(null)}>取消</button><button className="modal-btn primary" type="button" onClick={toggleStatus}>确认</button></>}
      >
        <EmptyState title="状态切换" description="确认变更该用户的登录状态。" icon={<Trash2 size={22} />} />
      </Modal>
    </div>
  );
};

export default UserListPage;
