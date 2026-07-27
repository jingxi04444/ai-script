import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { message } from 'antd';
import { briefApi } from '../../../api/brief';
import type { Brief } from '../../../types/brief';
import RichTextField from './RichTextField';
import './selling-points-panel.css';

interface SellingPointValues {
  price: string;
  slogan: string;
  audience: string;
  features: string;
  mainPoints: string;
  secondaryPoints: string;
}

type RichFieldKey = 'audience' | 'features' | 'mainPoints' | 'secondaryPoints';
type SellingPointRichValues = Record<RichFieldKey, string>;

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
const richFieldKeys: RichFieldKey[] = ['audience', 'features', 'mainPoints', 'secondaryPoints'];

const plainTextToRichHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\n/g, '<br>');

const richValuesFromBrief = (current: Brief, plainValues: SellingPointValues): SellingPointRichValues => {
  let stored: Partial<SellingPointRichValues> = {};
  if (current.richContent) {
    try {
      const parsed = JSON.parse(current.richContent) as Partial<SellingPointRichValues>;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stored = parsed;
    } catch {
      stored = {};
    }
  }
  return {
    audience: stored.audience || plainTextToRichHtml(plainValues.audience),
    features: stored.features || plainTextToRichHtml(plainValues.features),
    mainPoints: stored.mainPoints || plainTextToRichHtml(plainValues.mainPoints),
    secondaryPoints: stored.secondaryPoints || plainTextToRichHtml(plainValues.secondaryPoints),
  };
};

const initialRichValues = richValuesFromBrief({ richContent: '' } as Brief, initialValues);

const valuesFromBrief = (current: Brief, previous: SellingPointValues = initialValues): SellingPointValues => {
  let parsedValues: Partial<SellingPointValues> = {};
  const content = current.versions?.[0]?.content || current.briefContent;
  if (content) {
    try {
      const parsed = JSON.parse(content) as Partial<SellingPointValues>;
      parsedValues = parsed;
    } catch {
      parsedValues = /<\/?[a-z][\s\S]*>/i.test(content) ? {} : { features: content };
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
  const [richValues, setRichValues] = useState(initialRichValues);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [preservedBriefContent, setPreservedBriefContent] = useState('');

  useEffect(() => {
    if (!projectId) {
      setBrief(null);
      setValues(initialValues);
      setRichValues(initialRichValues);
      setPreservedBriefContent('');
      return;
    }
    briefApi.getList(projectId).then((list) => {
      const current = list[0];
      if (!current) return;
      setBrief(current);
      setPreservedBriefContent(current.briefContent || '');
      const loadedProductName = (current.productName || current.name || '').trim();
      if (loadedProductName) onProductNameLoaded?.(loadedProductName);
      const loadedValues = valuesFromBrief(current);
      setValues(loadedValues);
      setRichValues(richValuesFromBrief(current, loadedValues));
    }).catch(() => message.warning('Brief 数据加载失败'));
  }, [onProductNameLoaded, projectId]);

  const updateValue = (key: keyof SellingPointValues, value: string) => setValues((prev) => ({ ...prev, [key]: value }));
  const updateRichValue = (key: RichFieldKey, html: string, plainText: string) => {
    setRichValues((previous) => ({ ...previous, [key]: html }));
    updateValue(key, plainText);
  };

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
      briefContent: brief?.briefContent || preservedBriefContent || JSON.stringify(values),
      richContent: JSON.stringify(richValues),
      forceNewVersion: Boolean(brief),
    };
    try {
      const saved = brief ? await briefApi.update(brief.id, payload) : await briefApi.create(payload);
      const completeSaved = { ...payload, ...saved } as Brief;
      setBrief(completeSaved);
      setPreservedBriefContent(completeSaved.briefContent || '');
      setValues((prev) => valuesFromBrief(completeSaved, prev));
      const savedVersionLabel = completeSaved.versions?.[0]?.label || (brief ? '新版本' : 'v1.0');
      message.success(brief ? `卖点数据已保存为 ${savedVersionLabel}` : `卖点数据已保存，已创建 ${savedVersionLabel}`);
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
    const changedRichValues = { ...richValues };
    richFieldKeys.forEach((key) => {
      const patchKey: Record<RichFieldKey, keyof Brief> = {
        audience: 'targetAudience',
        features: 'targetScene',
        mainPoints: 'primarySellingPoint',
        secondaryPoints: 'otherRequirements',
      };
      if (patch[patchKey[key]] !== undefined) changedRichValues[key] = plainTextToRichHtml(nextValues[key]);
    });
    setValues(nextValues);
    setRichValues(changedRichValues);
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
      briefContent: brief?.briefContent || preservedBriefContent || JSON.stringify(nextValues),
      richContent: JSON.stringify(changedRichValues),
    };
    const saved = brief ? await briefApi.update(brief.id, payload) : await briefApi.create(payload);
    const completeSaved = { ...payload, ...saved } as Brief;
    setBrief(completeSaved);
    setPreservedBriefContent(completeSaved.briefContent || '');
  };

  const loadBrief = (nextBrief: Brief) => {
    setBrief(projectId && nextBrief.projectId === projectId ? nextBrief : null);
    setPreservedBriefContent(nextBrief.briefContent || '');
    const loadedProductName = (nextBrief.productName || nextBrief.name || '').trim();
    if (loadedProductName) onProductNameLoaded?.(loadedProductName);
    const loadedValues = valuesFromBrief(nextBrief, initialValues);
    setValues(loadedValues);
    setRichValues(richValuesFromBrief(nextBrief, loadedValues));
  };

  const resetDraft = () => {
    setBrief(null);
    setValues(initialValues);
    setRichValues(initialRichValues);
    setPreservedBriefContent('');
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
        <RichTextField
          className="audience-field"
          label="目标人群"
          value={richValues.audience}
          placeholder="可以按照1，2，3，4分点去写目标人群。写的越准确，创作的越精准"
          maxLength={500}
          onChange={(html, plainText) => updateRichValue('audience', html, plainText)}
        />
      </section>

      <section className="selling-paste-card">
        <div className="selling-grid">
          <RichTextField
            className="selling-textarea"
            label="产品特色卖点"
            value={richValues.features}
            placeholder="请粘贴产品与竞品有区别的点，必提的特色点"
            maxLength={10000}
            onChange={(html, plainText) => updateRichValue('features', html, plainText)}
          />
          <RichTextField
            className="selling-textarea"
            label="产品主要卖点"
            value={richValues.mainPoints}
            placeholder="请粘贴产品的主要卖点，按照1.2.3.4等分点去写"
            maxLength={10000}
            onChange={(html, plainText) => updateRichValue('mainPoints', html, plainText)}
          />
          <RichTextField
            className="selling-textarea"
            label="产品次要卖点"
            value={richValues.secondaryPoints}
            placeholder="请粘贴产品的次要卖点，按照1.2.3.4等分点去写"
            maxLength={10000}
            onChange={(html, plainText) => updateRichValue('secondaryPoints', html, plainText)}
          />
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
