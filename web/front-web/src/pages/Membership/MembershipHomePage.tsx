import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlipayCircleOutlined,
  CheckOutlined,
  CloseOutlined,
  CrownOutlined,
  QrcodeOutlined,
  QuestionCircleOutlined,
  ReloadOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import { QRCode, Select, Spin, Tooltip, message, Modal } from 'antd';
import HomeRail from '../../components/Layout/HomeRail';
import { membershipApi } from '../../api/membership';
import { paymentApi } from '../../api/payment';
import type { DailyPointReward, MembershipBenefit, MembershipPlan, MembershipPlanSku, PointAccount, PointTransaction, UserMembership } from '../../types/membership';
import type { PaymentOrder } from '../../types/payment';
import './membership-page.css';

type PurchaseMode = 'once_month' | 'auto_month' | 'auto_quarter' | 'auto_year';

const purchaseModeOptions: Array<{ value: PurchaseMode; label: string; hint: string; badge?: string }> = [
  { value: 'once_month', label: '单月购买', hint: '购买一个月' },
  { value: 'auto_month', label: '连续包月', hint: '每月自动续费' },
  { value: 'auto_quarter', label: '连续包季', hint: '每季自动续费' },
  { value: 'auto_year', label: '连续包年', hint: '每年自动续费', badge: '限时优惠' },
];

const matchesPurchaseMode = (sku: MembershipPlanSku, mode: PurchaseMode) => {
  if (mode === 'once_month') return sku.periodUnit === 'month' && sku.billingMode !== 'auto_renew';
  if (mode === 'auto_month') return sku.periodUnit === 'month' && sku.billingMode === 'auto_renew';
  if (mode === 'auto_quarter') return sku.periodUnit === 'quarter' && sku.billingMode === 'auto_renew';
  return sku.periodUnit === 'year' && sku.billingMode === 'auto_renew';
};

const purchaseModeOf = (sku: MembershipPlanSku): PurchaseMode => {
  if (sku.periodUnit === 'year') return 'auto_year';
  if (sku.periodUnit === 'quarter') return 'auto_quarter';
  return sku.billingMode === 'auto_renew' ? 'auto_month' : 'once_month';
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

const isWeChatBrowser = () => typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent);

const getStoredOpenid = () => {
  if (typeof window === 'undefined') return undefined;
  return window.localStorage.getItem('openid') || window.sessionStorage.getItem('openid') || undefined;
};

const resolveContractChannel = () => (isWeChatBrowser() ? 'jsapi' : 'h5') as 'jsapi' | 'h5';

const resolveSku = (plan: MembershipPlan | undefined, mode: PurchaseMode) => {
  if (!plan?.skus?.length) return undefined;
  return plan.skus.find((sku) => matchesPurchaseMode(sku, mode)) || plan.skus[0];
};

const buildSkuSelectionMap = (planList: MembershipPlan[], mode: PurchaseMode) => Object.fromEntries(
  planList.map((plan) => [plan.id, resolveSku(plan, mode)?.id || '']),
);

const toDateKey = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatPeriod = (sku?: MembershipPlanSku) => {
  if (!sku) return '订阅周期';
  const count = sku.periodCount || 1;
  if (sku.periodUnit === 'year') return count === 1 ? '年卡' : `${count}年`;
  if (sku.periodUnit === 'quarter') return count === 1 ? '季卡' : `${count}季度`;
  return count === 1 ? '月卡' : `${count}个月`;
};

type ComparisonCell = { enabled: boolean; label: string };

