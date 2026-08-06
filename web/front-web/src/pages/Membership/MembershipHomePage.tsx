import { Fragment, useEffect, useMemo, useState } from 'react';
import {
  AlipayCircleOutlined,
  CheckOutlined,
  CrownOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { QRCode, Select, Spin, message, Modal } from 'antd';
import HomeRail from '../../components/Layout/HomeRail';
import { membershipApi } from '../../api/membership';
import { paymentApi } from '../../api/payment';
import type { MembershipBenefit, MembershipPlan, MembershipPlanSku, MembershipPurchaseMode, PointAccount, TemplateCustomRequest, UserMembership } from '../../types/membership';
import type { PaymentOrder } from '../../types/payment';
import MembershipTopbar from './MembershipTopbar';
import { formatDate } from '../../utils/format';
import { useAuthStore } from '../../stores/authStore';
import './membership-page.css';

type PurchaseMode = MembershipPurchaseMode['value'];

const purchaseModeFallbacks: MembershipPurchaseMode[] = [
  { value: 'once_month', label: '单月购买', hint: '购买一个月', enabled: true, displayOrder: 10 },
  { value: 'once_quarter', label: '季卡', hint: '购买一个季度', enabled: true, displayOrder: 20 },
  { value: 'once_year', label: '年卡', hint: '购买一年', badge: '限时优惠', enabled: true, displayOrder: 30 },
];

const matchesPurchaseMode = (sku: MembershipPlanSku, mode: PurchaseMode) => {
  if (sku.billingMode !== 'one_time') return false;
  if (mode === 'once_month') return sku.periodUnit === 'month';
  if (mode === 'once_quarter') return sku.periodUnit === 'quarter';
  return sku.periodUnit === 'year';
};

const purchaseModeOf = (sku: MembershipPlanSku): PurchaseMode => {
  if (sku.periodUnit === 'year') return 'once_year';
  if (sku.periodUnit === 'quarter') return 'once_quarter';
  return 'once_month';
};

const benefitLabel = (value: string, unit?: string) => {
  if (value === 'true') return '已开放';
  if (value === 'false') return '未开通';
  if (value === 'unlimited') return '不限';
  if (value === 'all') return '全部';
  if (value === 'free_only') return '免费模板';
  if (unit?.toLowerCase() === 'byte') {
    const gigabytes = Number(value) / (1024 ** 3);
    if (Number.isFinite(gigabytes)) return `${Number(gigabytes.toFixed(1))}GB`;
  }
  return `${value}${unit || ''}`;
};

const isAvailableBenefit = (benefit: MembershipBenefit) => {
  const value = String(benefit.value ?? '').trim().toLowerCase();
  const zeroAmount = ['integer', 'decimal'].includes(benefit.valueType) && Number(value) === 0;
  return benefit.enabled && value !== '' && value !== 'false' && !zeroAmount;
};

const resolveSku = (plan: MembershipPlan | undefined, mode: PurchaseMode) => {
  if (!plan?.skus?.length) return undefined;
  const candidates = plan.skus.filter((sku) => matchesPurchaseMode(sku, mode));
  return candidates.find((sku) => sku.billingMode === 'one_time') || candidates[0] || (plan.free ? plan.skus[0] : undefined);
};

const buildSkuSelectionMap = (planList: MembershipPlan[], mode: PurchaseMode) => Object.fromEntries(
  planList.map((plan) => [plan.id, resolveSku(plan, mode)?.id || '']),
);

const formatPeriod = (sku?: MembershipPlanSku) => {
  if (!sku) return '订阅周期';
  const count = sku.periodCount || 1;
  if (sku.periodUnit === 'day') return `${count}天`;
  if (sku.periodUnit === 'year') return count === 1 ? '年卡' : `${count}年`;
  if (sku.periodUnit === 'quarter') return count === 1 ? '季卡' : `${count}季度`;
  return count === 1 ? '月卡' : `${count}个月`;
};

type ComparisonCell = { enabled: boolean; label: string };

const benefitCategoryMeta: Record<string, { label: string; order: number }> = {
  script: { label: '套餐额度', order: 5 },
  brief: { label: 'Brief 权益', order: 10 },
  template: { label: '模板库权益', order: 20 },
  viral: { label: '爆款复刻权益', order: 30 },
  point: { label: '积分相关权益', order: 40 },
  video: { label: '未来视频权益', order: 50 },
  common: { label: '通用基础权益', order: 60 },
};

const benefitCategoryLabel = (category: string) => benefitCategoryMeta[category]?.label || category || '其他权益';
const benefitCategoryOrder = (category: string) => benefitCategoryMeta[category]?.order ?? 999;

const MembershipHomePage = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [purchaseModeConfig, setPurchaseModeConfig] = useState<MembershipPurchaseMode[]>(purchaseModeFallbacks);
  const [current, setCurrent] = useState<UserMembership | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedSkuIds, setSelectedSkuIds] = useState<Record<string, string>>({});
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>('once_month');
  const payMethod = 'alipay' as const;
  const [loading, setLoading] = useState(true);
  const [pointsAccount, setPointsAccount] = useState<PointAccount | null>(null);
  const [submittingSku, setSubmittingSku] = useState<string | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [customRequestOpen, setCustomRequestOpen] = useState(false);
  const [customRequests, setCustomRequests] = useState<TemplateCustomRequest[]>([]);
  const [customRequestForm, setCustomRequestForm] = useState({ title: '', requirements: '', contact: '' });
  const [customRequestSubmitting, setCustomRequestSubmitting] = useState(false);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const user = useAuthStore((state) => state.user);

  const load = async () => {
    setLoading(true);
    try {
      const [planList, membership, pointAccount, modeList] = await Promise.all([
        membershipApi.plans(),
        membershipApi.current(),
        membershipApi.points().catch(() => null),
        membershipApi.purchaseModes().catch(() => purchaseModeFallbacks),
      ]);
      setPlans(planList);
      setPurchaseModeConfig(modeList);
      setCurrent(membership);
      setPointsAccount(pointAccount);
      const currentPlan = planList.find((plan) => plan.id === membership?.planId);
      const currentSku = currentPlan?.skus?.find((sku) => sku.id === membership?.skuId);
      const initialMode = currentSku ? purchaseModeOf(currentSku) : 'once_month';
      setPurchaseMode(initialMode);
      setSelectedSkuIds(buildSkuSelectionMap(planList, initialMode));
      const firstPurchasable = planList.find((plan) => !plan.free) || planList[0];
      setSelectedPlanId((previous) => previous || currentPlan?.id || firstPurchasable?.id || '');
    } catch (error) {
      message.error((error as { message?: string })?.message || '会员信息加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (!plans.length) return;
    setSelectedSkuIds(buildSkuSelectionMap(plans, purchaseMode));
  }, [plans, purchaseMode]);

  const maxPlanLevel = useMemo(() => Math.max(...plans.map((plan) => plan.level || 0), 0), [plans]);

  const purchaseModeOptions = useMemo(() => {
    const enabledModes = new Set<PurchaseMode>();
    const purchasablePlans = plans.some((plan) => !plan.free) ? plans.filter((plan) => !plan.free) : plans;
    purchasablePlans.forEach((plan) => (plan.skus || []).forEach((sku) => {
      enabledModes.add(purchaseModeOf(sku));
    }));
    return purchaseModeConfig
      .filter((option) => option.enabled && enabledModes.has(option.value))
      .sort((left, right) => left.displayOrder - right.displayOrder);
  }, [plans, purchaseModeConfig]);

  useEffect(() => {
    if (!purchaseModeOptions.length || purchaseModeOptions.some((option) => option.value === purchaseMode)) return;
    setPurchaseMode(purchaseModeOptions[0].value);
  }, [purchaseMode, purchaseModeOptions]);

  const comparisonRows = useMemo(() => {
    const rows = new Map<string, {
      code: string;
      name: string;
      category: string;
      description?: string;
      displayOrder: number;
      previewOnly: boolean;
      values: Record<string, MembershipBenefit | undefined>;
    }>();

    plans.forEach((plan) => {
      (plan.benefits || []).forEach((benefit) => {
        const existing = rows.get(benefit.code) || {
          code: benefit.code,
          name: benefit.name,
          category: benefit.category,
          description: benefit.description,
          displayOrder: benefit.displayOrder || 0,
          previewOnly: benefit.previewOnly,
          values: {},
        };
        existing.values[plan.id] = benefit;
        existing.category = existing.category || benefit.category;
        existing.description = existing.description || benefit.description;
        existing.displayOrder = Math.min(existing.displayOrder, benefit.displayOrder || existing.displayOrder);
        existing.previewOnly = existing.previewOnly || benefit.previewOnly;
        rows.set(benefit.code, existing);
      });
    });

    return Array.from(rows.values()).sort((left, right) => (
      left.category.localeCompare(right.category, 'zh-CN')
      || left.displayOrder - right.displayOrder
      || left.name.localeCompare(right.name, 'zh-CN')
    ));
  }, [plans]);

  const comparisonGroups = useMemo(() => {
    const groups = new Map<string, typeof comparisonRows>();
    comparisonRows.forEach((row) => {
      const category = row.category || '其他权益';
      groups.set(category, [...(groups.get(category) || []), row]);
    });
    return Array.from(groups.entries())
      .map(([category, rows]) => ({ category, label: benefitCategoryLabel(category), rows }))
      .sort((left, right) => benefitCategoryOrder(left.category) - benefitCategoryOrder(right.category));
  }, [comparisonRows]);

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || plans[0];
  const selectedSku = selectedPlan?.skus?.find((sku) => sku.id === selectedSkuIds[selectedPlan?.id || '']) || resolveSku(selectedPlan, purchaseMode);
  const selectedOriginalPrice = Number(selectedSku?.originalPrice || selectedSku?.price || 0);
  const selectedPrice = Number(selectedSku?.price || 0);
  const discount = Math.max(0, selectedOriginalPrice - selectedPrice);
  const qrContent = order?.qrContent || order?.payParams?.qrCode || order?.payParams?.payUrl || '';
  const rewardPoints = pointsAccount?.availablePoints ?? 0;
  const membershipExpiry = current?.currentPeriodEnd || current?.expireTime;
  const currentPlan = plans.find((plan) => plan.id === current?.planId);
  const canRequestExclusiveTemplate = Boolean(currentPlan?.benefits?.some((benefit) => (
    benefit.code === 'EXCLUSIVE_TEMPLATE_REQUEST' && benefit.enabled && benefit.value === 'true'
  )));

  const showUnavailableBenefitReason = (benefit: MembershipBenefit, planName: string) => {
    Modal.confirm({
      title: `${benefit.name}暂未开通`,
      content: `${planName}不包含“${benefit.name}”权益，因此当前无法使用。你可以查看权益对比，选择包含该功能的会员套餐。`,
      okText: '查看权益对比',
      cancelText: '知道了',
      centered: true,
      onOk: () => setComparisonOpen(true),
    });
  };

  const handleExclusiveTemplateClick = () => {
    if (canRequestExclusiveTemplate) {
      void openCustomRequest();
      return;
    }
    const benefit = currentPlan?.benefits?.find((item) => item.code === 'EXCLUSIVE_TEMPLATE_REQUEST');
    showUnavailableBenefitReason(benefit || {
      code: 'EXCLUSIVE_TEMPLATE_REQUEST',
      name: '独家模板定制',
      category: '模板权益',
      value: 'false',
      valueType: 'boolean',
      enabled: true,
      resetType: 'none',
      previewOnly: false,
    }, currentPlan?.name || '当前套餐');
  };

  const openCustomRequest = async () => {
    setCustomRequestOpen(true);
    try {
      const result = await membershipApi.templateCustomRequests({ page: 1, pageSize: 10 });
      setCustomRequests(result.list || []);
    } catch (error) {
      message.error((error as { message?: string })?.message || '定制模板工单加载失败');
    }
  };

  const submitCustomRequest = async () => {
    if (!customRequestForm.title.trim() || !customRequestForm.requirements.trim()) {
      message.warning('请填写模板标题和详细需求');
      return;
    }
    setCustomRequestSubmitting(true);
    try {
      const created = await membershipApi.createTemplateCustomRequest({
        title: customRequestForm.title.trim(),
        requirements: customRequestForm.requirements.trim(),
        contact: customRequestForm.contact.trim() || undefined,
      });
      setCustomRequests((previous) => [created, ...previous]);
      setCustomRequestForm({ title: '', requirements: '', contact: '' });
      message.success('独家定制模板工单已提交');
    } catch (error) {
      message.error((error as { message?: string })?.message || '定制模板工单提交失败');
    } finally {
      setCustomRequestSubmitting(false);
    }
  };

  const submitFormHtml = (formHtml: string) => {
    const host = document.createElement('div');
    host.style.display = 'none';
    host.innerHTML = formHtml;
    const form = host.querySelector('form');
    if (!form) throw new Error('支付表单缺失');
    document.body.appendChild(form);
    (form as HTMLFormElement).submit();
  };

  const handlePlanAction = async (plan: MembershipPlan) => {
    if (plan.free) {
      const sku = plan.skus?.find((item) => item.id === selectedSkuIds[plan.id]) || resolveSku(plan, purchaseMode);
      if (!sku) {
        message.warning('后台尚未配置可用的免费套餐订阅方案');
        return;
      }
      setSubmittingSku(`free:${plan.id}`);
      try {
        const membership = await membershipApi.activateFreeTrial(sku.id);
        setCurrent(membership);
        message.success(`${formatPeriod(sku)}免费体验已开通`);
        await load();
      } catch (error) {
        message.error((error as { message?: string })?.message || '免费体验开通失败');
      } finally {
        setSubmittingSku(null);
      }
      return;
    }
    const sku = plan.skus?.find((item) => item.id === selectedSkuIds[plan.id]) || resolveSku(plan, purchaseMode);
    if (!sku) {
      message.warning('当前套餐没有可购买的订阅周期');
      return;
    }
    setSubmittingSku(sku.id);
    try {
      const quote = await membershipApi.quote(sku.id);
      if (quote.changeType === 'downgrade') {
        Modal.confirm({
          title: '确认降级套餐？',
          content: `降级将在当前周期结束后生效，现有权益可继续使用至 ${quote.effectiveTime || '周期结束'}。`,
          okText: '确认降级',
          cancelText: '取消',
          onOk: async () => {
            const next = await membershipApi.scheduleDowngrade(sku.id);
            setCurrent(next);
            message.success('已安排到期降级');
          },
        });
        return;
      }

      const nextOrder = await paymentApi.memberOrder({
        skuId: sku.id,
        payMethod,
        idempotencyKey: crypto.randomUUID(),
      });

      if (nextOrder.payParams?.formHtml) {
        setOrder(nextOrder);
        message.success('订单已创建，正在跳转支付宝收银台');
        submitFormHtml(nextOrder.payParams.formHtml);
        return;
      }

      if ((nextOrder.status || '').toLowerCase() === 'paid') {
        message.success('会员套餐已生效');
        await load();
      } else {
        setOrder(nextOrder);
        message.success(`订单已创建：${nextOrder.orderNo}`);
      }
    } catch (error) {
      message.error((error as { message?: string })?.message || '套餐操作失败');
    } finally {
      setSubmittingSku(null);
    }
  };

  const refreshOrder = async () => {
    if (!order?.orderNo) return;
    try {
      const nextOrder = await paymentApi.queryProviderOrder(order.orderNo);
      setOrder(nextOrder);
      if ((nextOrder.status || '').toLowerCase() === 'paid') {
        message.success('支付成功，会员权益已更新');
        setOrder(null);
        await load();
      } else {
        message.info('暂未查询到支付成功，请稍后重试');
      }
    } catch (error) {
      message.error((error as { message?: string })?.message || '支付状态刷新失败');
    }
  };

  const comparisonCell = (planId: string, row: { values: Record<string, MembershipBenefit | undefined> }): ComparisonCell => {
    const benefit = row.values[planId];
    const value = String(benefit?.value ?? '').trim();
    const disabled = !benefit?.enabled
      || value === ''
      || value.toLowerCase() === 'false'
      || ((benefit?.valueType === 'integer' || benefit?.valueType === 'decimal') && Number(value) === 0);
    return { enabled: !disabled, label: disabled ? '未开通' : benefitLabel(value, benefit?.unit) };
  };

  return (
    <div className="membership-shell">
      <HomeRail
        activeLabel="会员中心"
        membershipName={current?.planName || (loading ? '' : '未开通会员')}
        pointBalance={pointsAccount?.availablePoints}
      />

      <main className="membership-page">
        <MembershipTopbar active="plans" onRefresh={() => void load()} refreshing={loading} />

        <section className="membership-profile-strip" aria-label="会员账户信息">
          <div className="membership-profile-identity">
            <span className="membership-profile-avatar">
              {user?.avatar ? <img src={user.avatar} alt="会员头像" /> : <UserOutlined />}
            </span>
            <div>
              <strong>{user?.username || '会员用户'}</strong>
              <span>{current?.planName || '尚未开通会员'}</span>
            </div>
          </div>
          <div className="membership-profile-meta">
            <span>会员有效期</span>
            <strong>{membershipExpiry ? formatDate(membershipExpiry, 'YYYY.MM.DD HH:mm') : '尚未开通'}</strong>
          </div>
          <div className="membership-profile-meta membership-profile-points">
            <span>积分详情</span>
            <strong>{rewardPoints}</strong>
          </div>
          <div className="membership-profile-actions">
            <button
              className={`membership-exclusive-button${canRequestExclusiveTemplate ? '' : ' is-locked'}`}
              type="button"
              onClick={handleExclusiveTemplateClick}
            >
              独家模板定制
            </button>
            <button
              className="membership-renew-button"
              type="button"
              onClick={() => document.querySelector('.membership-commerce')?.scrollIntoView({ behavior: 'smooth' })}
            >
              立即续费
            </button>
          </div>
        </section>

        {loading ? <div className="membership-loading"><Spin size="large" /></div> : (
          <section className="membership-commerce">
            <div className="membership-catalog">
              <div className="membership-catalog-heading">
                <div>
                  <span className="membership-eyebrow"><CrownOutlined /> 会员订阅</span>
                  <h1>选择适合你的会员套餐</h1>
                </div>
              </div>
              <div className={`membership-cycle-switch mode-count-${Math.max(1, purchaseModeOptions.length)}`} role="group" aria-label="购买方式">
                {purchaseModeOptions.map((option) => (
                  <button
                    key={option.value}
                    className={purchaseMode === option.value ? 'active' : ''}
                    type="button"
                    onClick={() => {
                      setPurchaseMode(option.value);
                      setOrder(null);
                    }}
                  >
                    {option.label}<small>{option.hint}</small>
                    {option.badge && <em>{option.badge}</em>}
                  </button>
                ))}
              </div>

              {plans.length ? (
                <div className="membership-plan-grid">
                  {plans.map((plan) => {
                    const sku = plan.skus?.find((item) => item.id === selectedSkuIds[plan.id]) || resolveSku(plan, purchaseMode);
                    const isCurrent = plan.id === current?.planId;
                    const isSelected = plan.id === selectedPlan?.id;
                    const isFeatured = (plan.level || 0) === maxPlanLevel && maxPlanLevel > 0;
                    const originalPrice = Number(sku?.originalPrice || sku?.price || 0);
                    const price = Number(sku?.price || 0);
                    const availableBenefits = (plan.benefits || []).filter(isAvailableBenefit);
                    const benefitGroups = Array.from(availableBenefits.reduce((groups, benefit) => {
                      const category = benefit.category || '其他权益';
                      groups.set(category, [...(groups.get(category) || []), benefit]);
                      return groups;
                    }, new Map<string, MembershipBenefit[]>()).entries())
                      .map(([category, benefits]) => ({ category, label: benefitCategoryLabel(category), benefits }))
                      .sort((left, right) => benefitCategoryOrder(left.category) - benefitCategoryOrder(right.category));
                    return (
                      <article
                        key={plan.id}
                        className={`membership-plan-card${isSelected ? ' is-selected' : ''}${isFeatured ? ' is-featured' : ''}`}
                        onClick={() => setSelectedPlanId(plan.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedPlanId(plan.id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSelected}
                      >
                        <div className="membership-plan-hero">
                          <header>
                            <h2>{plan.name}</h2>
                            {isCurrent ? (
                              <span className="membership-status-badge is-subscribed"><CheckOutlined />已订阅</span>
                            ) : isFeatured ? (
                              <span className="membership-status-badge is-recommended"><CrownOutlined />推荐</span>
                            ) : null}
                          </header>
                          <p>{plan.description || '适合稳定进行短视频内容生产的创作者与团队。'}</p>
                          <div className="membership-price-row">
                            <small>¥</small><strong>{sku ? price.toFixed(0) : '—'}</strong><span>/{sku ? formatPeriod(sku) : '该周期未开放'}</span>
                            {originalPrice > price && <del>¥{originalPrice.toFixed(0)}</del>}
                          </div>
                        </div>
                        <div className="membership-plan-benefits">
                          <div className="membership-plan-benefit-groups">
                            {benefitGroups.map((group) => (
                              <section className="membership-plan-benefit-group" key={group.category}>
                                <h3>{group.label}</h3>
                                <ul>
                                  {group.benefits.map((benefit) => (
                                    <li key={benefit.code}>
                                      <CheckOutlined />
                                      <span>{benefit.name}</span>
                                      <b>{benefitLabel(benefit.value, benefit.unit)}</b>
                                    </li>
                                  ))}
                                </ul>
                              </section>
                            ))}
                          </div>
                          {!availableBenefits.length ? <p className="membership-plan-empty-benefit">暂无已开放权益</p> : null}
                        </div>
                        <button className="membership-card-select" type="button" disabled={!sku}>
                          {!sku ? '该周期未开放' : isCurrent ? '续费' : '购买'}
                        </button>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="membership-empty">暂无可订阅套餐，请先在管理端启用会员套餐。</div>
              )}
            </div>

            <aside className="membership-checkout">
              <h2>{order ? '扫码支付' : '订单详情'}</h2>
              {order ? (
                <>
                  <div className="membership-qr-box">
                    {qrContent ? <QRCode value={qrContent} size={168} bordered={false} /> : <QrcodeOutlined />}
                  </div>
                  <p className="membership-qr-tip">{qrContent ? '请使用对应支付应用扫码付款' : '支付平台暂未返回二维码，请刷新订单状态'}</p>
                  <div className="membership-order-no">订单号 <strong>{order.orderNo}</strong></div>
                </>
              ) : (
                <div className="membership-pay-methods" aria-label="支付方式">
                  <button className="active" type="button">
                    {selectedPlan?.free
                      ? `${formatPeriod(selectedSku)}免费体验`
                      : <><AlipayCircleOutlined /> 支付宝</>}
                  </button>
                </div>
              )}

              {!order && selectedPlan?.skus?.length && selectedSku ? (
                <div className="membership-sku-picker">
                  <span>订阅方案</span>
                  <Select
                    value={selectedSku?.id}
                    options={selectedPlan.skus
                      .filter((sku) => selectedPlan.free || matchesPurchaseMode(sku, purchaseMode))
                      .map((sku) => ({
                        value: sku.id,
                        label: selectedPlan.free
                          ? `${formatPeriod(sku)} · 免费体验`
                          : `${formatPeriod(sku)} · 单次购买 · ¥${Number(sku.price).toFixed(2)}`,
                      }))}
                    classNames={{ popup: { root: 'membership-sku-dropdown' } }}
                    onChange={(skuId) => {
                      const nextSku = selectedPlan.skus?.find((sku) => sku.id === skuId);
                      setSelectedSkuIds((previous) => ({ ...previous, [selectedPlan.id]: skuId }));
                      if (nextSku) setPurchaseMode(purchaseModeOf(nextSku));
                      setOrder(null);
                    }}
                  />
                </div>
              ) : null}

              <dl className="membership-order-detail">
                <div><dt>会员套餐</dt><dd>{selectedPlan?.name || '请选择套餐'}</dd></div>
                <div><dt>订阅周期</dt><dd>{formatPeriod(selectedSku)}</dd></div>
                <div><dt>商品原价</dt><dd>¥{selectedOriginalPrice.toFixed(2)}</dd></div>
                {discount > 0 && <div className="discount"><dt>限时优惠</dt><dd>-¥{discount.toFixed(2)}</dd></div>}
              </dl>
              <div className="membership-total"><span>合计</span><strong><small>¥</small>{selectedPrice.toFixed(2)}</strong></div>
              {order ? (
                <button className="membership-submit" type="button" onClick={() => void refreshOrder()}><ReloadOutlined /> 我已支付，刷新状态</button>
              ) : (
                <button
                  className="membership-submit"
                  type="button"
                  disabled={!selectedPlan
                    || Boolean(submittingSku)
                    || (!selectedPlan.free && !selectedSku)
                    || (selectedPlan.free && selectedPlan.id === current?.planId)}
                  onClick={() => selectedPlan && void handlePlanAction(selectedPlan)}
                >
                  {selectedPlan?.free
                    ? selectedPlan.id === current?.planId
                      ? '已开通免费体验'
                        : submittingSku
                        ? '开通中…'
                        : `开通${formatPeriod(selectedSku)}免费体验`
                    : submittingSku
                      ? '创建订单中…'
                      : selectedPlan?.id === current?.planId
                        ? '立即续费'
                        : '立即购买'}
                </button>
              )}
              <p className="membership-agreement">购买前请阅读并同意《会员服务协议》</p>
            </aside>
          </section>
        )}

        <section className="membership-inline-comparison">
          <div className="membership-inline-comparison-heading">
            <h2>会员订阅，哪个更适合你？</h2>
            <button
              type="button"
              className="membership-comparison-toggle"
              onClick={() => setComparisonOpen(true)}
            >
              会员权益对比
            </button>
          </div>
        </section>

        <Modal
          open={comparisonOpen}
          title="会员权益对比"
          footer={null}
          onCancel={() => setComparisonOpen(false)}
          centered
          width={1500}
          destroyOnHidden
          className="membership-compare-modal-wrapper"
        >
          <div className="membership-compare-modal">
          {comparisonGroups.length ? (
            <div className="membership-comparison-scroll" role="region" aria-label="会员权益对比表格" tabIndex={0}>
              <table className="membership-comparison-table membership-comparison-table-inline">
                <thead>
                  <tr>
                    <th scope="col" className="sticky-col">权益项目</th>
                    {plans.map((plan) => (
                      <th scope="col" key={plan.id}>
                        <div className="membership-comparison-plan">
                          <div className="membership-comparison-plan-head">
                            <strong>{plan.name}</strong>
                            {plan.id === current?.planId ? <span className="membership-plan-current">当前</span> : null}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonGroups.map((group) => (
                    <Fragment key={group.category}>
                      <tr className="membership-comparison-category-row" key={`${group.category}-heading`}>
                        <th colSpan={plans.length + 1}>{group.label}</th>
                      </tr>
                      {group.rows.map((row) => (
                        <tr key={row.code}>
                          <th scope="row" className="sticky-col">
                            <div className="membership-comparison-label">
                              <span>{row.name}</span>
                              {row.previewOnly ? <em>预告</em> : null}
                              {row.description ? <small>{row.description}</small> : null}
                            </div>
                          </th>
                          {plans.map((plan) => {
                            const cell = comparisonCell(plan.id, row);
                            return (
                              <td key={`${row.code}-${plan.id}`} className={cell.enabled ? 'is-enabled' : 'is-disabled'}>
                                <span className="membership-comparison-value">
                                  {cell.enabled ? <CheckOutlined /> : <span className="membership-comparison-dash">—</span>}
                                  <span>{cell.label}</span>
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="membership-empty membership-comparison-empty">暂无对比数据，请先在后台配置会员权益。</div>
          )}
          </div>
        </Modal>

        <Modal
          open={customRequestOpen}
          title="至尊版独家模板定制"
          okText="提交工单"
          cancelText="关闭"
          confirmLoading={customRequestSubmitting}
          onOk={() => void submitCustomRequest()}
          onCancel={() => setCustomRequestOpen(false)}
          centered
          width={680}
          className="membership-custom-request-modal-wrapper"
        >
          <div className="membership-custom-request-form">
            <label><span>模板标题</span><input maxLength={120} value={customRequestForm.title} onChange={(event) => setCustomRequestForm({ ...customRequestForm, title: event.target.value })} placeholder="例如：美妆新品种草脚本模板" /></label>
            <label><span>详细需求</span><textarea maxLength={4000} rows={5} value={customRequestForm.requirements} onChange={(event) => setCustomRequestForm({ ...customRequestForm, requirements: event.target.value })} placeholder="请描述行业、目标平台、脚本结构和交付要求" /></label>
            <label><span>联系方式（选填）</span><input maxLength={200} value={customRequestForm.contact} onChange={(event) => setCustomRequestForm({ ...customRequestForm, contact: event.target.value })} placeholder="手机号、邮箱或微信" /></label>
            {customRequests.length ? <div className="membership-custom-request-history"><strong>已有工单</strong>{customRequests.map((item) => <div key={item.id}><span>{item.title}</span><b>{item.status}</b><small>{item.adminRemark || item.createdAt || ''}</small></div>)}</div> : null}
          </div>
        </Modal>

      </main>
    </div>
  );
};

export default MembershipHomePage;
