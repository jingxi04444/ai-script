import { Fragment, useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  AlipayCircleOutlined,
  CheckSquareFilled,
  CheckOutlined,
  CloseOutlined,
  CrownOutlined,
  QrcodeOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { QRCode, Select, Spin, message, Modal } from 'antd';
import { membershipApi } from '../../api/membership';
import { paymentApi } from '../../api/payment';
import { siteApi, type HomeBanner } from '../../api/site';
import type { MembershipBenefit, MembershipPlan, MembershipPlanSku, MembershipPurchaseMode, PointAccount, UserMembership } from '../../types/membership';
import type { PaymentOrder } from '../../types/payment';
import { formatDate } from '../../utils/format';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';
import './membership-page.css';

type PurchaseMode = MembershipPurchaseMode['value'];

interface MembershipServiceAgreement {
  title: string;
  version: string;
  effectiveAt: string;
  content: string;
  enabled: boolean;
}

const membershipServiceAgreementFallback: MembershipServiceAgreement = {
  title: '会员服务协议',
  version: '1.0',
  effectiveAt: '',
  content: '',
  enabled: false,
};

const parseMembershipServiceAgreement = (value?: string): MembershipServiceAgreement => {
  if (!value) return membershipServiceAgreementFallback;
  try {
    const parsed = JSON.parse(value) as Partial<MembershipServiceAgreement>;
    return {
      title: parsed.title || membershipServiceAgreementFallback.title,
      version: parsed.version || membershipServiceAgreementFallback.version,
      effectiveAt: parsed.effectiveAt || '',
      content: parsed.content || '',
      enabled: Boolean(parsed.enabled),
    };
  } catch {
    return membershipServiceAgreementFallback;
  }
};

const purchaseModeFallbacks: MembershipPurchaseMode[] = [
  { value: 'once_month', label: '单月购买', hint: '购买一个月', enabled: true, displayOrder: 10 },
  { value: 'once_quarter', label: '季卡', hint: '购买一个季度', enabled: true, displayOrder: 20 },
  { value: 'once_year', label: '年卡', hint: '购买一年', badge: '限时5折', enabled: true, displayOrder: 30 },
];

const purchaseModeVisualOrder: Record<PurchaseMode, number> = {
  once_year: 10,
  once_quarter: 20,
  once_month: 30,
};

const sortPurchaseModesForDisplay = (modes: MembershipPurchaseMode[]) => (
  [...modes].sort((left, right) => (
    purchaseModeVisualOrder[left.value] - purchaseModeVisualOrder[right.value]
    || left.displayOrder - right.displayOrder
  ))
);

const resolveFirstPurchaseMode = (
  planList: MembershipPlan[],
  modeList: MembershipPurchaseMode[],
): PurchaseMode => {
  const enabledModes = new Set<PurchaseMode>();
  const purchasablePlans = planList.some((plan) => !plan.free)
    ? planList.filter((plan) => !plan.free)
    : planList;
  purchasablePlans.forEach((plan) => (plan.skus || []).forEach((sku) => {
    enabledModes.add(purchaseModeOf(sku));
  }));
  return sortPurchaseModesForDisplay(
    modeList.filter((option) => option.enabled && enabledModes.has(option.value)),
  )[0]?.value || 'once_month';
};

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

const pointBenefitSummary = (benefit: MembershipBenefit) => {
  const label = benefitLabel(benefit.value, benefit.unit);
  if (benefit.code === 'DAILY_LOGIN_POINT') return `每日登录赠送 ${label}`;
  if (benefit.code === 'POINTS_PER_10_YUAN') return `每10元可购买 ${label}`;
  if (benefit.code === 'POINT_PURCHASE_ACCESS') return benefit.value === 'true' ? '支持购买水滴' : '';
  return `${benefit.name} ${label}`;
};

const monthlyScriptSummary = (plan: MembershipPlan) => {
  const benefit = (plan.benefits || []).find((item) => item.code === 'SCRIPT_MONTHLY_LIMIT');
  const value = String(benefit?.value || '').trim().toLowerCase();
  if (!benefit || !isAvailableBenefit(benefit)) return '脚本额度由后台配置';
  if (value === 'unlimited') return '脚本不限/月';

  const speed = plan.level && plan.level >= 30
    ? '8h'
    : plan.level && plan.level >= 20
      ? '2h'
      : plan.level && plan.level >= 10
        ? '30分钟'
        : '';
  const period = plan.free ? '' : '/月';
  return `脚本约${value}条${period}${speed ? `，快至${speed}` : ''}`;
};

const cardCapabilityLabels = ['brief管理', '爆款拆解', '脚本模板库', 'AI智能分镜脚本'];

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

const MEMBERSHIP_DESKTOP_CANVAS_WIDTH = 1920;
const MEMBERSHIP_MOBILE_BREAKPOINT = 900;

const resolveDesktopCanvasScale = () => {
  if (typeof document === 'undefined') return 1;
  const viewportWidth = document.documentElement.clientWidth;
  return viewportWidth > MEMBERSHIP_MOBILE_BREAKPOINT
    ? Math.min(1, viewportWidth / MEMBERSHIP_DESKTOP_CANVAS_WIDTH)
    : 1;
};

const benefitCategoryMeta: Record<string, { label: string; order: number }> = {
  script: { label: '套餐额度', order: 5 },
  brief: { label: 'Brief 权益', order: 10 },
  template: { label: '模板库权益', order: 20 },
  viral: { label: '爆款复刻权益', order: 30 },
  point: { label: '水滴相关权益', order: 40 },
  video: { label: '未来视频权益', order: 50 },
  common: { label: '通用基础权益', order: 60 },
};

const benefitCategoryLabel = (category: string) => benefitCategoryMeta[category]?.label || category || '其他权益';
const benefitCategoryOrder = (category: string) => benefitCategoryMeta[category]?.order ?? 999;

const MembershipHomePage = () => {
  const navigate = useNavigate();
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
  const [membershipBanner, setMembershipBanner] = useState<HomeBanner | null>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [membershipAgreement, setMembershipAgreement] = useState<MembershipServiceAgreement>(membershipServiceAgreementFallback);
  const [desktopCanvasScale, setDesktopCanvasScale] = useState(resolveDesktopCanvasScale);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    const updateDesktopCanvasScale = () => {
      const nextScale = resolveDesktopCanvasScale();
      setDesktopCanvasScale((currentScale) => (
        Math.abs(currentScale - nextScale) < 0.001 ? currentScale : nextScale
      ));
    };

    updateDesktopCanvasScale();
    window.addEventListener('resize', updateDesktopCanvasScale);
    window.visualViewport?.addEventListener('resize', updateDesktopCanvasScale);
    return () => {
      window.removeEventListener('resize', updateDesktopCanvasScale);
      window.visualViewport?.removeEventListener('resize', updateDesktopCanvasScale);
    };
  }, []);

  const desktopCanvasStyle = useMemo(() => ({
    '--membership-desktop-scale': desktopCanvasScale,
    '--membership-desktop-canvas-width': `${MEMBERSHIP_DESKTOP_CANVAS_WIDTH}px`,
  } as CSSProperties), [desktopCanvasScale]);

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
      const initialMode = resolveFirstPurchaseMode(planList, modeList);
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
    siteApi.getHomeBanners()
      .then((items) => setMembershipBanner(items.find((item) => item.imageUrl) || items[0] || null))
      .catch(() => setMembershipBanner(null));
    siteApi.getConfig()
      .then((config) => setMembershipAgreement(parseMembershipServiceAgreement(config.membershipServiceAgreementConfig)))
      .catch(() => setMembershipAgreement(membershipServiceAgreementFallback));
  }, []);

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

  const displayedPurchaseModeOptions = useMemo(() => {
    return sortPurchaseModesForDisplay(purchaseModeOptions);
  }, [purchaseModeOptions]);

  useEffect(() => {
    if (!purchaseModeOptions.length || purchaseModeOptions.some((option) => option.value === purchaseMode)) return;
    setPurchaseMode(displayedPurchaseModeOptions[0].value);
  }, [displayedPurchaseModeOptions, purchaseMode, purchaseModeOptions]);

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
    if (!agreementAccepted) {
      message.warning('请先勾选并同意《会员服务协议》');
      return;
    }
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
          className: 'app-permission-modal',
          rootClassName: 'app-permission-modal-root',
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
    <div
      className={`membership-shell membership-shell-redesign${desktopCanvasScale < 0.999 ? ' is-scaled-desktop' : ''}`}
      style={desktopCanvasStyle}
    >
      <main className="membership-page membership-page-redesign">
        <header className="membership-design-header" aria-label="会员账户信息">
          <div className="membership-profile-identity">
            <span className="membership-profile-avatar">
              {user?.avatar ? <img src={user.avatar} alt="会员头像" /> : <UserOutlined />}
            </span>
            <div>
              <strong>{user?.username || '会员用户'}</strong>
              <div className="membership-profile-status-row">
                <span>{current?.planName || '尚未开通会员'}</span>
                <div className="membership-profile-meta">
                  <span>套餐到期</span>
                  <strong>{membershipExpiry ? formatDate(membershipExpiry, 'YYYY.MM.DD HH:mm') : '尚未开通'}</strong>
                </div>
                <div className="membership-profile-meta membership-profile-points">
                  <span>铼河水滴</span>
                  <strong>💧 {rewardPoints}</strong>
                </div>
              </div>
            </div>
          </div>
          <nav className="membership-design-nav" aria-label="会员中心导航">
            <button type="button" onClick={() => navigate('/membership/points')}>购买水滴</button>
            <button type="button" onClick={() => navigate('/membership/orders')}>订阅管理</button>
            <button type="button" onClick={() => navigate('/membership/exchange')}>会员兑换</button>
          </nav>
          <button
            type="button"
            className="membership-page-close"
            aria-label="关闭会员中心并返回上一页"
            title="关闭"
            onClick={() => {
              if (window.history.length > 1) navigate(-1);
              else navigate('/home', { replace: true });
            }}
          >
            <CloseOutlined />
          </button>
        </header>

        {loading ? <div className="membership-loading"><Spin size="large" /></div> : (
          <Fragment>
          <section className="membership-commerce">
            <div className="membership-catalog">
              <div className={`membership-cycle-switch mode-count-${Math.max(1, purchaseModeOptions.length)}`} role="group" aria-label="购买方式">
                {displayedPurchaseModeOptions.map((option) => (
                  <button
                    key={option.value}
                    className={purchaseMode === option.value ? 'active' : ''}
                    type="button"
                    onClick={() => {
                      setPurchaseMode(option.value);
                      setOrder(null);
                    }}
                  >
                    <span>{option.label}</span>
                    {option.value === 'once_year' && <em>限时5折</em>}
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
                    const pointSummaries = availableBenefits
                      .filter((benefit) => benefit.category === 'point')
                      .map(pointBenefitSummary)
                      .filter(Boolean)
                      .slice(0, 2);
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
                          {pointSummaries.length ? (
                            <div className="membership-plan-point-summary" aria-label="套餐水滴说明">
                              {pointSummaries.map((summary) => <span key={summary}>{summary}</span>)}
                            </div>
                          ) : null}
                        </div>
                        <div className="membership-plan-benefits">
                          <ul className="membership-card-benefit-group membership-card-benefit-highlights">
                            <li>
                              <CheckSquareFilled className="membership-benefit-check" />
                              <span>{monthlyScriptSummary(plan)}</span>
                            </li>
                            <li>
                              <CheckSquareFilled className="membership-benefit-check" />
                              <span>视频权益待上线中</span>
                            </li>
                          </ul>
                          <div className="membership-card-benefit-divider" />
                          <ul className="membership-card-benefit-group membership-card-benefit-capabilities">
                            {cardCapabilityLabels.map((label) => (
                              <li key={label}>
                                <CheckSquareFilled className="membership-benefit-check" />
                                <span>{label}</span>
                              </li>
                            ))}
                          </ul>
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
              {membershipBanner ? (
                <button
                  className="membership-promo-banner"
                  type="button"
                  onClick={() => {
                    if (!membershipBanner.linkUrl) return;
                    if (membershipBanner.linkUrl.startsWith('/')) navigate(membershipBanner.linkUrl);
                    else window.open(membershipBanner.linkUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  {membershipBanner.imageUrl ? <img src={membershipBanner.imageUrl} alt={membershipBanner.title || '会员活动'} /> : null}
                  <span><strong>{membershipBanner.title}</strong><small>{membershipBanner.subtitle}</small></span>
                </button>
              ) : null}
              <div className="membership-checkout-panel">
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
              <label className="membership-agreement">
                <input
                  type="checkbox"
                  checked={agreementAccepted}
                  onChange={(event) => setAgreementAccepted(event.target.checked)}
                  aria-label="同意会员服务协议"
                />
                <span>购买前请阅读并同意
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setAgreementOpen(true);
                    }}
                  >《{membershipAgreement.title || '会员服务协议'}》</button>
                </span>
              </label>
              </div>
            </aside>

            <section className="membership-inline-comparison">
              <div className="membership-inline-comparison-heading">
                <h2>会员订阅，哪个更适合你？</h2>
                <button
                  type="button"
                  className="membership-comparison-toggle"
                  aria-controls="membership-benefit-comparison"
                  onClick={() => document.getElementById('membership-benefit-comparison')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                  })}
                >
                  查看会员对比
                </button>
              </div>
            </section>
          </section>

          <section
            id="membership-benefit-comparison"
            className="membership-comparison-page"
            aria-label="会员权益对比"
          >
              {comparisonGroups.length ? (
                <div className="membership-comparison-page-scroll" role="region" aria-label="会员权益对比表格" tabIndex={0}>
                  <table className="membership-comparison-table membership-comparison-table-page">
                    <thead>
                      <tr>
                        <th scope="col" className="sticky-col"><span className="membership-visually-hidden">权益项目</span></th>
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
          </section>
          </Fragment>
        )}

        <Modal
          open={agreementOpen}
          footer={null}
          centered
          width={760}
          className="membership-service-agreement-modal"
          rootClassName="membership-service-agreement-modal-root"
          title={membershipAgreement.title || '会员服务协议'}
          onCancel={() => setAgreementOpen(false)}
        >
          <div className="membership-service-agreement-meta">
            <span>版本 {membershipAgreement.version || '1.0'}</span>
            {membershipAgreement.effectiveAt ? <span>生效时间 {membershipAgreement.effectiveAt.replace('T', ' ')}</span> : null}
          </div>
          <article className="membership-service-agreement-content">
            {membershipAgreement.enabled && membershipAgreement.content
              ? membershipAgreement.content
              : '会员服务协议暂未发布，请联系平台管理员在后台“协议管理”中维护并发布。'}
          </article>
          <button
            className="membership-service-agreement-confirm"
            type="button"
            onClick={() => {
              setAgreementAccepted(true);
              setAgreementOpen(false);
            }}
          >
            我已阅读并同意
          </button>
        </Modal>

      </main>
    </div>
  );
};

export default MembershipHomePage;