const MembershipHomePage = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [current, setCurrent] = useState<UserMembership | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedSkuIds, setSelectedSkuIds] = useState<Record<string, string>>({});
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>('once_month');
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay'>('wechat');
  const [loading, setLoading] = useState(true);
  const [pointsAccount, setPointsAccount] = useState<PointAccount | null>(null);
  const [rewardClaiming, setRewardClaiming] = useState(false);
  const [rewardClaimedToday, setRewardClaimedToday] = useState(false);
  const [submittingSku, setSubmittingSku] = useState<string | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [planList, membership, pointAccount, pointResult] = await Promise.all([
        membershipApi.plans(),
        membershipApi.current(),
        membershipApi.points().catch(() => null),
        membershipApi.pointTransactions({ page: 1, pageSize: 10 }).catch(() => null),
      ]);
      setPlans(planList);
      setCurrent(membership);
      setPointsAccount(pointAccount);
      const currentPlan = planList.find((plan) => plan.id === membership?.planId);
      const currentSku = currentPlan?.skus?.find((sku) => sku.id === membership?.skuId);
      const initialMode = currentSku ? purchaseModeOf(currentSku) : 'once_month';
      setPurchaseMode(initialMode);
      setSelectedSkuIds(buildSkuSelectionMap(planList, initialMode));
      const firstPurchasable = planList.find((plan) => !plan.free) || planList[0];
      setSelectedPlanId((previous) => previous || currentPlan?.id || firstPurchasable?.id || '');
      const todayKey = toDateKey(new Date().toISOString());
      const rewardToday = (pointResult?.list || []).some((transaction: PointTransaction) => (
        transaction.transactionType === 'reward'
        && transaction.bizType === 'daily_login'
        && toDateKey(transaction.createdAt) === todayKey
      ));
      setRewardClaimedToday(rewardToday);
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

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || plans[0];
  const selectedSku = selectedPlan?.skus?.find((sku) => sku.id === selectedSkuIds[selectedPlan?.id || '']) || resolveSku(selectedPlan, purchaseMode);
  const selectedOriginalPrice = Number(selectedSku?.originalPrice || selectedSku?.price || 0);
  const selectedPrice = Number(selectedSku?.price || 0);
  const discount = Math.max(0, selectedOriginalPrice - selectedPrice);
  const qrContent = order?.qrContent || order?.payParams?.qrCode || order?.payParams?.payUrl || '';
  const autoRenewDisplayOn = (current?.autoRenew === true || current?.autoRenew === 1) && !current?.cancelAtPeriodEnd;
  const rewardPoints = pointsAccount?.availablePoints ?? 0;

  const claimDailyReward = async () => {
    setRewardClaiming(true);
    try {
      const reward = await membershipApi.claimDailyReward();
      const rewardInfo = reward as DailyPointReward;
      message.success(`领取成功，获得 ${rewardInfo.rewardPoints} 积分`);
      await load();
    } catch (error) {
      message.error((error as { message?: string })?.message || '今日已领取');
    } finally {
      setRewardClaiming(false);
    }
  };

  const submitFormHtml = (formHtml: string) => {
    const host = document.createElement('div');
    host.style.display = 'none';
    host.innerHTML = formHtml;
    const form = host.querySelector('form');
    if (!form) throw new Error('签约表单缺失');
    document.body.appendChild(form);
    (form as HTMLFormElement).submit();
  };

  const handlePlanAction = async (plan: MembershipPlan) => {
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
        ...(sku.billingMode === 'auto_renew' && payMethod === 'wechat' ? {
          openid: getStoredOpenid(),
          contractChannel: resolveContractChannel(),
        } : {}),
      });

      const isAutoRenewSku = sku.billingMode === 'auto_renew';
      if (isAutoRenewSku && payMethod === 'alipay' && nextOrder.contractFormHtml) {
        setOrder(nextOrder);
        message.success('订单已创建，正在跳转支付宝自动续费签约');
        submitFormHtml(nextOrder.contractFormHtml);
        return;
      }
      if (nextOrder.contractRedirectUrl) {
        setOrder(nextOrder);
        message.success(isAutoRenewSku ? '订单已创建，正在前往自动续费签约' : '订单已创建，正在跳转支付');
        window.location.href = nextOrder.contractRedirectUrl;
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
      <HomeRail activeLabel="会员中心" membershipName={current?.planName || (loading ? '' : '免费体验版')} />

      <main className="membership-page">
        <header className="membership-topbar">
          <nav className="membership-tabs" aria-label="会员中心导航">
            <button className="active" type="button">会员</button>
            <button type="button" onClick={() => navigate('/membership/orders')}>查看订单记录</button>
            <button type="button" onClick={() => navigate('/membership/auto-renew')}>管理自动续费</button>
          </nav>
          <button className="membership-refresh" type="button" onClick={() => void load()}>
            <ReloadOutlined /> 刷新
          </button>
        </header>

        <section className="membership-summary">
          <div>
            <span className="membership-eyebrow"><CrownOutlined /> 会员订阅</span>
            <h1>选择适合你的会员套餐</h1>
            <p>升级立即生效，降级和自动续费管理在当前周期结束后生效。</p>
            <div className="membership-summary-actions">
              <button className="membership-compare-trigger membership-compare-trigger-inline" type="button" onClick={() => setComparisonOpen(true)}>
                <QuestionCircleOutlined /> 查看权益对比
              </button>
            </div>
          </div>
          <div className="membership-summary-side">
            <div className="membership-account">
              <div>
                <span>当前套餐</span>
                <strong>{current?.planName || '免费版'}</strong>
                <small>有效期至 {current?.currentPeriodEnd || current?.expireTime || '长期有效'}</small>
                <small className={`membership-auto-renew-state ${autoRenewDisplayOn ? 'is-on' : 'is-off'}`}>
                  自动续费：{autoRenewDisplayOn ? '开' : '关'}
                </small>
              </div>
              <div className="membership-account-actions membership-page-actions">
                <button type="button" onClick={() => navigate('/membership/orders')}>查看订单记录</button>
                <button type="button" onClick={() => navigate('/membership/auto-renew')}>管理自动续费</button>
              </div>
            </div>

            <article className="membership-reward-card">
              <div className="membership-reward-card-head">
                <div>
                  <span className="membership-eyebrow">Daily reward</span>
                  <h2>每日登录积分</h2>
                </div>
                <span className={`membership-reward-state ${rewardClaimedToday ? 'is-claimed' : 'is-ready'}`}>
                  {rewardClaimedToday ? '今日已领取' : '可领取'}
                </span>
              </div>
              <div className="membership-reward-body">
                <strong>当前积分 {rewardPoints}</strong>
                <p>每日登录即可领取积分，连续登录别忘了来点一下。</p>
              </div>
              <button
                className="membership-reward-button"
                type="button"
                onClick={() => void claimDailyReward()}
                disabled={rewardClaiming || rewardClaimedToday}
              >
                {rewardClaiming ? '领取中…' : rewardClaimedToday ? '今日已领取' : '每日登录领取'}
              </button>
            </article>
          </div>
        </section>

        {loading ? <div className="membership-loading"><Spin size="large" /></div> : (
          <section className="membership-commerce">
            <div className="membership-catalog">
              <div className="membership-cycle-switch" role="group" aria-label="购买方式">
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
                    const visibleBenefits = (plan.benefits || []).filter((benefit) => {
                      const value = String(benefit.value ?? '').trim().toLowerCase();
                      return benefit.enabled && value !== '';
                    });
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
                        <header>
                          <div>
                            <h2>{plan.name}</h2>
                          </div>
                          {isCurrent ? (
                            <span className="membership-status-badge is-subscribed"><CheckOutlined />已订阅</span>
                          ) : isFeatured ? (
                            <span className="membership-status-badge is-recommended"><CrownOutlined />推荐</span>
                          ) : null}
                        </header>
                        <div className="membership-price-row">
                          <small>¥</small><strong>{price.toFixed(0)}</strong><span>/{formatPeriod(sku)}</span>
                          {originalPrice > price && <del>¥{originalPrice.toFixed(0)}</del>}
                        </div>
                        <p>{plan.description || '适合稳定进行短视频内容生产的创作者与团队。'}</p>
                        <div className="membership-benefit-title">套餐权益</div>
                        <ul>
                          {visibleBenefits.map((benefit) => (
                            <li key={benefit.code}>
                              <CheckOutlined /><span>{benefit.name}</span><b>{benefitLabel(benefit.value, benefit.unit)}</b>
                            </li>
                          ))}
                        </ul>
                        <button className="membership-card-select" type="button" disabled={isCurrent}>
                          {isCurrent ? '已订阅' : '订阅'}
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
                  <button className={payMethod === 'wechat' ? 'active' : ''} type="button" onClick={() => setPayMethod('wechat')}><WechatOutlined /> 微信</button>
                  <button className={payMethod === 'alipay' ? 'active' : ''} type="button" onClick={() => setPayMethod('alipay')}><AlipayCircleOutlined /> 支付宝</button>
                </div>
              )}

              {!order && selectedPlan?.skus?.length ? (
                <div className="membership-sku-picker">
                  <span>订阅方案</span>
                  <Select
                    value={selectedSku?.id}
                    options={selectedPlan.skus.map((sku) => ({ value: sku.id, label: `${sku.name} · ¥${Number(sku.price).toFixed(2)}` }))}
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
                  disabled={!selectedPlan || selectedPlan.free || !selectedSku || selectedPlan.id === current?.planId || submittingSku === selectedSku?.id}
                  onClick={() => selectedPlan && void handlePlanAction(selectedPlan)}
                >
                  {selectedPlan?.id === current?.planId ? '已订阅' : selectedPlan?.free ? '免费套餐' : submittingSku ? '创建订单中…' : '立即开通'}
                </button>
              )}
              <p className="membership-agreement">开通前请阅读并同意《会员服务协议》</p>
            </aside>
          </section>
        )}

        <Modal
          open={comparisonOpen}
          title="会员权益对比"
          centered
          width={1120}
          footer={null}
          destroyOnHidden
          onCancel={() => setComparisonOpen(false)}
          className="membership-compare-modal-wrapper"
        >
          <div className="membership-compare-modal">
            <div className="membership-section-head">
              <div>
                <span className="membership-eyebrow">Membership compare</span>
                <p>完整展示四档套餐的权益差异，当前套餐会自动标记。</p>
              </div>
              <div className="membership-rule-chips">
                <Tooltip title="升级套餐立即生效，降级将在当前周期结束后生效。">
                  <span className="membership-rule-chip"><QuestionCircleOutlined />生效规则</span>
                </Tooltip>
                <Tooltip title="月度额度按会员开通日期按月循环重置，不按自然月；到期清零，升级后当月立即切到新上限。">
                  <span className="membership-rule-chip"><QuestionCircleOutlined />月度重置</span>
                </Tooltip>
              </div>
            </div>

            {comparisonRows.length ? (
              <div className="membership-comparison-scroll" role="region" aria-label="会员权益对比表格" tabIndex={0}>
                <table className="membership-comparison-table">
                  <thead>
                    <tr>
                      <th scope="col" className="sticky-col">权益项</th>
                      <th scope="col" className="membership-benefit-category">类别</th>
                      {plans.map((plan) => {
                        const sku = resolveSku(plan, purchaseMode);
                        const isCurrent = plan.id === current?.planId;
                        return (
                          <th scope="col" key={plan.id}>
                            <div className="membership-comparison-plan">
                              <div className="membership-comparison-plan-head">
                                <strong>{plan.name}</strong>
                                {isCurrent ? <span className="membership-plan-current">当前</span> : null}
                              </div>
                              <span className="membership-comparison-price">¥{Number(sku?.price ?? plan.price ?? 0).toFixed(0)} / {formatPeriod(sku)}</span>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row) => (
                      <tr key={row.code}>
                        <th scope="row" className="sticky-col">
                          <div className="membership-comparison-label">
                            <span>{row.name}</span>
                            {row.previewOnly ? <em>预告</em> : null}
                            {row.description ? <small>{row.description}</small> : null}
                          </div>
                        </th>
                        <td className="membership-benefit-category">{row.category}</td>
                        {plans.map((plan) => {
                          const cell = comparisonCell(plan.id, row);
                          return (
                            <td key={`${row.code}-${plan.id}`} className={cell.enabled ? 'is-enabled' : 'is-disabled'}>
                              <span className="membership-comparison-value">
                                {cell.enabled ? <CheckOutlined /> : <CloseOutlined />}
                                <span>{cell.label}</span>
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="membership-empty membership-comparison-empty">暂无对比数据，请先在后台配置会员权益。</div>
            )}
          </div>
        </Modal>
      </main>
    </div>
  );
};

export default MembershipHomePage;
