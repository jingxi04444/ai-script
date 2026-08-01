import { useEffect, useState } from 'react';
import { Check, Coins, Crown, Eye, Pencil, RefreshCcw, Save } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { membershipApi, type AdminSubscription, type MembershipBenefit, type MembershipPlan, type RefundOrder } from '../../api/membership';
import { EmptyState, Modal, PageHeader, Pagination, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import './billing-page.css';

type BillingSection = 'plans' | 'subscriptions' | 'points' | 'refunds';
type PurchaseMode = 'once_month' | 'auto_month' | 'auto_quarter' | 'auto_year';

const purchaseModeOptions: Array<{ value: PurchaseMode; label: string; hint: string; badge?: string }> = [
  { value: 'once_month', label: '单月购买', hint: '购买一个月' },
  { value: 'auto_month', label: '连续包月', hint: '每月自动续费' },
  { value: 'auto_quarter', label: '连续包季', hint: '每季自动续费' },
  { value: 'auto_year', label: '连续包年', hint: '每年自动续费', badge: '限时优惠' },
];

const sectionByPath: Record<string, BillingSection> = {
  '/membership/plans': 'plans',
  '/membership/subscriptions': 'subscriptions',
  '/membership/points': 'points',
  '/membership/refunds': 'refunds',
};

const sectionMeta: Record<BillingSection, { title: string; description: string }> = {
  plans: { title: '套餐权益', description: '以列表查看全部会员套餐，通过弹窗完成套餐、SKU 和权益配置。' },
  subscriptions: { title: '用户订阅', description: '查看用户当前会员、续费状态和待生效套餐。' },
  points: { title: '积分调整', description: '人工增加或扣减用户积分，并自动记录积分流水。' },
  refunds: { title: '退款审核', description: '审核会员退款申请，跟踪退款状态和权益回收结果。' },
};

const copyPlan = (plan: MembershipPlan): MembershipPlan => ({
  ...plan,
  skus: (plan.skus || []).map((sku) => ({ ...sku })),
  benefits: (plan.benefits || []).map((benefit) => ({ ...benefit })),
});

const formatPrice = (value: number | undefined) => `¥${Number(value || 0).toFixed(2)}`;

const benefitValue = (benefit: MembershipBenefit) => {
  const normalized = String(benefit.value ?? '').trim().toLowerCase();
  if (normalized === 'true') return '已开放';
  if (normalized === 'false') return '未开放';
  if (normalized === 'unlimited' || normalized === '-1') return '不限';
  if (normalized === 'all') return '全部';
  if (normalized === 'free_only') return '免费模板';
  if (benefit.unit?.toLowerCase() === 'byte') {
    const gigabytes = Number(normalized) / (1024 ** 3);
    if (Number.isFinite(gigabytes)) return `${Number(gigabytes.toFixed(1))}GB`;
  }
  return `${normalized || '0'}${benefit.unit || ''}`;
};

const matchesPurchaseMode = (sku: MembershipPlan['skus'][number], mode: PurchaseMode) => {
  if (mode === 'once_month') return sku.periodUnit === 'month' && sku.billingMode !== 'auto_renew';
  if (mode === 'auto_month') return sku.periodUnit === 'month' && sku.billingMode === 'auto_renew';
  if (mode === 'auto_quarter') return sku.periodUnit === 'quarter' && sku.billingMode === 'auto_renew';
  return sku.periodUnit === 'year' && sku.billingMode === 'auto_renew';
};

const resolvePreviewSku = (plan: MembershipPlan, mode: PurchaseMode) => (
  plan.skus.find((sku) => sku.status !== 0 && matchesPurchaseMode(sku, mode))
  || plan.skus.find((sku) => sku.status !== 0)
);

const resolveEditorSku = (plan: MembershipPlan, mode: PurchaseMode) => (
  plan.skus.find((sku) => matchesPurchaseMode(sku, mode))
  || plan.skus[0]
);

const formatPreviewPeriod = (plan: MembershipPlan, mode: PurchaseMode, editor = false) => {
  const sku = editor ? resolveEditorSku(plan, mode) : resolvePreviewSku(plan, mode);
  if (!sku) return plan.periodDays > 0 ? `${plan.periodDays}天` : '长期';
  const count = sku.periodCount || 1;
  if (sku.periodUnit === 'year') return count === 1 ? '年卡' : `${count}年`;
  if (sku.periodUnit === 'quarter') return count === 1 ? '季卡' : `${count}季度`;
  return count === 1 ? '月卡' : `${count}个月`;
};

const visibleBenefits = (plan: MembershipPlan) => plan.benefits.filter((benefit) => {
  const value = String(benefit.value ?? '').trim().toLowerCase();
  const isZeroLimit = (benefit.valueType === 'integer' || benefit.valueType === 'decimal') && Number(value) === 0;
  return benefit.enabled && value !== '' && value !== 'false' && !isZeroLimit;
});

interface MembershipCardViewProps {
  plan: MembershipPlan;
  mode: PurchaseMode;
  editor?: boolean;
}

const MembershipCardView = ({ plan, mode, editor = false }: MembershipCardViewProps) => {
  const sku = editor ? resolveEditorSku(plan, mode) : resolvePreviewSku(plan, mode);
  const price = Number(sku?.price ?? plan.price ?? 0);
  const originalPrice = Number(sku?.originalPrice ?? price);
  const featured = (plan.level || 0) >= 3;

  return <article className={`membership-preview-card is-selected${featured ? ' is-featured' : ''}`}>
    <header>
      <h3>{plan.name || '未命名套餐'}</h3>
      {featured
        ? <span className="membership-preview-status is-recommended"><Crown size={14} />推荐</span>
        : <span className="membership-preview-status is-current"><Check size={15} />{editor ? '实时预览' : '已订阅'}</span>}
    </header>
    <div className="membership-preview-price-row"><small>¥</small><strong>{price.toFixed(0)}</strong><span>/{formatPreviewPeriod(plan, mode, editor)}</span>{originalPrice > price ? <del>¥{originalPrice.toFixed(0)}</del> : null}</div>
    <p>{plan.description || '适合稳定进行短视频内容生产的创作者与团队。'}</p>
    <div className="membership-preview-benefit-title">套餐权益</div>
    <ul>{visibleBenefits(plan).map((benefit) => <li key={benefit.code}><Check size={15} /><span>{benefit.name}</span><b>{benefitValue(benefit)}</b></li>)}</ul>
    <button type="button" disabled>{editor ? '卡片实时预览' : '已订阅'}</button>
  </article>;
};

const BillingPage = () => {
  const { pathname } = useLocation();
  const { notify } = useAdminShell();
  const section = sectionByPath[pathname] || 'plans';
  const meta = sectionMeta[section];
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [refunds, setRefunds] = useState<RefundOrder[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [previewPlan, setPreviewPlan] = useState<MembershipPlan | null>(null);
  const [previewMode, setPreviewMode] = useState<PurchaseMode>('auto_year');
  const [editingMode, setEditingMode] = useState<PurchaseMode>('auto_year');
  const [pointForm, setPointForm] = useState({ userId: '', changePoints: '', remark: '' });

  const preferredMode = (plan: MembershipPlan, includeInactive = false): PurchaseMode => (
    purchaseModeOptions.find((option) => plan.skus.some((sku) => (includeInactive || sku.status !== 0) && matchesPurchaseMode(sku, option.value)))?.value
    || 'once_month'
  );

  const openPreview = (plan: MembershipPlan) => {
    setPreviewMode(preferredMode(plan));
    setPreviewPlan(copyPlan(plan));
  };

  const openEditor = (plan: MembershipPlan) => {
    setEditingMode(preferredMode(plan, true));
    setEditingPlan(copyPlan(plan));
  };

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
      setSubscriptions(result.list || []);
      setTotal(result.total || 0);
      setPage(targetPage);
    } catch { notify('订阅列表加载失败'); }
    finally { setLoading(false); }
  };

  const loadRefunds = async (targetPage = page) => {
    setLoading(true);
    try {
      const result = await membershipApi.refunds({ page: targetPage, pageSize: 10, keyword: keyword || undefined, status: status || undefined });
      setRefunds(result.list || []);
      setTotal(result.total || 0);
      setPage(targetPage);
    } catch { notify('退款列表加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setPage(1);
    setKeyword('');
    setStatus('');
    if (section === 'plans') void loadPlans();
    if (section === 'subscriptions') void loadSubscriptions(1);
    if (section === 'refunds') void loadRefunds(1);
  }, [section]);

  const patchEditingPlan = (patch: Partial<MembershipPlan>) => {
    setEditingPlan((current) => current ? { ...current, ...patch } : current);
  };

  const patchSku = (skuId: string, patch: Partial<MembershipPlan['skus'][number]>) => {
    setEditingPlan((current) => current ? {
      ...current,
      skus: current.skus.map((sku) => sku.id === skuId ? { ...sku, ...patch } : sku),
    } : current);
  };

  const patchBenefit = (code: string, patch: Partial<MembershipBenefit>) => {
    setEditingPlan((current) => current ? {
      ...current,
      benefits: current.benefits.map((benefit) => benefit.code === code ? { ...benefit, ...patch } : benefit),
    } : current);
  };

  const savePlan = async () => {
    if (!editingPlan) return;
    if (!editingPlan.name.trim()) {
      notify('请填写套餐名称');
      return;
    }
    setLoading(true);
    try {
      await membershipApi.updatePlan(editingPlan.id, {
        name: editingPlan.name.trim(),
        description: editingPlan.description,
        price: Number(editingPlan.price || 0),
        periodDays: Number(editingPlan.periodDays || 0),
        displayOrder: editingPlan.displayOrder,
        status: editingPlan.status ?? 1,
      });
      await Promise.all([
        ...editingPlan.skus.map((sku) => membershipApi.updateSku(sku.id, {
          name: sku.name,
          billingMode: sku.billingMode,
          periodUnit: sku.periodUnit,
          periodCount: Number(sku.periodCount || 0),
          price: Number(sku.price || 0),
          originalPrice: sku.originalPrice,
          refundDays: Number(sku.refundDays || 0),
          displayOrder: sku.displayOrder,
          status: sku.status ?? 1,
        })),
        ...editingPlan.benefits.map((benefit) => membershipApi.updateBenefit(editingPlan.id, benefit.code, {
          value: benefit.value,
          enabled: benefit.enabled,
        })),
      ]);
      notify(`${editingPlan.name} 已保存`);
      setEditingPlan(null);
      await loadPlans();
    } catch { notify('套餐保存失败，请检查字段格式'); }
    finally { setLoading(false); }
  };

  const adjustPoints = async () => {
    const changePoints = Number(pointForm.changePoints);
    if (!pointForm.userId.trim() || !Number.isFinite(changePoints) || changePoints === 0) {
      notify('请填写用户 ID 和非 0 的积分调整数量');
      return;
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
    try {
      await membershipApi.reviewRefund(refundNo, approved);
      notify('退款审核完成');
      await loadRefunds();
    } catch { notify('退款审核失败'); }
  };

  const refresh = () => {
    if (section === 'plans') void loadPlans();
    if (section === 'subscriptions') void loadSubscriptions();
    if (section === 'refunds') void loadRefunds();
  };

  return (
    <div className="page-stack membership-admin-page">
      <PageHeader
        title={meta.title}
        description={meta.description}
        actions={section !== 'points' ? <button className="toolbar-btn" type="button" onClick={refresh} disabled={loading}><RefreshCcw size={16} />刷新</button> : undefined}
      />

      {section === 'plans' && <SectionCard
        title="会员套餐列表"
        description="价格、周期和核心权益一屏可见；编辑不会改变列表布局。"
        action={<StatusBadge tone="green">{plans.length} 个套餐</StatusBadge>}
      >
        {plans.length ? <div className="table-wrap membership-plan-table"><table>
          <thead><tr><th>套餐</th><th>展示价格</th><th>订阅周期</th><th>SKU</th><th>已启用权益</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>{plans.map((plan) => {
            const activeBenefits = plan.benefits.filter((benefit) => benefit.enabled);
            return <tr key={plan.id}>
              <td><div className="membership-plan-name"><span className="membership-level">L{plan.level}</span><div><strong>{plan.name}</strong><small>{plan.code} · {plan.description || '暂无套餐说明'}</small></div></div></td>
              <td><strong className="membership-price">{formatPrice(plan.price)}</strong><small>展示价</small></td>
              <td>{plan.periodDays > 0 ? `${plan.periodDays} 天` : '长期有效'}</td>
              <td>{plan.skus.length} 个<small>{plan.skus.slice(0, 2).map((sku) => sku.name).join('、') || '暂无 SKU'}</small></td>
              <td>{activeBenefits.length} / {plan.benefits.length}<small>{activeBenefits.slice(0, 2).map((benefit) => benefit.name).join('、') || '暂无启用权益'}</small></td>
              <td><StatusBadge tone={plan.status !== 0 ? 'green' : 'gray'}>{plan.status !== 0 ? '启用中' : '已停用'}</StatusBadge></td>
              <td><div className="table-actions membership-row-actions">
                <button type="button" onClick={() => openPreview(plan)}><Eye size={14} />预览</button>
                <button type="button" onClick={() => openEditor(plan)}><Pencil size={14} />编辑</button>
              </div></td>
            </tr>;
          })}</tbody>
        </table></div> : <EmptyState title="暂无套餐" description="请先执行会员初始化数据脚本。" />}
      </SectionCard>}

      {section === 'subscriptions' && <SectionCard title="用户订阅列表" description="升级立即生效，待降级套餐会单独展示。">
        <div className="membership-admin-filter"><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="用户名、账号或用户 ID" /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option><option value="active">有效</option><option value="canceling">到期取消</option><option value="expired">已过期</option></select><button className="toolbar-btn primary" onClick={() => void loadSubscriptions(1)}>查询</button></div>
        <div className="table-wrap"><table><thead><tr><th>用户</th><th>套餐 / SKU</th><th>状态</th><th>自动续费</th><th>当前周期</th><th>待生效套餐</th></tr></thead><tbody>{subscriptions.map((item) => <tr key={item.id}><td><strong>{item.username || item.account || item.userId}</strong><small>ID {item.userId}</small></td><td>{item.planName}<small>{item.skuName}</small></td><td><StatusBadge tone={item.status === 'active' ? 'green' : 'gray'}>{item.status}</StatusBadge></td><td>{item.autoRenew && !item.cancelAtPeriodEnd ? '是' : '否'}</td><td>{item.currentPeriodStart}<small>至 {item.currentPeriodEnd}</small></td><td>{item.pendingPlanName || '—'}</td></tr>)}</tbody></table></div>
        {!subscriptions.length && !loading ? <EmptyState title="暂无订阅记录" description="调整筛选条件后重新查询。" /> : null}
        <Pagination page={page} pageSize={10} total={total} onChange={(next) => void loadSubscriptions(next)} />
      </SectionCard>}

      {section === 'points' && <div className="membership-point-layout">
        <SectionCard title="人工调整积分" description="正数增加、负数扣减；每次操作都会写入不可重复的积分流水。">
          <div className="membership-point-form">
            <label className="field"><span>用户 ID</span><input value={pointForm.userId} onChange={(event) => setPointForm({ ...pointForm, userId: event.target.value })} placeholder="请输入用户 ID" /></label>
            <label className="field"><span>调整数量</span><input type="number" value={pointForm.changePoints} onChange={(event) => setPointForm({ ...pointForm, changePoints: event.target.value })} placeholder="例如 500 或 -100" /></label>
            <label className="field"><span>调整原因</span><textarea rows={4} value={pointForm.remark} onChange={(event) => setPointForm({ ...pointForm, remark: event.target.value })} placeholder="请填写本次人工调整原因" /></label>
          </div>
          <button className="toolbar-btn primary membership-point-submit" disabled={loading} onClick={() => void adjustPoints()}><Coins size={16} />确认调整</button>
        </SectionCard>
        <aside className="membership-point-note"><Coins size={22} /><h3>操作提示</h3><p>增加积分填写正数，扣减积分填写负数。提交前请核对用户 ID，积分流水生成后不可重复提交。</p></aside>
      </div>}

      {section === 'refunds' && <SectionCard title="会员退款列表" description="审核通过后原路退款并立即回收会员权益。">
        <div className="membership-admin-filter"><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="退款单号或支付订单号" /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option><option value="pending">待审核</option><option value="approved">已通过</option><option value="completed">已完成</option><option value="rejected">已拒绝</option></select><button className="toolbar-btn primary" onClick={() => void loadRefunds(1)}>查询</button></div>
        <div className="table-wrap"><table><thead><tr><th>退款单</th><th>用户</th><th>金额</th><th>原因</th><th>状态</th><th>申请时间</th><th>操作</th></tr></thead><tbody>{refunds.map((item) => <tr key={item.id}><td>{item.refundNo}<small>{item.paymentOrderNo}</small></td><td>{item.userId}</td><td>{formatPrice(item.refundAmount)}</td><td>{item.refundReason || '—'}</td><td><StatusBadge tone={item.status === 'completed' ? 'green' : item.status === 'pending' ? 'orange' : 'gray'}>{item.status}</StatusBadge></td><td>{item.requestedTime}</td><td>{item.status === 'pending' ? <div className="table-actions"><button onClick={() => void reviewRefund(item.refundNo, true)}>通过</button><button onClick={() => void reviewRefund(item.refundNo, false)}>拒绝</button></div> : '—'}</td></tr>)}</tbody></table></div>
        {!refunds.length && !loading ? <EmptyState title="暂无退款申请" description="调整筛选条件后重新查询。" /> : null}
        <Pagination page={page} pageSize={10} total={total} onChange={(next) => void loadRefunds(next)} />
      </SectionCard>}

      <Modal
        open={Boolean(editingPlan)}
        title={editingPlan ? `编辑套餐卡 · ${editingPlan.name}` : '编辑套餐卡'}
        description="左侧按用户端卡片实时预览，右侧修改当前卡片的内容、价格和权益。"
        size="full"
        closeOnBackdrop={false}
        onClose={() => setEditingPlan(null)}
        footer={<><button className="modal-btn" type="button" onClick={() => setEditingPlan(null)}>取消</button><button className="modal-btn primary" type="button" onClick={() => void savePlan()} disabled={loading}><Save size={16} />{loading ? '保存中' : '保存套餐卡'}</button></>}
      >
        {editingPlan ? <div className="membership-card-editor-layout">
          <aside className="membership-card-editor-preview">
            <div className="membership-card-editor-heading"><div><strong>用户端卡片</strong><span>修改右侧内容，这张卡会同步变化</span></div><StatusBadge tone={editingPlan.status !== 0 ? 'green' : 'gray'}>{editingPlan.status !== 0 ? '展示中' : '已隐藏'}</StatusBadge></div>
            <div className="membership-preview-cycle is-compact" role="group" aria-label="编辑套餐周期">
              {purchaseModeOptions.map((option) => {
                const available = editingPlan.skus.some((sku) => matchesPurchaseMode(sku, option.value));
                return <button key={option.value} className={editingMode === option.value ? 'active' : ''} type="button" disabled={!available} onClick={() => setEditingMode(option.value)}>{option.label}<small>{option.hint}</small></button>;
              })}
            </div>
            <MembershipCardView plan={editingPlan} mode={editingMode} editor />
          </aside>

          <div className="membership-plan-editor">
          <section className="membership-editor-section"><div className="membership-editor-title"><span>01</span><div><h4>卡片内容</h4><p>直接控制用户端卡片的标题、说明和展示状态。</p></div></div><div className="field-grid membership-plan-fields">
            <label className="field"><span>套餐名称</span><input value={editingPlan.name} onChange={(event) => patchEditingPlan({ name: event.target.value })} /></label>
            <label className="field"><span>展示价格</span><input type="number" min="0" value={editingPlan.price} onChange={(event) => patchEditingPlan({ price: Number(event.target.value) })} /></label>
            <label className="field"><span>兼容周期天数</span><input type="number" min="0" value={editingPlan.periodDays} onChange={(event) => patchEditingPlan({ periodDays: Number(event.target.value) })} /></label>
            <label className="field"><span>展示顺序</span><input type="number" value={editingPlan.displayOrder || 0} onChange={(event) => patchEditingPlan({ displayOrder: Number(event.target.value) })} /></label>
            <label className="field"><span>套餐状态</span><select value={editingPlan.status ?? 1} onChange={(event) => patchEditingPlan({ status: Number(event.target.value) })}><option value={1}>启用（用户端展示）</option><option value={0}>停用（用户端隐藏）</option></select></label>
            <label className="field membership-editor-wide"><span>套餐说明</span><textarea rows={3} value={editingPlan.description || ''} onChange={(event) => patchEditingPlan({ description: event.target.value })} /></label>
          </div></section>

          <section className="membership-editor-section"><div className="membership-editor-title"><span>02</span><div><h4>卡片价格</h4><p>切换左侧周期即可实时核对对应 SKU 的价格。</p></div></div><div className="membership-admin-sku-grid">{editingPlan.skus.map((sku) => <article className={resolveEditorSku(editingPlan, editingMode)?.id === sku.id ? 'is-current' : ''} key={sku.id}>
            <div className="membership-sku-head"><div><strong>{sku.name}</strong><span>{sku.code}</span></div><StatusBadge tone="blue">{sku.billingMode}</StatusBadge></div>
            <div className="membership-sku-fields">
              <label className="field"><span>SKU 名称</span><input value={sku.name} onChange={(event) => patchSku(sku.id, { name: event.target.value })} /></label>
              <label className="field"><span>销售价格</span><input type="number" min="0" value={sku.price} onChange={(event) => patchSku(sku.id, { price: Number(event.target.value) })} /></label>
              <label className="field"><span>原价</span><input type="number" min="0" value={sku.originalPrice || ''} onChange={(event) => patchSku(sku.id, { originalPrice: event.target.value ? Number(event.target.value) : undefined })} /></label>
              <label className="field"><span>退款天数</span><input type="number" min="0" value={sku.refundDays} onChange={(event) => patchSku(sku.id, { refundDays: Number(event.target.value) })} /></label>
              <label className="field"><span>SKU 状态</span><select value={sku.status ?? 1} onChange={(event) => patchSku(sku.id, { status: Number(event.target.value) })}><option value={1}>启用</option><option value={0}>停用</option></select></label>
            </div>
          </article>)}</div></section>

          <section className="membership-editor-section"><div className="membership-editor-title"><span>03</span><div><h4>卡片权益</h4><p>卡片只展示已启用且有有效值的权益。</p></div></div><div className="membership-admin-benefit-list">{editingPlan.benefits.map((benefit) => <div className={`membership-benefit-row ${benefit.enabled ? 'is-enabled' : ''}`} key={benefit.code}>
            <button className="membership-benefit-toggle" type="button" aria-label={`${benefit.enabled ? '关闭' : '启用'}${benefit.name}`} onClick={() => patchBenefit(benefit.code, { enabled: !benefit.enabled })}><span>{benefit.enabled ? <Check size={13} /> : null}</span></button>
            <div className="membership-benefit-copy"><strong>{benefit.name}</strong><small>{benefit.code} · {benefit.description || benefit.category}</small></div>
            <label className="field"><span>权益值</span><input value={benefit.value} disabled={!benefit.enabled} onChange={(event) => patchBenefit(benefit.code, { value: event.target.value })} /></label>
            <span className="membership-benefit-unit">{benefit.unit || benefit.valueType}</span>
          </div>)}</div></section>
          </div>
        </div> : null}
      </Modal>

      <Modal
        open={Boolean(previewPlan)}
        title={previewPlan ? `套餐卡预览 · ${previewPlan.name}` : '套餐卡预览'}
        description="只预览当前套餐卡，卡片内容与用户端展示规则保持一致。"
        size="sm"
        onClose={() => setPreviewPlan(null)}
        footer={<button className="modal-btn primary" type="button" onClick={() => setPreviewPlan(null)}>完成预览</button>}
      >
        {previewPlan ? <div className="membership-catalog-preview is-single">
          <div className="membership-preview-context">
            <div><strong>用户端卡片效果</strong><span>选择购买周期，核对这张卡的价格、说明与权益。</span></div>
            {previewPlan.status === 0 ? <span><b>已停用</b>，用户端不会展示</span> : null}
          </div>
          <div className="membership-preview-cycle is-compact" role="group" aria-label="预览购买方式">
            {purchaseModeOptions.map((option) => {
              const available = previewPlan.skus.some((sku) => sku.status !== 0 && matchesPurchaseMode(sku, option.value));
              return <button key={option.value} className={previewMode === option.value ? 'active' : ''} type="button" disabled={!available} onClick={() => setPreviewMode(option.value)}>{option.label}<small>{option.hint}</small>{option.badge && available ? <em>{option.badge}</em> : null}</button>;
            })}
          </div>
          <div className="membership-single-card-wrap"><MembershipCardView plan={previewPlan} mode={previewMode} /></div>
        </div> : null}
      </Modal>
    </div>
  );
};

export default BillingPage;
