import { useEffect, useMemo, useState } from 'react';
import { Check, Coins, Crown, Eye, Pencil, RefreshCcw, Save } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import {
  membershipApi,
  type AdminSubscription,
  type MembershipBenefit,
  type MembershipPlan,
  type MembershipPlanCreatePayload,
  type MembershipPurchaseMode,
  type MembershipSkuCreatePayload,
  type PointPackage,
  type RefundOrder,
  type TemplateCustomRequest,
} from '../../api/membership';
import { EmptyState, Modal, PageHeader, Pagination, SectionCard, StatusBadge } from '../../components/common/AdminUI';
import { useAdminShell } from '../../components/Layout/adminShell';
import './billing-page.css';

type BillingSection = 'plans' | 'subscriptions' | 'points' | 'refunds' | 'custom_requests';
type PurchaseMode = 'once_month' | 'once_quarter' | 'once_year';
type PointManagementTab = 'costs' | 'packages' | 'adjustment' | 'welcome';
type PlanSku = MembershipPlan['skus'][number];
type PointCostCode =
  | 'BRIEF_DETECT_POINT_COST'
  | 'VIRAL_SIMPLE_POINT_COST'
  | 'VIRAL_DEEP_POINT_COST'
  | 'SCRIPT_GENERATE_POINT_COST'
  | 'SCRIPT_POLISH_POINT_COST';

type PointCostDrafts = Record<string, Record<PointCostCode, string>>;
const NEW_USER_WELCOME_POINT = 'NEW_USER_WELCOME_POINT';
const MEMBERSHIP_TIER_CODES = ['free', 'light', 'pro', 'ultimate'] as const;

interface PlanSkuCard {
  plan: MembershipPlan;
  sku: PlanSku;
  mode: PurchaseMode;
}

interface PlanCreateFormState {
  code: string;
  name: string;
  level: string;
  free: boolean;
  price: string;
  periodDays: string;
  description: string;
  displayOrder: string;
  status: '1' | '0';
}

interface SkuCreateFormState {
  code: string;
  name: string;
  billingMode: MembershipSkuCreatePayload['billingMode'];
  periodUnit: MembershipSkuCreatePayload['periodUnit'];
  periodCount: string;
  price: string;
  originalPrice: string;
  refundDays: string;
  displayOrder: string;
  status: '1' | '0';
}

interface BenefitCreateFormState {
  code: string;
  value: string;
  enabled: boolean;
}

interface PointPackageFormState {
  id?: string;
  code: string;
  name: string;
  price: string;
  points: string;
  description: string;
  displayOrder: string;
  status: '1' | '0';
}

const createPointPackageFormState = (pointPackage?: PointPackage): PointPackageFormState => ({
  id: pointPackage?.id,
  code: pointPackage?.code || '',
  name: pointPackage?.name || '',
  price: String(pointPackage?.price ?? ''),
  points: String(pointPackage?.points ?? ''),
  description: pointPackage?.description || '',
  displayOrder: String(pointPackage?.displayOrder ?? 0),
  status: pointPackage?.status === 0 ? '0' : '1',
});

const createPlanFormState = (): PlanCreateFormState => ({
  code: '',
  name: '',
  level: '1',
  free: false,
  price: '0',
  periodDays: '30',
  description: '',
  displayOrder: '0',
  status: '1',
});

const createSkuFormState = (plan?: MembershipPlan, sku?: PlanSku): SkuCreateFormState => ({
  code: '',
  name: '',
  billingMode: 'one_time',
  periodUnit: sku?.periodUnit || 'month',
  periodCount: String(sku?.periodCount || 1),
  price: '0',
  originalPrice: '',
  refundDays: String(sku?.refundDays || 0),
  displayOrder: String((plan?.skus?.length || 0) + 1),
  status: '1',
});

const createBenefitFormState = (): BenefitCreateFormState => ({
  code: '',
  value: '',
  enabled: true,
});

const parseOptionalNumber = (value: string) => (value.trim() ? Number(value) : undefined);

const purchaseModeOptions: Array<{ value: PurchaseMode; label: string; hint: string; badge?: string }> = [
  { value: 'once_month', label: '单月购买', hint: '购买一个月' },
  { value: 'once_quarter', label: '季卡', hint: '购买一个季度' },
  { value: 'once_year', label: '年卡', hint: '购买一年', badge: '限时优惠' },
];

const pointCostRules: Array<{ code: PointCostCode; label: string; hint: string }> = [
  { code: 'BRIEF_DETECT_POINT_COST', label: 'Brief 检测', hint: '每次执行 Brief 智能检测' },
  { code: 'VIRAL_SIMPLE_POINT_COST', label: '爆款简易解析', hint: '每次确认生成简易文案分析' },
  { code: 'VIRAL_DEEP_POINT_COST', label: '爆款深度解析', hint: '每次确认生成深度拉片拆解' },
  { code: 'SCRIPT_GENERATE_POINT_COST', label: '脚本生成', hint: '每次提交生成脚本' },
  { code: 'SCRIPT_POLISH_POINT_COST', label: '脚本润色', hint: '每次发送修改要求' },
];

const pointCostAccessCode: Partial<Record<PointCostCode, string>> = {
  BRIEF_DETECT_POINT_COST: 'BRIEF_DETECT_ACCESS',
  VIRAL_SIMPLE_POINT_COST: 'VIRAL_SIMPLE_ACCESS',
  VIRAL_DEEP_POINT_COST: 'VIRAL_DEEP_ACCESS',
};

const isPointCostFeatureAvailable = (plan: MembershipPlan, code: PointCostCode) => {
  const accessCode = pointCostAccessCode[code];
  if (accessCode) {
    const access = plan.benefits.find((benefit) => benefit.code === accessCode);
    return Boolean(access?.enabled && access.value === 'true');
  }
  const scriptLimit = plan.benefits.find((benefit) => benefit.code === 'SCRIPT_MONTHLY_LIMIT');
  return Boolean(scriptLimit?.enabled && scriptLimit.value !== '0');
};

const pointManagementTabs: Array<{ value: PointManagementTab; label: string; hint: string }> = [
  { value: 'costs', label: '消耗规则', hint: '配置不同会员的单次操作消耗' },
  { value: 'packages', label: '水滴包配置', hint: '维护前台可购买的水滴包' },
  { value: 'adjustment', label: '人工调整', hint: '为指定用户增加或扣减水滴' },
  { value: 'welcome', label: '新用户赠送', hint: '设置首次注册到账水滴' },
];

const createPointCostDrafts = (plans: MembershipPlan[]): PointCostDrafts => Object.fromEntries(
  plans.map((plan) => [
    plan.id,
    Object.fromEntries(pointCostRules.map((rule) => [
      rule.code,
      String(plan.benefits.find((benefit) => benefit.code === rule.code)?.value ?? '0'),
    ])) as Record<PointCostCode, string>,
  ]),
);

const sectionByPath: Record<string, BillingSection> = {
  '/membership/plans': 'plans',
  '/membership/subscriptions': 'subscriptions',
  '/membership/points': 'points',
  '/membership/refunds': 'refunds',
  '/membership/custom-requests': 'custom_requests',
};

const sectionMeta: Record<BillingSection, { title: string; description: string }> = {
  plans: { title: '套餐权益', description: '以 SKU 为维度查看全部会员卡，通过弹窗完成前台预览与编辑。' },
  subscriptions: { title: '用户订阅', description: '查看用户当前会员、续费状态和待生效套餐。' },
  points: { title: '水滴管理', description: '配置各会员等级的水滴消耗、可售水滴包，并支持人工调整用户水滴。' },
  refunds: { title: '退款审核', description: '审核会员退款申请，跟踪退款状态和权益回收结果。' },
  custom_requests: { title: '定制模板工单', description: '处理至尊会员提交的独家模板定制需求。' },
};

