import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { message } from 'antd';
import { briefApi } from '../../../api/brief';
import type { Brief } from '../../../types/brief';
import './selling-points-panel.css';

interface SellingPointValues {
  price: string;
  slogan: string;
  audience: string;
  features: string;
  mainPoints: string;
  secondaryPoints: string;
}

export interface SellingPointsPanelRef {
  save: () => Promise<void>;
  applyBriefPatch: (patch: Partial<Brief>) => Promise<void>;
  loadBrief: (nextBrief: Brief) => void;
  resetDraft: () => void;
}

interface SellingPointsPanelProps {
  projectId: string | null;
  productName?: string;
  ensureProjectId: () => Promise<string>;
  onBriefDetect?: (brief: Brief | null) => void;
  onUpload?: () => void;
  onProductNameLoaded?: (productName: string) => void;
}

const initialValues: SellingPointValues = { price: '', slogan: '', audience: '', features: '', mainPoints: '', secondaryPoints: '' };

const valuesFromBrief = (current: Brief, previous: SellingPointValues = initialValues): SellingPointValues => {
  let parsedValues: Partial<SellingPointValues> = {};
  const content = current.versions?.[0]?.content || current.briefContent;
  if (content) {
    try {
      const parsed = JSON.parse(content) as Partial<SellingPointValues>;
      parsedValues = parsed;
    } catch {
      parsedValues = { features: content };
    }
  }
  return {
    ...previous,
    price: current.price || parsedValues.price || previous.price,
    slogan: current.slogan || parsedValues.slogan || previous.slogan,
    audience: current.targetAudience || parsedValues.audience || previous.audience,
    features: current.targetScene || parsedValues.features || previous.features,
    mainPoints: current.primarySellingPoint || parsedValues.mainPoints || previous.mainPoints,
    secondaryPoints: current.otherRequirements || parsedValues.secondaryPoints || previous.secondaryPoints,
  };
};

