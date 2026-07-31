import { useEffect, useMemo, useState } from 'react';
import {
  AlipayCircleOutlined,
  CheckOutlined,
  CrownOutlined,
  GiftOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  WechatOutlined,
} from '@ant-design/icons';
import { message, Modal, QRCode, Select, Spin } from 'antd';
import HomeRail from '../../components/Layout/HomeRail';
import RechargeDialog from '../../components/Modal/RechargeDialog';
import { membershipApi } from '../../api/membership';
import { paymentApi } from '../../api/payment';
import type { MembershipPlan, MembershipPlanSku, PointAccount, UserMembership } from '../../types/membership';
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
  if (value === 'false') return '未开放';
  if (value === 'unlimited') return '不限';
  if (value === 'all') return '全部';
  if (value === 'free_only') return '免费模板';
  if (unit?.toLowerCase() === 'byte') {
    const gigabytes = Number(value) / (1024 ** 3);
    if (Number.isFinite(gigabytes)) return `${Number(gigabytes.toFixed(1))}GB`;
  }
  return `${value}${unit || ''}`;
};

const resolveSku = (plan: MembershipPlan | undefined, mode: PurchaseMode) => {
  if (!plan?.skus?.length) return undefined;
  return plan.skus.find((sku) => matchesPurchaseMode(sku, mode)) || plan.skus[0];
};

const formatPeriod = (sku?: MembershipPlanSku) => {
  if (!sku) return '订阅周期';
  const count = sku.periodCount || 1;
  if (sku.periodUnit === 'year') return count === 1 ? '年卡' : `${count}年`;
  if (sku.periodUnit === 'quarter') return count === 1 ? '季卡' : `${count}季度`;
  return count === 1 ? '月卡' : `${count}个月`;
};