const copyPlan = (plan: MembershipPlan): MembershipPlan => ({
  ...plan,
  skus: (plan.skus || []).map((sku) => ({ ...sku })),
  benefits: (plan.benefits || []).map((benefit) => ({ ...benefit })),
});

const formatPrice = (value: number | undefined) => `¥${Number(value || 0).toFixed(2)}`;

const subscriptionStatusMeta: Record<string, { label: string; tone: 'green' | 'orange' | 'gray' | 'red' }> = {
  active: { label: '有效', tone: 'green' },
  canceling: { label: '到期取消', tone: 'orange' },
  past_due: { label: '待续费', tone: 'orange' },
  canceled: { label: '已取消', tone: 'gray' },
  expired: { label: '已过期', tone: 'gray' },
  suspended: { label: '已暂停', tone: 'red' },
};

const inferPurchaseMode = (sku: PlanSku): PurchaseMode => purchaseModeOptions.find((option) => matchesPurchaseMode(sku, option.value))?.value || 'once_month';

const resolveSkuForMode = (plan: MembershipPlan, mode: PurchaseMode, includeInactive = false) => (
  plan.skus.find((sku) => (includeInactive || sku.status !== 0) && matchesPurchaseMode(sku, mode))
  || plan.skus.find((sku) => includeInactive || sku.status !== 0)
  || plan.skus[0]
);

const resolveSkuByIdOrMode = (plan: MembershipPlan, skuId: string | null, mode: PurchaseMode, includeInactive = false) => (
  (skuId ? plan.skus.find((sku) => sku.id === skuId) : undefined)
  || resolveSkuForMode(plan, mode, includeInactive)
);

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
  if (sku.billingMode !== 'one_time') return false;
  if (mode === 'once_month') return sku.periodUnit === 'month';
  if (mode === 'once_quarter') return sku.periodUnit === 'quarter';
  return sku.periodUnit === 'year';
};

const formatPreviewPeriod = (plan: MembershipPlan, mode: PurchaseMode, editor = false, skuId?: string) => {
  const sku = skuId ? plan.skus.find((item) => item.id === skuId) : resolveSkuForMode(plan, mode, editor);
  if (!sku) return plan.periodDays > 0 ? `${plan.periodDays}天` : '长期';
  const count = sku.periodCount || 1;
  if (sku.periodUnit === 'day') return `${count}天`;
  if (sku.periodUnit === 'year') return count === 1 ? '年卡' : `${count}年`;
  if (sku.periodUnit === 'quarter') return count === 1 ? '季卡' : `${count}季度`;
  return count === 1 ? '月卡' : `${count}个月`;
};

const formatSkuPeriod = (sku: PlanSku) => {
  const count = sku.periodCount || 1;
  if (sku.periodUnit === 'day') return `${count}天`;
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
  sku?: PlanSku;
  mode: PurchaseMode;
  editor?: boolean;
}

