import { useEffect, useState } from 'react';
import { BadgeDollarSign, Coins, RefreshCcw, Save, ShieldCheck, Users } from 'lucide-react';
import { membershipApi, type AdminSubscription, type MembershipPlan, type RefundOrder } from '../../api/membership';
import { EmptyState, PageHeader, Pagination, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import './billing-page.css';

type BillingTab = 'plans' | 'subscriptions' | 'points' | 'refunds';

const BillingPage = () => {
  const { notify } = useAdminShell();
  const [tab, setTab] = useState<BillingTab>('plans');
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [refunds, setRefunds] = useState<RefundOrder[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [pointForm, setPointForm] = useState({ userId: '', changePoints: '', remark: '' });

  const loadPlans = async () => {
    setLoading(true);
    try { setPlans(await membershipApi.getPlans()); }
    catch { notify('会员套餐加载失败'); }
    finally { setLoading(false); }
  };

  const loadSubscriptions = async (targetPage = page) => {
    setLoading(true);
    try {
      const result = await membershipApi.subscriptions({ page: targetPage, pageSize: 10, keyword: keyword || undefined, status: status || undefined });
      setSubscriptions(result.list || []); setTotal(result.total || 0); setPage(targetPage);
    } catch { notify('订阅列表加载失败'); }
    finally { setLoading(false); }
  };

  const loadRefunds = async (targetPage = page) => {
    setLoading(true);
    try {
      const result = await membershipApi.refunds({ page: targetPage, pageSize: 10, keyword: keyword || undefined, status: status || undefined });
      setRefunds(result.list || []); setTotal(result.total || 0); setPage(targetPage);
    } catch { notify('退款列表加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadPlans(); }, []);
  useEffect(() => {
    setPage(1); setKeyword(''); setStatus('');
    if (tab === 'subscriptions') void loadSubscriptions(1);
    if (tab === 'refunds') void loadRefunds(1);
  }, [tab]);

  const patchPlan = (planId: string, patch: Partial<MembershipPlan>) => {
    setPlans((items) => items.map((item) => item.id === planId ? { ...item, ...patch } : item));
  };

  const savePlan = async (plan: MembershipPlan) => {
    setLoading(true);
    try {
      await membershipApi.updatePlan(plan.id, {
        name: plan.name,
        description: plan.description,
        price: Number(plan.price || 0),
        periodDays: Number(plan.periodDays || 0),
        displayOrder: plan.displayOrder,
        status: 1,
      });
      for (const sku of plan.skus || []) {
        await membershipApi.updateSku(sku.id, {
          name: sku.name,
          billingMode: sku.billingMode,
          periodUnit: sku.periodUnit,
          periodCount: sku.periodCount,
          price: Number(sku.price),
          originalPrice: sku.originalPrice,
          refundDays: sku.refundDays,
          displayOrder: sku.displayOrder,
          status: 1,
        });
      }
      for (const benefit of plan.benefits || []) {
        await membershipApi.updateBenefit(plan.id, benefit.code, { value: benefit.value, enabled: benefit.enabled });
      }
      notify(`${plan.name} 已保存`);
      await loadPlans();
    } catch { notify('套餐保存失败，请检查字段格式'); }
    finally { setLoading(false); }
  };

  const adjustPoints = async () => {
    const changePoints = Number(pointForm.changePoints);
    if (!pointForm.userId.trim() || !Number.isFinite(changePoints) || changePoints === 0) {
      notify('请填写用户 ID 和非 0 的积分调整数量'); return;
    }
    setLoading(true);
    try {
      await membershipApi.adjustPoints({ userId: pointForm.userId.trim(), changePoints, remark: pointForm.remark });
      notify('积分已调整并写入流水');
      setPointForm({ userId: '', changePoints: '', remark: '' });
    } catch { notify('积分调整失败'); }
    finally { setLoading(false); }
  };

  const reviewRefund = async (refundNo: string, approved: boolean) => {
    if (!window.confirm(approved ? '确认通过退款并立即回收会员权益？' : '确认拒绝该退款？')) return;
    try { await membershipApi.reviewRefund(refundNo, approved); notify('退款审核完成'); await loadRefunds(); }
    catch { notify('退款审核失败'); }
  };

  const updateBenefit = (planId: string, code: string, value: string) => {
    setPlans((items) => items.map((plan) => plan.id !== planId ? plan : {
      ...plan,
      benefits: plan.benefits.map((benefit) => benefit.code === code ? { ...benefit, value } : benefit),
    }));
  };

  return (
    <div className="page-stack membership-admin-page">
      <PageHeader title="会员订阅管理" description="统一管理套餐、订阅、积分和退款。" actions={<button className="toolbar-btn" type="button" onClick={() => tab === 'plans' ? void loadPlans() : tab === 'subscriptions' ? void loadSubscriptions() : tab === 'refunds' ? void loadRefunds() : undefined}><RefreshCcw size={16} />刷新</button>} />
      <div className="membership-admin-tabs">
        <button className={tab === 'plans' ? 'active' : ''} onClick={() => setTab('plans')}><ShieldCheck size={16} />套餐与权益</button>
        <button className={tab === 'subscriptions' ? 'active' : ''} onClick={() => setTab('subscriptions')}><Users size={16} />用户订阅</button>
        <button className={tab === 'points' ? 'active' : ''} onClick={() => setTab('points')}><Coins size={16} />积分调整</button>
        <button className={tab === 'refunds' ? 'active' : ''} onClick={() => setTab('refunds')}><BadgeDollarSign size={16} />退款审核</button>
      </div>

      {tab === 'plans' && <div className="membership-admin-plan-list">
        {plans.map((plan) => <SectionCard key={plan.id} title={plan.name} description={`${plan.code} · 等级 ${plan.level}`} action={<button className="toolbar-btn primary" disabled={loading} onClick={() => void savePlan(plan)}><Save size={16} />保存该套餐</button>}>
          <div className="field-grid membership-plan-fields">
            <label className="field"><span>套餐名称</span><input value={plan.name} onChange={(event) => patchPlan(plan.id, { name: event.target.value })} /></label>
            <label className="field"><span>展示价格</span><input type="number" value={plan.price} onChange={(event) => patchPlan(plan.id, { price: Number(event.target.value) })} /></label>
            <label className="field"><span>兼容周期天数</span><input type="number" value={plan.periodDays} onChange={(event) => patchPlan(plan.id, { periodDays: Number(event.target.value) })} /></label>
            <label className="field"><span>说明</span><input value={plan.description || ''} onChange={(event) => patchPlan(plan.id, { description: event.target.value })} /></label>
          </div>
          <h3 className="membership-admin-subtitle">订阅 SKU</h3>
          <div className="membership-admin-sku-grid">{plan.skus.map((sku) => <article key={sku.id}>
            <strong>{sku.name}</strong><span>{sku.billingMode}</span>
            <label className="field"><span>价格</span><input type="number" value={sku.price} onChange={(event) => patchPlan(plan.id, { skus: plan.skus.map((item) => item.id === sku.id ? { ...item, price: Number(event.target.value) } : item) })} /></label>
            <label className="field"><span>退款天数</span><input type="number" value={sku.refundDays} onChange={(event) => patchPlan(plan.id, { skus: plan.skus.map((item) => item.id === sku.id ? { ...item, refundDays: Number(event.target.value) } : item) })} /></label>
          </article>)}</div>
          <h3 className="membership-admin-subtitle">权益值</h3>
          <div className="membership-admin-benefit-grid">{plan.benefits.map((benefit) => <label className="field" key={benefit.code}><span>{benefit.name}<small>{benefit.code}</small></span><input value={benefit.value} onChange={(event) => updateBenefit(plan.id, benefit.code, event.target.value)} /></label>)}</div>
        </SectionCard>)}
        {!plans.length && <EmptyState title="暂无套餐" description="请先执行会员初始化数据脚本。" />}
      </div>}

      {tab === 'subscriptions' && <SectionCard title="用户订阅" description="升级立即生效，待降级套餐会单独展示。">
        <div className="membership-admin-filter"><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="用户名、账号或用户 ID" /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option><option value="active">有效</option><option value="canceling">到期取消</option><option value="expired">已过期</option></select><button className="toolbar-btn" onClick={() => void loadSubscriptions(1)}>查询</button></div>
        <div className="table-wrap"><table><thead><tr><th>用户</th><th>套餐 / SKU</th><th>状态</th><th>自动续费</th><th>当前周期</th><th>待生效套餐</th></tr></thead><tbody>{subscriptions.map((item) => <tr key={item.id}><td><strong>{item.username || item.account || item.userId}</strong><small>ID {item.userId}</small></td><td>{item.planName}<small>{item.skuName}</small></td><td><StatusBadge tone={item.status === 'active' ? 'green' : 'gray'}>{item.status}</StatusBadge></td><td>{item.autoRenew && !item.cancelAtPeriodEnd ? '是' : '否'}</td><td>{item.currentPeriodStart}<small>至 {item.currentPeriodEnd}</small></td><td>{item.pendingPlanName || '—'}</td></tr>)}</tbody></table></div>
        <Pagination page={page} pageSize={10} total={total} onChange={(next) => void loadSubscriptions(next)} />
      </SectionCard>}

      {tab === 'points' && <SectionCard title="人工调整积分" description="正数增加、负数扣减；每次操作都会写入不可重复的积分流水。">
        <div className="field-grid">
          <label className="field"><span>用户 ID</span><input value={pointForm.userId} onChange={(event) => setPointForm({ ...pointForm, userId: event.target.value })} /></label>
          <label className="field"><span>调整数量</span><input type="number" value={pointForm.changePoints} onChange={(event) => setPointForm({ ...pointForm, changePoints: event.target.value })} placeholder="例如 500 或 -100" /></label>
          <label className="field"><span>调整原因</span><input value={pointForm.remark} onChange={(event) => setPointForm({ ...pointForm, remark: event.target.value })} /></label>
        </div><button className="toolbar-btn primary membership-point-submit" disabled={loading} onClick={() => void adjustPoints()}><Coins size={16} />确认调整</button>
      </SectionCard>}

      {tab === 'refunds' && <SectionCard title="会员退款审核" description="审核通过后原路退款并立即回收会员权益。">
        <div className="membership-admin-filter"><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="退款单号或支付订单号" /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option><option value="pending">待审核</option><option value="approved">已通过</option><option value="completed">已完成</option><option value="rejected">已拒绝</option></select><button className="toolbar-btn" onClick={() => void loadRefunds(1)}>查询</button></div>
        <div className="table-wrap"><table><thead><tr><th>退款单</th><th>用户</th><th>金额</th><th>原因</th><th>状态</th><th>申请时间</th><th>操作</th></tr></thead><tbody>{refunds.map((item) => <tr key={item.id}><td>{item.refundNo}<small>{item.paymentOrderNo}</small></td><td>{item.userId}</td><td>¥{Number(item.refundAmount).toFixed(2)}</td><td>{item.refundReason || '—'}</td><td><StatusBadge tone={item.status === 'completed' ? 'green' : item.status === 'pending' ? 'orange' : 'gray'}>{item.status}</StatusBadge></td><td>{item.requestedTime}</td><td>{item.status === 'pending' ? <div className="table-actions"><button onClick={() => void reviewRefund(item.refundNo, true)}>通过</button><button onClick={() => void reviewRefund(item.refundNo, false)}>拒绝</button></div> : '—'}</td></tr>)}</tbody></table></div>
        <Pagination page={page} pageSize={10} total={total} onChange={(next) => void loadRefunds(next)} />
      </SectionCard>}
    </div>
  );
};

export default BillingPage;
