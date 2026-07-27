import { useEffect, useState } from 'react';
import { CreditCard, RefreshCcw, Save, WalletCards } from 'lucide-react';
import { quotaApi } from '../../api/quota';
import { membershipApi, type MembershipPlan } from '../../api/membership';
import { EmptyState, PageHeader, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import { optionalNumberFromInput } from '../../utils/form';

const BillingPage = () => {
  const { notify } = useAdminShell();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [userId, setUserId] = useState('');
  const [quotaType, setQuotaType] = useState('script_generate');
  const [changeCount, setChangeCount] = useState('');
  const [remark, setRemark] = useState('');
  const [loading, setLoading] = useState(false);

  const loadPlans = async () => {
    try {
      const data = await membershipApi.getPlans();
      setPlans(data || []);
    } catch {
      setPlans([]);
      notify('会员套餐加载失败，后端暂无后台套餐管理接口');
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const submit = async () => {
    if (!userId.trim() || !quotaType.trim() || !changeCount.trim()) {
      notify('请填写 userId、额度类型和调整数量');
      return;
    }
    setLoading(true);
    try {
      await quotaApi.adjust({ userId, quotaType, changeCount: Number(changeCount), remark });
      notify('额度已调整');
      setChangeCount('');
      setRemark('');
    } catch {
      notify('额度调整失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader title="会员与额度" description="查看会员套餐，按 userId 调整额度。" actions={<button className="toolbar-btn" type="button" onClick={loadPlans}><RefreshCcw size={16} />刷新套餐</button>} />
      <div className="page-grid">
      <SectionCard
        title="会员套餐设置"
        description="读取 /api/membership/plans；后端暂无后台套餐保存接口，当前先展示并预留设置入口。"
        action={<button className="toolbar-btn primary" type="button" onClick={() => notify('后端需要新增 /api/admin/membership/plans 保存接口后才能提交套餐设置')}><Save size={16} />保存设置</button>}
      >
        {plans.length ? (
          <div className="plan-admin-grid">
            {plans.map((plan, index) => (
              <article className="plan-admin" key={plan.id}>
                <label className="field"><span>套餐名称</span><input value={plan.name || ''} onChange={(e) => setPlans((items) => items.map((item, i) => i === index ? { ...item, name: e.target.value } : item))} /></label>
                <label className="field"><span>套餐编码</span><input value={plan.code || ''} onChange={(e) => setPlans((items) => items.map((item, i) => i === index ? { ...item, code: e.target.value } : item))} /></label>
                <label className="field"><span>价格</span><input value={String(plan.price ?? '')} onChange={(e) => setPlans((items) => items.map((item, i) => i === index ? { ...item, price: e.target.value } : item))} /></label>
                <label className="field"><span>周期天数</span><input type="number" value={plan.periodDays ?? ''} onChange={(e) => setPlans((items) => items.map((item, i) => i === index ? { ...item, periodDays: optionalNumberFromInput(e.target.value) } : item))} /></label>
                <StatusBadge tone="blue">{plan.code || 'plan'}</StatusBadge>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="暂无会员套餐" description="请确认 /api/membership/plans 是否有数据；保存套餐需要后端补后台管理接口。" icon={<WalletCards size={22} />} />
        )}
      </SectionCard>

      <SectionCard
        title="额度调整"
        description="按 userId 直接调整额度，已接 /api/admin/quotas/adjust。"
        action={<span className="status-badge blue">可用</span>}
      >
        <div className="field-grid">
          <label className="field"><span>User ID</span><input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="输入用户 ID" /></label>
          <label className="field"><span>额度类型</span><input value={quotaType} onChange={(e) => setQuotaType(e.target.value)} placeholder="script_generate / video_generate" /></label>
          <label className="field"><span>调整数量</span><input value={changeCount} onChange={(e) => setChangeCount(e.target.value)} placeholder="正数增加 / 负数扣减" /></label>
        </div>
        <label className="field" style={{ marginTop: 14 }}>
          <span>原因</span>
          <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="调整理由，可选" />
        </label>
        <div className="login-actions" style={{ marginTop: 16 }}>
          <span className="panel-subtitle">支持立即提交到后端</span>
          <button className="toolbar-btn primary" type="button" onClick={submit} disabled={loading}><CreditCard size={16} />{loading ? '提交中...' : '提交调整'}</button>
        </div>
      </SectionCard>
      </div>
    </div>
  );
};

export default BillingPage;