const MembershipPage = () => {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [current, setCurrent] = useState<UserMembership | null>(null);
  const [points, setPoints] = useState<PointAccount | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedSkuIds, setSelectedSkuIds] = useState<Record<string, string>>({});
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>('once_month');
  const [payMethod, setPayMethod] = useState('wechat');
  const [loading, setLoading] = useState(true);
  const [submittingSku, setSubmittingSku] = useState<string | null>(null);
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [showRecharge, setShowRecharge] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [planList, membership, pointAccount] = await Promise.all([
        membershipApi.plans(),
        membershipApi.current(),
        membershipApi.points(),
      ]);
      setPlans(planList);
      setCurrent(membership);
      setPoints(pointAccount);
      const currentPlan = planList.find((plan) => plan.id === membership?.planId);
      const currentSku = currentPlan?.skus?.find((sku) => sku.id === membership?.skuId);
      const initialMode = currentSku ? purchaseModeOf(currentSku) : 'once_month';
      setPurchaseMode(initialMode);
      setSelectedSkuIds(Object.fromEntries(planList.map((plan) => [
        plan.id,
        plan.id === currentPlan?.id && currentSku ? currentSku.id : resolveSku(plan, initialMode)?.id || '',
      ])));
      const firstPurchasable = planList.find((plan) => !plan.free) || planList[0];
      setSelectedPlanId((previous) => previous || currentPlan?.id || firstPurchasable?.id || '');
    } catch (error) {
      message.error((error as { message?: string })?.message || '会员信息加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const maxPlanLevel = useMemo(() => Math.max(...plans.map((plan) => plan.level || 0), 0), [plans]);
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId) || plans[0];
  const selectedSku = selectedPlan?.skus?.find((sku) => sku.id === selectedSkuIds[selectedPlan.id])
    || resolveSku(selectedPlan, purchaseMode);
  const selectedOriginalPrice = Number(selectedSku?.originalPrice || selectedSku?.price || 0);
  const selectedPrice = Number(selectedSku?.price || 0);
  const discount = Math.max(0, selectedOriginalPrice - selectedPrice);
  const qrContent = order?.qrContent || order?.payParams?.qrCode || order?.payParams?.payUrl || '';

  const claimReward = async () => {
    try {
      const reward = await membershipApi.claimDailyReward();
      setPoints((previous) => previous ? { ...previous, availablePoints: reward.balanceAfter } : previous);
      message.success(reward.alreadyClaimed ? '今日积分已经领取过了' : `已领取 ${reward.rewardPoints} 积分`);
    } catch (error) {
      message.error((error as { message?: string })?.message || '积分领取失败');
    }
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
      });
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

  const cancelRenewal = async () => {
    try {
      const next = await membershipApi.cancelRenewal();
      setCurrent(next);
      message.success('已取消自动续费，权益保留至当前周期结束');
    } catch (error) {
      message.error((error as { message?: string })?.message || '取消自动续费失败');
    }
  };

  const revokeDowngrade = async () => {
    try {
      const next = await membershipApi.revokeDowngrade();
      setCurrent(next);
      message.success('已撤销到期降级');
    } catch (error) {
      message.error((error as { message?: string })?.message || '撤销失败');
    }
  };

  const choosePlan = (planId: string) => {
    setSelectedPlanId(planId);
    setOrder(null);
  };

  const choosePurchaseMode = (mode: PurchaseMode) => {
    setPurchaseMode(mode);
    setSelectedSkuIds((previous) => Object.fromEntries(plans.map((plan) => {
      const matchingSku = plan.skus?.find((sku) => matchesPurchaseMode(sku, mode));
      return [plan.id, matchingSku?.id || previous[plan.id] || plan.skus?.[0]?.id || ''];
    })));
    setOrder(null);
  };

  return (
    <div className="membership-shell">
      <HomeRail
        activeLabel="会员中心"
        membershipName={current?.planName || (loading ? '' : '免费体验版')}
        pointBalance={points?.availablePoints}
        onRecharge={() => setShowRecharge(true)}
      />
      <main className="membership-page">
        <header className="membership-topbar">
          <nav className="membership-tabs" aria-label="会员中心导航">
            <button className="active" type="button">会员</button>
            <button type="button" onClick={() => setShowRecharge(true)}>购买积分包</button>
          </nav>
          <button className="membership-refresh" type="button" onClick={() => void load()}>
            <ReloadOutlined /> 刷新
          </button>
        </header>

        <section className="membership-summary">
          <div>
            <span className="membership-eyebrow"><CrownOutlined /> 会员订阅</span>
            <h1>选择适合你的会员套餐</h1>
            <p>升级立即生效，降级和取消续费在当前周期结束后生效。</p>
          </div>
          <div className="membership-account">
            <div>
              <span>当前套餐</span>
              <strong>{current?.planName || '免费版'}</strong>
              <small>有效期至 {current?.currentPeriodEnd || current?.expireTime || '长期有效'}</small>
            </div>
            <div>
              <span>积分余额</span>
              <strong>{points?.availablePoints ?? 0}</strong>
              <button type="button" onClick={() => void claimReward()}><GiftOutlined /> 每日领取</button>
            </div>
            <div className="membership-account-actions">
              {current?.pendingPlanId && <button type="button" onClick={() => void revokeDowngrade()}>撤销降级</button>}
              {current?.autoRenew && !current?.cancelAtPeriodEnd && <button type="button" onClick={() => void cancelRenewal()}>取消续费</button>}
            </div>
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
                    onClick={() => choosePurchaseMode(option.value)}
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
                      const isZeroLimit = (benefit.valueType === 'integer' || benefit.valueType === 'decimal') && Number(value) === 0;
                      return benefit.enabled && value !== '' && value !== 'false' && !isZeroLimit;
                    });
                    return (
                      <article
                        key={plan.id}
                        className={`membership-plan-card${isSelected ? ' is-selected' : ''}${isFeatured ? ' is-featured' : ''}`}
                        onClick={() => choosePlan(plan.id)}
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
      </main>
      {showRecharge && <RechargeDialog
          initialPointBalance={points?.availablePoints}
          initialPointsPerTen={Number(plans.find((plan) => plan.id === current?.planId)?.benefits?.find((benefit) => benefit.code === 'POINTS_PER_10_YUAN' && benefit.enabled)?.value || 0)}
          onClose={() => setShowRecharge(false)}
        />}
    </div>
  );
};

export default MembershipPage;