const SellingPointsPanel = forwardRef<SellingPointsPanelRef, SellingPointsPanelProps>(({ projectId, productName, ensureProjectId, onBriefDetect, onProductNameLoaded }, ref) => {
  const [values, setValues] = useState(initialValues);
  const [brief, setBrief] = useState<Brief | null>(null);

  useEffect(() => {
    if (!projectId) {
      setBrief(null);
      setValues(initialValues);
      return;
    }
    briefApi.getList(projectId).then((list) => {
      const current = list[0];
      if (!current) return;
      setBrief(current);
      const loadedProductName = (current.productName || current.name || '').trim();
      if (loadedProductName) onProductNameLoaded?.(loadedProductName);
      setValues((prev) => valuesFromBrief(current, prev));
    }).catch(() => message.warning('Brief 数据加载失败'));
  }, [onProductNameLoaded, projectId]);

  const updateValue = (key: keyof SellingPointValues, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    const nextProductName = productName?.trim();
    if (!nextProductName) {
      message.warning('请先填写产品名称');
      return;
    }
    let currentProjectId = '';
    try {
      currentProjectId = await ensureProjectId();
    } catch (error) {
      message.warning(error instanceof Error ? error.message : '请先填写项目名称');
      return;
    }
    const payload: Partial<Brief> = {
      name: nextProductName,
      projectId: currentProjectId,
      productName: nextProductName,
      price: values.price,
      slogan: values.slogan,
      primarySellingPoint: values.mainPoints,
      targetAudience: values.audience,
      targetScene: values.features,
      otherRequirements: values.secondaryPoints,
      briefContent: JSON.stringify(values),
    };
    try {
      const saved = brief ? await briefApi.update(brief.id, payload) : await briefApi.create(payload);
      setBrief(saved);
      setValues((prev) => valuesFromBrief(saved, prev));
      message.success('卖点数据已保存');
    } catch {
      message.error('保存失败，请稍后重试');
    }
  };

  const applyBriefPatch = async (patch: Partial<Brief>) => {
    const nextValues: SellingPointValues = {
      price: patch.price ?? values.price,
      slogan: patch.slogan ?? values.slogan,
      audience: patch.targetAudience ?? values.audience,
      features: patch.targetScene ?? values.features,
      mainPoints: patch.primarySellingPoint ?? values.mainPoints,
      secondaryPoints: patch.otherRequirements ?? values.secondaryPoints,
    };
    setValues(nextValues);
    if (patch.productName?.trim()) onProductNameLoaded?.(patch.productName.trim());

    const currentProjectId = await ensureProjectId();
    const nextProductName = patch.productName?.trim() || productName?.trim() || brief?.productName || brief?.name || values.slogan || '未命名产品';
    const payload: Partial<Brief> = {
      ...patch,
      name: nextProductName,
      productName: nextProductName,
      projectId: currentProjectId,
      price: nextValues.price,
      slogan: nextValues.slogan,
      targetAudience: nextValues.audience,
      targetScene: nextValues.features,
      primarySellingPoint: nextValues.mainPoints,
      otherRequirements: nextValues.secondaryPoints,
      briefContent: JSON.stringify(nextValues),
    };
    const saved = brief ? await briefApi.update(brief.id, payload) : await briefApi.create(payload);
    setBrief(saved);
  };

  const loadBrief = (nextBrief: Brief) => {
    setBrief(nextBrief);
    const loadedProductName = (nextBrief.productName || nextBrief.name || '').trim();
    if (loadedProductName) onProductNameLoaded?.(loadedProductName);
    setValues(valuesFromBrief(nextBrief, initialValues));
  };

  const resetDraft = () => {
    setBrief(null);
    setValues(initialValues);
  };

  useImperativeHandle(ref, () => ({ save, applyBriefPatch, loadBrief, resetDraft }));

  return (
    <div className="brief-page creation-brief-page">
      <section className="brief-info-card">
        <div className="brief-small-fields">
          <label className="field-box">
            <span>产品价格</span>
            <input value={values.price} onChange={(e) => updateValue('price', e.target.value)} placeholder="产品的大致价格" />
          </label>
          <label className="field-box">
            <span>产品slogan</span>
            <input value={values.slogan} onChange={(e) => updateValue('slogan', e.target.value)} placeholder="一句话描述产品的定位" />
          </label>
        </div>
        <label className="audience-field">
          <span>目标人群</span>
          <textarea value={values.audience} onChange={(e) => updateValue('audience', e.target.value)} placeholder="可以按照1，2，3，4分点去写目标人群。写的越准确，创作的越精准" maxLength={500} />
          <em>{values.audience.length}/500</em>
        </label>
      </section>

      <section className="selling-paste-card">
        <div className="selling-grid">
          <label className="selling-textarea">
            <span>产品特色卖点</span>
            <textarea value={values.features} onChange={(e) => updateValue('features', e.target.value)} placeholder="请粘贴产品与竞品有区别的点，必提的特色点" maxLength={10000} />
            <em>{values.features.length}/10000</em>
          </label>
          <label className="selling-textarea">
            <span>产品主要卖点</span>
            <textarea value={values.mainPoints} onChange={(e) => updateValue('mainPoints', e.target.value)} placeholder="请粘贴产品的主要卖点，按照1.2.3.4等分点去写" maxLength={10000} />
            <em>{values.mainPoints.length}/10000</em>
          </label>
          <label className="selling-textarea">
            <span>产品次要卖点</span>
            <textarea value={values.secondaryPoints} onChange={(e) => updateValue('secondaryPoints', e.target.value)} placeholder="请粘贴产品的次要卖点，按照1.2.3.4等分点去写" maxLength={10000} />
            <em>{values.secondaryPoints.length}/10000</em>
          </label>
        </div>
        <button
          type="button"
          className="brief-check-button"
          onClick={() => {
            if (!brief) {
              message.warning('请先保存 Brief 再进行检测');
              return;
            }
            onBriefDetect?.(brief);
          }}
        >
          <span>▣</span>Brief 检测
        </button>
      </section>
    </div>
  );
});

export default SellingPointsPanel;