const MembershipCardView = ({ plan, sku, mode, editor = false }: MembershipCardViewProps) => {
  const activeSku = sku || resolveSkuForMode(plan, mode, editor);
  const price = Number(activeSku?.price ?? plan.price ?? 0);
  const originalPrice = activeSku?.originalPrice;
  const featured = (plan.level || 0) >= 3;

  return <article className={`membership-preview-card is-selected${featured ? ' is-featured' : ''}`}>
    <header>
      <div className="membership-preview-card-title">
        <span className="membership-preview-level">L{plan.level || 0}</span>
        <div>
          <h3>{plan.name || '未命名套餐'}</h3>
          <p>{activeSku?.name || '未命名 SKU'} · {activeSku?.code || '—'}</p>
        </div>
      </div>
      {featured
        ? <span className="membership-preview-status is-recommended"><Crown size={14} />推荐</span>
        : <span className="membership-preview-status is-current"><Check size={15} />{editor ? '实时预览' : '已订阅'}</span>}
    </header>
    <div className="membership-preview-price-row"><small>¥</small><strong>{price.toFixed(0)}</strong><span>/{activeSku ? formatSkuPeriod(activeSku) : formatPreviewPeriod(plan, mode, editor)}</span>{originalPrice != null ? <del>{formatPrice(originalPrice)}</del> : null}</div>
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
  const [purchaseModeConfigs, setPurchaseModeConfigs] = useState<MembershipPurchaseMode[]>([]);
  const [subscriptions, setSubscriptions] = useState<AdminSubscription[]>([]);
  const [refunds, setRefunds] = useState<RefundOrder[]>([]);
  const [pointPackages, setPointPackages] = useState<PointPackage[]>([]);
  const [pointCostDrafts, setPointCostDrafts] = useState<PointCostDrafts>({});
  const [customRequests, setCustomRequests] = useState<TemplateCustomRequest[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [previewPlan, setPreviewPlan] = useState<MembershipPlan | null>(null);
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [editingSkuPriceInput, setEditingSkuPriceInput] = useState('');
  const [previewSkuId, setPreviewSkuId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PurchaseMode>('once_year');
  const [editingMode, setEditingMode] = useState<PurchaseMode>('once_year');
  const [pointForm, setPointForm] = useState({ userId: '', changePoints: '', remark: '' });
  const [pointPackageForm, setPointPackageForm] = useState<PointPackageFormState>(createPointPackageFormState());
  const [planCreateOpen, setPlanCreateOpen] = useState(false);
  const [planCreateForm, setPlanCreateForm] = useState<PlanCreateFormState>(createPlanFormState());
  const [skuCreateOpen, setSkuCreateOpen] = useState(false);
  const [skuCreateForm, setSkuCreateForm] = useState<SkuCreateFormState>(createSkuFormState());
  const [benefitCreateOpen, setBenefitCreateOpen] = useState(false);
  const [benefitCreateForm, setBenefitCreateForm] = useState<BenefitCreateFormState>(createBenefitFormState());
  const [welcomePointDraft, setWelcomePointDraft] = useState('0');
  const [pointManagementTab, setPointManagementTab] = useState<PointManagementTab>('costs');

  const pointCostPlans = useMemo(
    () => MEMBERSHIP_TIER_CODES.flatMap((code) => {
      const plan = plans.find((item) => item.code === code);
      return plan ? [plan] : [];
    }),
    [plans],
  );

  const skuCards = useMemo<PlanSkuCard[]>(() => plans.flatMap((plan) => (plan.skus || []).map((sku) => ({
    plan,
    sku,
    mode: inferPurchaseMode(sku),
  }))), [plans]);

  const openPreview = (card: PlanSkuCard) => {
    setPreviewMode(card.mode);
    setPreviewSkuId(card.sku.id);
    setPreviewPlan(copyPlan(card.plan));
  };

  const openEditor = (card: PlanSkuCard) => {
    setEditingMode(card.mode);
    setEditingSkuId(card.sku.id);
    setEditingSkuPriceInput(String(card.sku.price));
    setEditingPlan(copyPlan(card.plan));
    setSkuCreateOpen(false);
    setBenefitCreateOpen(false);
  };

  const openPlanCreate = () => {
    setPlanCreateForm(createPlanFormState());
    setPlanCreateOpen(true);
  };

  const openSkuCreate = () => {
    if (!editingPlan) return;
    setSkuCreateForm(createSkuFormState(editingPlan, activeEditingSku));
    setSkuCreateOpen(true);
  };

  const openBenefitCreate = () => {
    if (!editingPlan) return;
    setBenefitCreateForm(createBenefitFormState());
    setBenefitCreateOpen(true);
  };

  const loadPlans = async () => {
    setLoading(true);
    try {
      const [planList, modeList] = await Promise.all([membershipApi.getPlans(), membershipApi.purchaseModes()]);
      setPlans(planList);
      setPurchaseModeConfigs(modeList);
    }
    catch { notify('会员套餐加载失败'); }
    finally { setLoading(false); }
  };

  const patchPurchaseMode = (value: PurchaseMode, patch: Partial<MembershipPurchaseMode>) => {
    setPurchaseModeConfigs((current) => current.map((item) => item.value === value ? { ...item, ...patch } : item));
  };

  const savePurchaseModes = async () => {
    if (!purchaseModeConfigs.some((item) => item.enabled)) {
      notify('至少需要保留一种购买方式');
      return;
    }
    if (purchaseModeConfigs.some((item) => !item.label.trim())) {
      notify('购买方式名称不能为空');
      return;
    }
    setLoading(true);
    try {
      const saved = await membershipApi.updatePurchaseModes(purchaseModeConfigs);
      setPurchaseModeConfigs(saved);
      notify('会员中心购买方式已更新');
    } catch { notify('购买方式保存失败'); }
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

  const loadPointPackages = async () => {
    setLoading(true);
    try {
      const [packages, planList] = await Promise.all([
        membershipApi.pointPackages(),
        membershipApi.getPlans(),
      ]);
      setPointPackages(packages);
      setPlans(planList);
      setPointCostDrafts(createPointCostDrafts(planList));
      const freePlan = planList.find((plan) => plan.free);
      setWelcomePointDraft(String(
        freePlan?.benefits.find((benefit) => benefit.code === NEW_USER_WELCOME_POINT)?.value ?? '0',
      ));
    }
    catch { notify('水滴配置加载失败'); }
    finally { setLoading(false); }
  };

  const loadCustomRequests = async (targetPage = page) => {
    setLoading(true);
    try {
      const result = await membershipApi.templateCustomRequests({ page: targetPage, pageSize: 10, keyword: keyword || undefined, status: status || undefined });
      setCustomRequests(result.list || []);
      setTotal(result.total || 0);
      setPage(targetPage);
    } catch { notify('定制模板工单加载失败'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    setPage(1);
    setKeyword('');
    setStatus('');
    if (section === 'plans') void loadPlans();
    if (section === 'subscriptions') void loadSubscriptions(1);
    if (section === 'points') void loadPointPackages();
    if (section === 'refunds') void loadRefunds(1);
    if (section === 'custom_requests') void loadCustomRequests(1);
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

  const updateCustomRequest = async (item: TemplateCustomRequest, nextStatus: string) => {
    const remark = window.prompt('请输入处理备注（可选）', item.adminRemark || '') ?? undefined;
    if (remark === undefined) return;
    try {
      await membershipApi.updateTemplateCustomRequest(item.id, { status: nextStatus, adminRemark: remark || undefined });
      notify('定制模板工单已更新');
      await loadCustomRequests(page);
    } catch { notify('定制模板工单更新失败'); }
  };

  const createPlan = async () => {
    if (!planCreateForm.code.trim() || !planCreateForm.name.trim()) {
      notify('请填写套餐编码和名称');
      return;
    }
    setLoading(true);
    try {
      const payload: MembershipPlanCreatePayload = {
        code: planCreateForm.code.trim(),
        name: planCreateForm.name.trim(),
        level: Number(planCreateForm.level || 0),
        free: planCreateForm.free,
        price: Number(planCreateForm.price || 0),
        periodDays: Number(planCreateForm.periodDays || 0),
        description: planCreateForm.description.trim() || undefined,
        displayOrder: parseOptionalNumber(planCreateForm.displayOrder),
        status: Number(planCreateForm.status),
      };
      await membershipApi.createPlan(payload);
      notify('套餐已创建');
      setPlanCreateOpen(false);
      setPlanCreateForm(createPlanFormState());
      await loadPlans();
    } catch {
      notify('套餐创建失败，请检查字段格式');
    } finally {
      setLoading(false);
    }
  };

  const createSku = async () => {
    if (!editingPlan) return;
    if (!skuCreateForm.code.trim() || !skuCreateForm.name.trim()) {
      notify('请填写 SKU 编码和名称');
      return;
    }
    if (!skuCreateForm.price.trim() || !Number.isFinite(Number(skuCreateForm.price))) {
      notify('销售价格不能为空');
      return;
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(skuCreateForm.price.trim())) {
      notify('销售价格最多保留两位小数');
      return;
    }
    setLoading(true);
    try {
      const payload: MembershipSkuCreatePayload = {
        code: skuCreateForm.code.trim(),
        name: skuCreateForm.name.trim(),
        billingMode: skuCreateForm.billingMode,
        periodUnit: skuCreateForm.periodUnit,
        periodCount: Number(skuCreateForm.periodCount || 0),
        price: Number(skuCreateForm.price || 0),
        originalPrice: parseOptionalNumber(skuCreateForm.originalPrice),
        refundDays: Number(skuCreateForm.refundDays || 0),
        displayOrder: parseOptionalNumber(skuCreateForm.displayOrder),
        status: Number(skuCreateForm.status),
      };
      const updatedPlan = await membershipApi.createSku(editingPlan.id, payload);
      const nextSku = updatedPlan.skus.find((sku) => sku.code === payload.code) || updatedPlan.skus[updatedPlan.skus.length - 1];
      notify('SKU 已创建');
      setSkuCreateOpen(false);
      setSkuCreateForm(createSkuFormState(updatedPlan, nextSku));
      setEditingPlan(copyPlan(updatedPlan));
      if (nextSku) {
        setEditingSkuId(nextSku.id);
        setEditingSkuPriceInput(String(nextSku.price));
        setEditingMode(inferPurchaseMode(nextSku));
      }
      await loadPlans();
    } catch {
      notify('SKU 创建失败，请检查字段格式');
    } finally {
      setLoading(false);
    }
  };

  const createBenefit = async () => {
    if (!editingPlan) return;
    if (!benefitCreateForm.code.trim()) {
      notify('请填写权益编码');
      return;
    }
    setLoading(true);
    try {
      const updatedPlan = await membershipApi.createBenefit(editingPlan.id, {
        code: benefitCreateForm.code.trim(),
        value: benefitCreateForm.value.trim(),
        enabled: benefitCreateForm.enabled,
      });
      notify('权益已添加到套餐');
      setBenefitCreateOpen(false);
      setBenefitCreateForm(createBenefitFormState());
      setEditingPlan(copyPlan(updatedPlan));
      await loadPlans();
    } catch {
      notify('权益添加失败，请检查权益编码和权益值');
    } finally {
      setLoading(false);
    }
  };

  const activeEditingSku = editingPlan && editingSkuId
    ? editingPlan.skus.find((sku) => sku.id === editingSkuId)
    : undefined;
  const activePreviewSku = previewPlan ? resolveSkuByIdOrMode(previewPlan, previewSkuId, previewMode, false) : undefined;

  const savePlan = async () => {
    if (!editingPlan) return;
    if (!activeEditingSku) {
      notify('当前编辑的 SKU 不存在，请关闭弹窗后重新选择');
      return;
    }
    if (!editingPlan.name.trim()) {
      notify('请填写套餐名称');
      return;
    }
    if (!editingSkuPriceInput.trim() || !Number.isFinite(Number(editingSkuPriceInput)) || Number(editingSkuPriceInput) < 0) {
      notify('销售价格不能为空，且必须是有效金额');
      return;
    }
    if (!/^\d+(?:\.\d{1,2})?$/.test(editingSkuPriceInput.trim())) {
      notify('销售价格最多保留两位小数');
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
        membershipApi.updateSku(activeEditingSku.id, {
          name: activeEditingSku.name,
          billingMode: activeEditingSku.billingMode,
          periodUnit: activeEditingSku.periodUnit,
          periodCount: Number(activeEditingSku.periodCount || 0),
          price: Number(editingSkuPriceInput),
          originalPrice: activeEditingSku.originalPrice,
          refundDays: Number(activeEditingSku.refundDays || 0),
          displayOrder: activeEditingSku.displayOrder,
          status: activeEditingSku.status ?? 1,
        }),
        ...editingPlan.benefits.map((benefit) => membershipApi.updateBenefit(editingPlan.id, benefit.code, {
          value: benefit.value,
          enabled: benefit.enabled,
        })),
      ]);
      notify(`${editingPlan.name} 已保存`);
      setEditingPlan(null);
      setEditingSkuId(null);
      setEditingSkuPriceInput('');
      await loadPlans();
    } catch { notify('套餐保存失败，请检查字段格式'); }
    finally { setLoading(false); }
  };

  const adjustPoints = async () => {
    const changePoints = Number(pointForm.changePoints);
    if (!pointForm.userId.trim() || !Number.isFinite(changePoints) || changePoints === 0) {
      notify('请填写用户 ID 和非 0 的水滴调整数量');
      return;
    }
    setLoading(true);
    try {
      await membershipApi.adjustPoints({ userId: pointForm.userId.trim(), changePoints, remark: pointForm.remark });
      notify('水滴已调整并写入流水');
      setPointForm({ userId: '', changePoints: '', remark: '' });
    } catch { notify('水滴调整失败'); }
    finally { setLoading(false); }
  };

  const patchPointCost = (planId: string, code: PointCostCode, value: string) => {
    setPointCostDrafts((current) => ({
      ...current,
      [planId]: {
        ...(current[planId] || Object.fromEntries(pointCostRules.map((rule) => [rule.code, '0'])) as Record<PointCostCode, string>),
        [code]: value,
      },
    }));
  };

  const savePointCosts = async () => {
    if (!pointCostPlans.length) {
      notify('暂无可配置的会员等级');
      return;
    }
    const invalid = pointCostPlans.some((plan) => pointCostRules.some((rule) => {
      const value = pointCostDrafts[plan.id]?.[rule.code]?.trim() ?? '';
      const numericValue = Number(value);
      return !/^\d+$/.test(value) || !Number.isSafeInteger(numericValue) || numericValue > 1_000_000;
    }));
    if (invalid) {
      notify('水滴消耗必须填写 0–1,000,000 的整数');
      return;
    }

    setLoading(true);
    try {
      const updatedPlans = await membershipApi.updatePointCosts(pointCostPlans.flatMap((plan) => pointCostRules.map((rule) => ({
        planId: plan.id,
        benefitCode: rule.code,
        value: Number(pointCostDrafts[plan.id][rule.code]),
      }))));
      setPlans(updatedPlans);
      setPointCostDrafts(createPointCostDrafts(updatedPlans));
      notify('💧消耗规则已更新');
    } catch {
      notify('水滴消耗规则保存失败，请确认已执行最新数据库迁移');
    } finally {
      setLoading(false);
    }
  };

  const saveWelcomePoints = async () => {
    const freePlan = plans.find((plan) => plan.free);
    const numericValue = Number(welcomePointDraft.trim());
    if (!freePlan) {
      notify('未找到新用户免费套餐');
      return;
    }
    if (!/^\d+$/.test(welcomePointDraft.trim()) || !Number.isSafeInteger(numericValue) || numericValue > 1_000_000) {
      notify('新用户初始水滴必须填写 0–1,000,000 的整数');
      return;
    }

    setLoading(true);
    try {
      const updatedPlan = await membershipApi.updateBenefit(freePlan.id, NEW_USER_WELCOME_POINT, {
        value: String(numericValue),
        enabled: true,
      });
      setPlans((current) => current.map((plan) => plan.id === updatedPlan.id ? updatedPlan : plan));
      setWelcomePointDraft(String(
        updatedPlan.benefits.find((benefit) => benefit.code === NEW_USER_WELCOME_POINT)?.value ?? numericValue,
      ));
      notify('新用户初始💧已更新');
    } catch {
      notify('初始水滴保存失败，请确认已执行最新数据库迁移');
    } finally {
      setLoading(false);
    }
  };

  const savePointPackage = async () => {
    const price = Number(pointPackageForm.price);
    const points = Number(pointPackageForm.points);
    if (!pointPackageForm.name.trim() || (!pointPackageForm.id && !pointPackageForm.code.trim()) || price <= 0 || !Number.isInteger(points) || points <= 0) {
      notify('请完整填写水滴包编码、名称、有效价格和水滴数量');
      return;
    }
    const payload = {
      name: pointPackageForm.name.trim(),
      price,
      points,
      description: pointPackageForm.description.trim() || undefined,
      displayOrder: Number(pointPackageForm.displayOrder || 0),
      status: Number(pointPackageForm.status),
    };
    setLoading(true);
    try {
      if (pointPackageForm.id) {
        await membershipApi.updatePointPackage(pointPackageForm.id, payload);
      } else {
        await membershipApi.createPointPackage({ ...payload, code: pointPackageForm.code.trim() });
      }
      notify(pointPackageForm.id ? '水滴包已更新' : '水滴包已创建');
      setPointPackageForm(createPointPackageFormState());
      await loadPointPackages();
    } catch { notify('水滴包保存失败，请检查编码和字段格式'); }
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
    if (section === 'points') void loadPointPackages();
    if (section === 'refunds') void loadRefunds();
  };

  return (
    <div className="page-stack membership-admin-page">
      <PageHeader
        title={meta.title}
        description={meta.description}
        actions={<button className="toolbar-btn" type="button" onClick={refresh} disabled={loading}><RefreshCcw size={16} />刷新</button>}
      />

      {section === 'plans' && <>
      <SectionCard
        title="会员中心购买方式"
        description="控制会员中心顶部 Tab 的名称、说明、角标、显示状态和排列顺序。隐藏后前台不会再展示该 Tab。"
        action={<button className="toolbar-btn primary" type="button" onClick={() => void savePurchaseModes()} disabled={loading}><Save size={16} />保存 Tab 配置</button>}
      >
        <div className="membership-mode-config-grid">
          {purchaseModeConfigs.map((item) => <article key={item.value} className={item.enabled ? 'is-enabled' : 'is-disabled'}>
            <div className="membership-mode-config-head"><div><strong>{item.label || '未命名购买方式'}</strong><span>{item.value}</span></div><StatusBadge tone={item.enabled ? 'green' : 'gray'}>{item.enabled ? '前台显示' : '前台隐藏'}</StatusBadge></div>
            <div className="membership-mode-config-fields">
              <label className="field"><span>Tab 名称</span><input value={item.label} onChange={(event) => patchPurchaseMode(item.value, { label: event.target.value })} /></label>
              <label className="field"><span>第二行说明</span><input value={item.hint || ''} onChange={(event) => patchPurchaseMode(item.value, { hint: event.target.value })} /></label>
              <label className="field"><span>右上角角标</span><input value={item.badge || ''} onChange={(event) => patchPurchaseMode(item.value, { badge: event.target.value })} placeholder="留空则不显示" /></label>
              <label className="field"><span>显示顺序</span><input type="number" value={item.displayOrder} onChange={(event) => patchPurchaseMode(item.value, { displayOrder: Number(event.target.value) })} /></label>
              <label className="field"><span>前台状态</span><select value={item.enabled ? '1' : '0'} onChange={(event) => patchPurchaseMode(item.value, { enabled: event.target.value === '1' })}><option value="1">显示</option><option value="0">隐藏</option></select></label>
            </div>
          </article>)}
        </div>
      </SectionCard>
      <SectionCard
        title="会员 SKU 列表"
        description="以 SKU 为维度查看全部会员卡，点击预览或编辑即可进入对应 SKU。"
        action={<div className="toolbar-group billing-plan-actions"><StatusBadge tone="green">{skuCards.length} 个 SKU</StatusBadge><button className="toolbar-btn primary" type="button" onClick={openPlanCreate} disabled={loading}>新增套餐</button></div>}
      >
        {skuCards.length ? <div className="membership-admin-sku-table"><table><thead><tr><th>套餐 / SKU</th><th>价格 / 周期</th><th>状态</th><th>操作</th></tr></thead><tbody>{skuCards.map((card) => {
          const { plan, sku } = card;
          const featured = (plan.level || 0) >= 3;
          const isDisabled = plan.status === 0 || sku.status === 0;
          return <tr key={sku.id} className={isDisabled ? 'is-disabled' : featured ? 'is-featured' : ''}>
            <td>
              <div className="membership-admin-sku-title">
                <span className="membership-level">L{plan.level || 0}</span>
                <div>
                  <strong>{plan.name}</strong>
                  <small>{plan.code} · {sku.name} · {sku.code}</small>
                </div>
              </div>
            </td>
            <td>
              <div className="membership-admin-sku-price">
                <strong>{formatPrice(Number(sku.price || 0))}</strong>
                <small>{formatSkuPeriod(sku)} · 单次购买</small>
                {sku.originalPrice != null ? <span>原价 {formatPrice(sku.originalPrice)}</span> : null}
              </div>
            </td>
            <td>
              <div className="membership-admin-sku-status">
                <StatusBadge tone={sku.status !== 0 ? 'green' : 'gray'}>{sku.status !== 0 ? 'SKU 启用' : 'SKU 停用'}</StatusBadge>
                <small>{plan.status !== 0 ? '套餐启用' : '套餐停用'}{featured ? ' · 推荐' : ''}</small>
              </div>
            </td>
            <td>
              <div className="table-actions membership-admin-sku-actions">
                <button type="button" onClick={() => openPreview(card)}><Eye size={14} />预览</button>
                <button type="button" className="primary" onClick={() => openEditor(card)}><Pencil size={14} />编辑</button>
              </div>
            </td>
          </tr>;
        })}</tbody></table></div> : <EmptyState title="暂无 SKU" description="请先执行会员初始化数据脚本。" />}
      </SectionCard></>}

      <Modal
        open={planCreateOpen}
        title="新增套餐"
        description="创建新的会员套餐，并同步生成前台展示所需的基础字段。"
        size="lg"
        onClose={() => setPlanCreateOpen(false)}
        footer={<><button className="modal-btn" type="button" onClick={() => setPlanCreateOpen(false)}>取消</button><button className="modal-btn primary" type="button" onClick={() => void createPlan()} disabled={loading}>创建套餐</button></>}
      >
        <div className="membership-create-form field-grid">
          <label className="field"><span>套餐编码</span><input value={planCreateForm.code} onChange={(event) => setPlanCreateForm({ ...planCreateForm, code: event.target.value })} placeholder="例如 pro_monthly" /></label>
          <label className="field"><span>套餐名称</span><input value={planCreateForm.name} onChange={(event) => setPlanCreateForm({ ...planCreateForm, name: event.target.value })} placeholder="例如 专业版" /></label>
          <label className="field"><span>套餐等级</span><input type="number" min="0" value={planCreateForm.level} onChange={(event) => setPlanCreateForm({ ...planCreateForm, level: event.target.value })} /></label>
          <label className="field"><span>展示价格</span><input type="number" min="0" value={planCreateForm.price} onChange={(event) => setPlanCreateForm({ ...planCreateForm, price: event.target.value })} /></label>
          <label className="field"><span>兼容周期天数</span><input type="number" min="0" value={planCreateForm.periodDays} onChange={(event) => setPlanCreateForm({ ...planCreateForm, periodDays: event.target.value })} /></label>
          <label className="field"><span>展示顺序</span><input type="number" value={planCreateForm.displayOrder} onChange={(event) => setPlanCreateForm({ ...planCreateForm, displayOrder: event.target.value })} /></label>
          <label className="field membership-checkbox-field"><span>免费套餐</span><input type="checkbox" checked={planCreateForm.free} onChange={(event) => setPlanCreateForm({ ...planCreateForm, free: event.target.checked })} /></label>
          <label className="field"><span>套餐状态</span><select value={planCreateForm.status} onChange={(event) => setPlanCreateForm({ ...planCreateForm, status: event.target.value as '1' | '0' })}><option value="1">启用</option><option value="0">停用</option></select></label>
          <label className="field membership-editor-wide"><span>套餐说明</span><textarea rows={4} value={planCreateForm.description} onChange={(event) => setPlanCreateForm({ ...planCreateForm, description: event.target.value })} placeholder="简要说明套餐定位和适用人群" /></label>
        </div>
      </Modal>

      {section === 'subscriptions' && <SectionCard title="用户订阅列表" description="升级立即生效，待降级套餐会单独展示。">
        <div className="membership-admin-filter"><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="用户名、账号或用户 ID" /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option><option value="active">有效</option><option value="canceling">到期取消</option><option value="expired">已过期</option></select><button className="toolbar-btn primary" onClick={() => void loadSubscriptions(1)}>查询</button></div>
        <div className="membership-subscription-table-wrap">
          <table className="membership-subscription-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>套餐 / SKU</th>
                <th>状态</th>
                <th>购买方式</th>
                <th>当前周期</th>
                <th>待生效套餐</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.map((item) => {
                const statusMeta = subscriptionStatusMeta[item.status] || { label: item.status || '未知', tone: 'gray' as const };
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="membership-subscription-cell">
                        <strong>{item.username || item.account || `用户 ${item.userId}`}</strong>
                        <small>用户 ID：{item.userId}</small>
                      </div>
                    </td>
                    <td>
                      <div className="membership-subscription-cell">
                        <strong>{item.planName || '未配置套餐'}</strong>
                        <small>{item.skuName ? `SKU：${item.skuName}` : '未绑定 SKU'}</small>
                      </div>
                    </td>
                    <td><StatusBadge tone={statusMeta.tone}>{statusMeta.label}</StatusBadge></td>
                    <td>
                      <div className="membership-subscription-cell membership-subscription-purchase">
                        <strong>{item.autoRenew ? '自动续费' : '单次购买'}</strong>
                        {item.cancelAtPeriodEnd ? <small>到期后取消</small> : null}
                      </div>
                    </td>
                    <td>
                      <div className="membership-subscription-cell membership-subscription-period">
                        <time dateTime={item.currentPeriodStart}>{item.currentPeriodStart || '—'}</time>
                        <small>{item.currentPeriodEnd ? <>至 <time dateTime={item.currentPeriodEnd}>{item.currentPeriodEnd}</time></> : '未设置结束时间'}</small>
                      </div>
                    </td>
                    <td><span className="membership-subscription-pending">{item.pendingPlanName || '—'}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!subscriptions.length && !loading ? <EmptyState title="暂无订阅记录" description="调整筛选条件后重新查询。" /> : null}
        <Pagination page={page} pageSize={10} total={total} onChange={(next) => void loadSubscriptions(next)} />
      </SectionCard>}

      {section === 'points' && <div className="membership-point-page-stack">
        <div className="membership-point-tabs" role="tablist" aria-label="水滴管理功能">
          {pointManagementTabs.map((tab) => <button
            key={tab.value}
            id={`membership-point-tab-${tab.value}`}
            className={pointManagementTab === tab.value ? 'is-active' : ''}
            type="button"
            role="tab"
            aria-selected={pointManagementTab === tab.value}
            aria-controls="membership-point-tab-panel"
            onClick={() => setPointManagementTab(tab.value)}
          >
            <strong>{tab.label}</strong>
            <small>{tab.hint}</small>
          </button>)}
        </div>

        <div
          id="membership-point-tab-panel"
          className="membership-point-tab-panel"
          role="tabpanel"
          aria-labelledby={`membership-point-tab-${pointManagementTab}`}
        >
        {pointManagementTab === 'welcome' ? <SectionCard
          title="新用户初始水滴"
          description="首次创建免费用户账号时一次性到账；已经注册的用户不会补发，也不会重复赠送。"
          action={<button className="toolbar-btn primary" type="button" onClick={() => void saveWelcomePoints()} disabled={loading}><Save size={16} />保存赠送值</button>}
        >
          <div className="membership-point-layout">
            <div className="membership-point-form">
              <label className="field">
                <span>免费新用户初始赠送</span>
                <input
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  inputMode="numeric"
                  value={welcomePointDraft}
                  onChange={(event) => setWelcomePointDraft(event.target.value)}
                />
                <small>默认示例值为 💧200，可覆盖多次基础体验；设为 0 即关闭赠送。</small>
              </label>
            </div>
            <aside className="membership-point-note"><Coins size={22} /><h3>仅首次赠送</h3><p>赠送流水使用固定请求号防重。后台后续改值只影响新注册用户，不会追溯修改已有用户余额。</p></aside>
          </div>
        </SectionCard> : null}

        {pointManagementTab === 'costs' ? <SectionCard
          title="💧 消耗规则"
          description="仅按四个会员等级设置；0 表示本次免费，不表示未开放。未开放的功能由套餐权益控制，并在表格中单独标记。"
          action={<button className="toolbar-btn primary" type="button" onClick={() => void savePointCosts()} disabled={loading}><Save size={16} />保存规则</button>}
        >
          <div className="membership-point-cost-table-wrap">
            <table className="membership-point-cost-table">
              <thead>
                <tr>
                  <th>消耗场景</th>
                  {pointCostPlans.map((plan) => <th key={plan.id}><strong>{plan.name}</strong><small>L{plan.level || 0} · {plan.code}</small></th>)}
                </tr>
              </thead>
              <tbody>
                {pointCostRules.map((rule) => <tr key={rule.code}>
                  <th scope="row"><strong>{rule.label}</strong><small>{rule.hint}</small></th>
                  {pointCostPlans.map((plan) => {
                    const available = isPointCostFeatureAvailable(plan, rule.code);
                    return <td key={plan.id}>
                      {available ? <>
                        <label className="membership-point-cost-input">
                          <span aria-hidden="true">💧</span>
                          <input
                            type="number"
                            min="0"
                            max="1000000"
                            step="1"
                            inputMode="numeric"
                            aria-label={`${plan.name}${rule.label}水滴消耗`}
                            value={pointCostDrafts[plan.id]?.[rule.code] ?? '0'}
                            onChange={(event) => patchPointCost(plan.id, rule.code, event.target.value)}
                          />
                        </label>
                        {pointCostDrafts[plan.id]?.[rule.code] === '0' ? <small className="membership-point-cost-free">本次免费</small> : null}
                      </> : <div className="membership-point-cost-unavailable"><strong>未开放</strong><small>请到套餐权益中开启</small></div>}
                    </td>;
                  })}
                </tr>)}
              </tbody>
            </table>
          </div>
          {!pointCostPlans.length && !loading ? <EmptyState title="暂无会员等级" description="请先初始化免费体验版、轻量版、专业版和至尊版。" /> : null}
        </SectionCard> : null}

        {pointManagementTab === 'packages' ? <SectionCard
          title="水滴包配置"
          description="这里配置的价格和到账水滴会直接展示在用户端“购买水滴”页面。"
          action={<button className="toolbar-btn primary" type="button" onClick={() => setPointPackageForm(createPointPackageFormState())}>新增水滴包</button>}
        >
          <div className="membership-point-package-admin-grid">
            <div className="membership-point-package-list">
              {pointPackages.map((pointPackage) => <button key={pointPackage.id} className={pointPackageForm.id === pointPackage.id ? 'is-active' : ''} type="button" onClick={() => setPointPackageForm(createPointPackageFormState(pointPackage))}>
                <div><strong>{pointPackage.name}</strong><small>{pointPackage.code}</small></div>
                <span>💧 {pointPackage.points.toLocaleString()}</span>
                <b>{formatPrice(pointPackage.price)}</b>
                <StatusBadge tone={pointPackage.status === 1 ? 'green' : 'gray'}>{pointPackage.status === 1 ? '启用' : '停用'}</StatusBadge>
              </button>)}
              {!pointPackages.length && !loading ? <EmptyState title="暂无水滴包" description="点击右上角新增第一个水滴包。" /> : null}
            </div>
            <div className="membership-point-package-form">
              <div className="membership-point-package-form-head"><div><strong>{pointPackageForm.id ? '编辑水滴包' : '新增水滴包'}</strong><span>保存后用户端自动读取最新配置</span></div>{pointPackageForm.id ? <button type="button" onClick={() => setPointPackageForm(createPointPackageFormState())}>取消编辑</button> : null}</div>
              <div className="field-grid">
                <label className="field"><span>水滴包编码</span><input value={pointPackageForm.code} disabled={Boolean(pointPackageForm.id)} onChange={(event) => setPointPackageForm({ ...pointPackageForm, code: event.target.value })} placeholder="例如 drops_500" /></label>
                <label className="field"><span>水滴包名称</span><input value={pointPackageForm.name} onChange={(event) => setPointPackageForm({ ...pointPackageForm, name: event.target.value })} placeholder="例如 基础水滴包" /></label>
                <label className="field"><span>销售价格</span><input type="number" min="0.01" step="0.01" value={pointPackageForm.price} onChange={(event) => setPointPackageForm({ ...pointPackageForm, price: event.target.value })} /></label>
                <label className="field"><span>轻量版基础水滴</span><input type="number" min="1" step="1" value={pointPackageForm.points} onChange={(event) => setPointPackageForm({ ...pointPackageForm, points: event.target.value })} /><small>专业版按 550/500、至尊版按 600/500 自动加成</small></label>
                <label className="field"><span>展示顺序</span><input type="number" value={pointPackageForm.displayOrder} onChange={(event) => setPointPackageForm({ ...pointPackageForm, displayOrder: event.target.value })} /></label>
                <label className="field"><span>状态</span><select value={pointPackageForm.status} onChange={(event) => setPointPackageForm({ ...pointPackageForm, status: event.target.value as '1' | '0' })}><option value="1">启用</option><option value="0">停用</option></select></label>
                <label className="field membership-editor-wide"><span>展示说明</span><textarea rows={3} value={pointPackageForm.description} onChange={(event) => setPointPackageForm({ ...pointPackageForm, description: event.target.value })} placeholder="用户端卡片上的简短说明" /></label>
              </div>
              <button className="toolbar-btn primary membership-point-submit" disabled={loading} onClick={() => void savePointPackage()}><Save size={16} />保存水滴包</button>
            </div>
          </div>
        </SectionCard> : null}

        {pointManagementTab === 'adjustment' ? <div className="membership-point-layout">
          <SectionCard title="人工调整水滴" description="正数增加、负数扣减；每次操作都会写入不可重复的水滴流水。">
            <div className="membership-point-form">
              <label className="field"><span>用户 ID</span><input value={pointForm.userId} onChange={(event) => setPointForm({ ...pointForm, userId: event.target.value })} placeholder="请输入用户 ID" /></label>
              <label className="field"><span>调整数量</span><input type="number" value={pointForm.changePoints} onChange={(event) => setPointForm({ ...pointForm, changePoints: event.target.value })} placeholder="例如 500 或 -100" /></label>
              <label className="field"><span>调整原因</span><textarea rows={4} value={pointForm.remark} onChange={(event) => setPointForm({ ...pointForm, remark: event.target.value })} placeholder="请填写本次人工调整原因" /></label>
            </div>
            <button className="toolbar-btn primary membership-point-submit" disabled={loading} onClick={() => void adjustPoints()}><Coins size={16} />确认调整</button>
          </SectionCard>
          <aside className="membership-point-note"><Coins size={22} /><h3>操作提示</h3><p>增加水滴填写正数，扣减水滴填写负数。提交前请核对用户 ID，水滴流水生成后不可重复提交。</p></aside>
        </div> : null}
        </div>
      </div>}

      {section === 'refunds' && <SectionCard title="会员退款列表" description="审核通过后原路退款并立即回收会员权益。">
        <div className="membership-admin-filter"><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="退款单号或支付订单号" /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option><option value="pending">待审核</option><option value="approved">已通过</option><option value="completed">已完成</option><option value="rejected">已拒绝</option></select><button className="toolbar-btn primary" onClick={() => void loadRefunds(1)}>查询</button></div>
        <div className="table-wrap"><table><thead><tr><th>退款单</th><th>用户</th><th>金额</th><th>原因</th><th>状态</th><th>申请时间</th><th>操作</th></tr></thead><tbody>{refunds.map((item) => <tr key={item.id}><td>{item.refundNo}<small>{item.paymentOrderNo}</small></td><td>{item.userId}</td><td>{formatPrice(item.refundAmount)}</td><td>{item.refundReason || '—'}</td><td><StatusBadge tone={item.status === 'completed' ? 'green' : item.status === 'pending' ? 'orange' : 'gray'}>{item.status}</StatusBadge></td><td>{item.requestedTime}</td><td>{item.status === 'pending' ? <div className="table-actions"><button onClick={() => void reviewRefund(item.refundNo, true)}>通过</button><button onClick={() => void reviewRefund(item.refundNo, false)}>拒绝</button></div> : '—'}</td></tr>)}</tbody></table></div>
        {!refunds.length && !loading ? <EmptyState title="暂无退款申请" description="调整筛选条件后重新查询。" /> : null}
        <Pagination page={page} pageSize={10} total={total} onChange={(next) => void loadRefunds(next)} />
      </SectionCard>}

      {section === 'custom_requests' && <SectionCard title="至尊会员独家模板定制" description="工单入口受 EXCLUSIVE_TEMPLATE_REQUEST 权益保护，只有已开通该权益的会员可以提交。">
        <div className="membership-admin-filter"><input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="标题、需求或联系方式" /><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">全部状态</option><option value="pending">待处理</option><option value="processing">处理中</option><option value="completed">已完成</option><option value="rejected">已拒绝</option></select><button className="toolbar-btn primary" onClick={() => void loadCustomRequests(1)}>查询</button></div>
        <div className="table-wrap"><table><thead><tr><th>用户</th><th>模板需求</th><th>联系方式</th><th>状态</th><th>处理备注</th><th>操作</th></tr></thead><tbody>{customRequests.map((item) => <tr key={item.id}><td>ID {item.userId}</td><td><strong>{item.title}</strong><small>{item.requirements}</small></td><td>{item.contact || '—'}</td><td><StatusBadge tone={item.status === 'completed' ? 'green' : item.status === 'pending' ? 'orange' : 'gray'}>{item.status}</StatusBadge></td><td>{item.adminRemark || '—'}</td><td><div className="table-actions">{item.status === 'pending' ? <button onClick={() => void updateCustomRequest(item, 'processing')}>开始处理</button> : null}{item.status === 'processing' ? <button onClick={() => void updateCustomRequest(item, 'completed')}>完成</button> : null}{!['completed', 'rejected'].includes(item.status) ? <button onClick={() => void updateCustomRequest(item, 'rejected')}>拒绝</button> : '—'}</div></td></tr>)}</tbody></table></div>
        {!customRequests.length && !loading ? <EmptyState title="暂无定制模板工单" description="至尊会员提交后会显示在这里。" /> : null}
        <Pagination page={page} pageSize={10} total={total} onChange={(next) => void loadCustomRequests(next)} />
      </SectionCard>}

      <Modal
        open={Boolean(editingPlan)}
        title={editingPlan && activeEditingSku ? `编辑 SKU · ${editingPlan.name} / ${activeEditingSku.name}` : '编辑 SKU'}
        description="只展示并修改当前点击的 SKU；套餐名称和权益属于该套餐的共用配置。"
        size="full"
        closeOnBackdrop={false}
        onClose={() => { setEditingPlan(null); setEditingSkuId(null); setEditingSkuPriceInput(''); }}
        footer={<><button className="modal-btn" type="button" onClick={() => { setEditingPlan(null); setEditingSkuId(null); setEditingSkuPriceInput(''); }}>取消</button><button className="modal-btn primary" type="button" onClick={() => void savePlan()} disabled={loading}><Save size={16} />{loading ? '保存中' : '保存 SKU'}</button></>}
      >
        {editingPlan ? <div className="membership-card-editor-layout">
          <aside className="membership-card-editor-preview">
            <div className="membership-card-editor-heading"><div><strong>前台预览</strong><span>修改右侧内容，这张 SKU 卡会同步变化</span></div><StatusBadge tone={editingPlan.status !== 0 ? 'green' : 'gray'}>{editingPlan.status !== 0 ? '展示中' : '已隐藏'}</StatusBadge></div>
            <div className="membership-preview-context is-inline">
              <div><strong>{activeEditingSku?.name || '当前 SKU'}</strong><span>{activeEditingSku?.code || '—'} · {activeEditingSku ? formatSkuPeriod(activeEditingSku) : '—'}</span></div>
              {activeEditingSku ? <span><b>{activeEditingSku.status !== 0 ? '启用中' : '已停用'}</b> · 单次购买</span> : null}
            </div>
            <MembershipCardView plan={editingPlan} sku={activeEditingSku} mode={editingMode} editor />
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

          <section className="membership-editor-section"><div className="membership-editor-title"><span>02</span><div><h4>当前 SKU</h4><p>这里只编辑列表中刚才点击的 SKU，不会加载或保存同套餐的其他 SKU。</p></div><div className="toolbar-group membership-editor-actions"><button className="toolbar-btn primary" type="button" onClick={openSkuCreate} disabled={loading}>新增 SKU</button></div></div><div className="membership-admin-sku-grid">{activeEditingSku ? [activeEditingSku].map((sku) => <article className="is-current" key={sku.id}>
            <div className="membership-sku-head"><div><strong>{sku.name}</strong><span>{sku.code}</span></div><StatusBadge tone="blue">单次购买</StatusBadge></div>
            <div className="membership-sku-fields">
              <label className="field"><span>SKU 名称</span><input value={sku.name} onChange={(event) => patchSku(sku.id, { name: event.target.value })} /></label>
              <label className="field"><span>销售价格</span><input type="text" inputMode="decimal" required value={editingSkuPriceInput} onChange={(event) => { const nextValue = event.target.value; if (nextValue !== '' && /^\d+(?:\.\d{0,2})?$/.test(nextValue)) { setEditingSkuPriceInput(nextValue); patchSku(sku.id, { price: Number(nextValue) }); } }} /></label>
              <label className="field"><span>原价</span><input type="number" min="0" step="0.01" value={sku.originalPrice ?? ''} onChange={(event) => patchSku(sku.id, { originalPrice: event.target.value ? Number(event.target.value) : undefined })} /></label>
              <label className="field"><span>退款天数</span><input type="number" min="0" value={sku.refundDays} onChange={(event) => patchSku(sku.id, { refundDays: Number(event.target.value) })} /></label>
              <label className="field"><span>SKU 状态</span><select value={sku.status ?? 1} onChange={(event) => patchSku(sku.id, { status: Number(event.target.value) })}><option value={1}>启用</option><option value={0}>停用</option></select></label>
            </div>
          </article>) : null}{skuCreateOpen ? <article className="membership-create-card"><div className="membership-sku-head"><div><strong>新增 SKU</strong><span>为当前套餐添加新的售卖规格</span></div><StatusBadge tone="green">新建</StatusBadge></div><div className="membership-sku-fields"><label className="field"><span>SKU 编码</span><input value={skuCreateForm.code} onChange={(event) => setSkuCreateForm({ ...skuCreateForm, code: event.target.value })} placeholder="例如 pro_quarter" /></label><label className="field"><span>SKU 名称</span><input value={skuCreateForm.name} onChange={(event) => setSkuCreateForm({ ...skuCreateForm, name: event.target.value })} placeholder="例如 专业版季卡" /></label><label className="field"><span>购买方式</span><input value="单次购买" disabled /></label><label className="field"><span>周期单位</span><select value={skuCreateForm.periodUnit} onChange={(event) => setSkuCreateForm({ ...skuCreateForm, periodUnit: event.target.value as SkuCreateFormState['periodUnit'] })}><option value="month">月</option><option value="quarter">季</option><option value="year">年</option></select></label><label className="field"><span>周期数量</span><input type="number" min="1" value={skuCreateForm.periodCount} onChange={(event) => setSkuCreateForm({ ...skuCreateForm, periodCount: event.target.value })} /></label><label className="field"><span>销售价格</span><input type="number" min="0" step="0.01" required value={skuCreateForm.price} onChange={(event) => setSkuCreateForm({ ...skuCreateForm, price: event.target.value })} /></label><label className="field"><span>原价</span><input type="number" min="0" step="0.01" value={skuCreateForm.originalPrice} onChange={(event) => setSkuCreateForm({ ...skuCreateForm, originalPrice: event.target.value })} /></label><label className="field"><span>退款天数</span><input type="number" min="0" value={skuCreateForm.refundDays} onChange={(event) => setSkuCreateForm({ ...skuCreateForm, refundDays: event.target.value })} /></label><label className="field"><span>展示顺序</span><input type="number" value={skuCreateForm.displayOrder} onChange={(event) => setSkuCreateForm({ ...skuCreateForm, displayOrder: event.target.value })} /></label><label className="field"><span>SKU 状态</span><select value={skuCreateForm.status} onChange={(event) => setSkuCreateForm({ ...skuCreateForm, status: event.target.value as '1' | '0' })}><option value="1">启用</option><option value="0">停用</option></select></label></div><div className="membership-create-actions"><button className="toolbar-btn" type="button" onClick={() => setSkuCreateOpen(false)}>取消</button><button className="toolbar-btn primary" type="button" onClick={() => void createSku()} disabled={loading}>创建 SKU</button></div></article> : null}</div></section>

          <section className="membership-editor-section"><div className="membership-editor-title"><span>03</span><div><h4>卡片权益</h4><p>卡片只展示已启用且有有效值的权益。</p></div><div className="toolbar-group membership-editor-actions"><button className="toolbar-btn primary" type="button" onClick={openBenefitCreate} disabled={loading}>新增权益</button></div></div><div className="membership-admin-benefit-list">{editingPlan.benefits.map((benefit) => <div className={`membership-benefit-row ${benefit.enabled ? 'is-enabled' : ''}`} key={benefit.code}>
            <button className="membership-benefit-toggle" type="button" aria-label={`${benefit.enabled ? '关闭' : '启用'}${benefit.name}`} onClick={() => patchBenefit(benefit.code, { enabled: !benefit.enabled })}><span>{benefit.enabled ? <Check size={13} /> : null}</span></button>
            <div className="membership-benefit-copy"><strong>{benefit.name}</strong><small>{benefit.code} · {benefit.description || benefit.category}</small></div>
            <label className="field"><span>权益值</span><input value={benefit.value} disabled={!benefit.enabled} onChange={(event) => patchBenefit(benefit.code, { value: event.target.value })} /></label>
            <span className="membership-benefit-unit">{benefit.unit || benefit.valueType}</span>
          </div>)}{benefitCreateOpen ? <div className="membership-create-card"><div className="membership-editor-title membership-create-head"><div><h4>新增权益</h4><p>输入已有权益编码，绑定到当前套餐并写入默认值。</p></div><StatusBadge tone="green">新建</StatusBadge></div><div className="membership-create-benefit-grid"><label className="field"><span>权益编码</span><input value={benefitCreateForm.code} onChange={(event) => setBenefitCreateForm({ ...benefitCreateForm, code: event.target.value })} placeholder="例如 ai_generate_count" /></label><label className="field"><span>权益值</span><input value={benefitCreateForm.value} onChange={(event) => setBenefitCreateForm({ ...benefitCreateForm, value: event.target.value })} placeholder="例如 100" /></label><label className="field membership-checkbox-field"><span>立即启用</span><input type="checkbox" checked={benefitCreateForm.enabled} onChange={(event) => setBenefitCreateForm({ ...benefitCreateForm, enabled: event.target.checked })} /></label></div><div className="membership-create-actions"><button className="toolbar-btn" type="button" onClick={() => setBenefitCreateOpen(false)}>取消</button><button className="toolbar-btn primary" type="button" onClick={() => void createBenefit()} disabled={loading}>添加权益</button></div></div> : null}</div></section>
          </div>
        </div> : null}
      </Modal>

      <Modal
        open={Boolean(previewPlan)}
        title={previewPlan && activePreviewSku ? `SKU 预览 · ${previewPlan.name} / ${activePreviewSku.name}` : 'SKU 预览'}
        description="只预览当前 SKU，卡片内容与前台展示规则保持一致。"
        size="sm"
        onClose={() => { setPreviewPlan(null); setPreviewSkuId(null); }}
        footer={<button className="modal-btn primary" type="button" onClick={() => { setPreviewPlan(null); setPreviewSkuId(null); }}>完成预览</button>}
      >
        {previewPlan && activePreviewSku ? <div className="membership-catalog-preview is-single">
          <div className="membership-preview-context">
            <div><strong>用户端卡片效果</strong><span>当前 SKU 在前台展示的效果。</span></div>
            <span><b>{activePreviewSku.name}</b> · {activePreviewSku.code}</span>
          </div>
          <div className="membership-single-card-wrap"><MembershipCardView plan={previewPlan} sku={activePreviewSku} mode={previewMode} /></div>
        </div> : null}
      </Modal>
    </div>
  );
};

export default BillingPage;
