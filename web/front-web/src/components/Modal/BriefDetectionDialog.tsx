import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircleOutlined,
  CloseOutlined,
  CodeOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { message } from 'antd';
import { briefApi } from '../../api/brief';
import OperationCostLabel from '../Membership/OperationCostLabel';
import type { Brief, BriefDetectionReport } from '../../types/brief';
import type { PointOperationCosts } from '../../types/membership';
import { getApiErrorMessage } from '../../utils/apiError';
import { createOperationRequestNo, isAmbiguousOperationError, notifyPointBalanceChanged, requestOperationCostRefresh } from '../../utils/operationRequest';
import './modal-dialogs.css';
import './brief-detection-dialog.css';

interface BriefDetectionDialogProps {
  brief: Brief;
  requestNo: string;
  operationCosts: PointOperationCosts;
  onClose: () => void;
  onApplyOptimized?: (brief: Partial<Brief>) => Promise<void> | void;
}

type ReconstructedValue = string | number | boolean | null | undefined | ReconstructedValue[] | { [key: string]: ReconstructedValue };

const reconstructedFieldLabels: Record<string, string> = {
  productName: '产品名称',
  name: '产品名称',
  briefName: '产品名称',
  productModel: '产品型号',
  price: '产品价格',
  slogan: '产品 Slogan',
  targetAudience: '目标人群',
  audience: '目标人群',
  userProfile: '用户画像',
  painPoints: '用户痛点',
  targetScene: '使用场景',
  scene: '使用场景',
  emotionalValue: '情感价值',
  primarySellingPoint: '产品主要卖点',
  mainSellingPoint: '产品主要卖点',
  coreSellingPoint: '产品主要卖点',
  mainPoints: '主要卖点',
  secondarySellingPoint: '产品次要卖点',
  secondaryPoints: '次要卖点',
  otherRequirements: '其他要求',
  dataSupport: '数据支撑',
  complianceNotes: '合规说明',
  callToAction: '行动号召',
  briefContent: '完整 Brief',
  productFeatures: '产品特色卖点',
  featureSellingPoint: '产品特色卖点',
  coreSellingPoints: '产品主要卖点',
  secondarySellingPoints: '产品次要卖点',
  usageScenarios: '使用场景',
  dataEvidence: '数据支撑',
  emotionalTag: '情绪标签',
  complianceNote: '合规提示',
  title: '标题',
  desc: '描述',
};

const normalizeReconstructedKey = (key: string) => key.trim()
  .replace(/^["']|["']$/g, '')
  .replace(/\s+/g, ' ')
  .replace(/[-_\s]+([a-zA-Z0-9])/g, (_, char: string) => char.toUpperCase())
  .replace(/^([A-Z])/, (char) => char.toLowerCase());

const fallbackFieldLabel = (key: string) => key
  .replace(/([A-Z])/g, ' $1')
  .replace(/^./, (char) => char.toUpperCase());

const stringifyReconstructedValue = (value: ReconstructedValue): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(stringifyReconstructedValue).filter(Boolean).join('\n');
  if (typeof value === 'object') {
    return Object.entries(value).map(([key, item]) => {
      const normalizedKey = normalizeReconstructedKey(key);
      return `${reconstructedFieldLabels[normalizedKey] || reconstructedFieldLabels[key] || fallbackFieldLabel(key)}：${stringifyReconstructedValue(item)}`;
    }).join('\n');
  }
  return String(value);
};

const parseReconstructedExample = (example: string): Record<string, ReconstructedValue> | null => {
  const trimmed = example.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as ReconstructedValue;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { briefContent: parsed };
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
    if (!fenced) return null;
    try {
      const parsed = JSON.parse(fenced) as ReconstructedValue;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : { briefContent: parsed };
    } catch {
      return null;
    }
  }
};

const firstText = (source: Record<string, ReconstructedValue>, keys: string[]) => {
  const normalizedSource = Object.entries(source).reduce<Record<string, ReconstructedValue>>((acc, [key, value]) => {
    acc[key] = value;
    acc[normalizeReconstructedKey(key)] = value;
    return acc;
  }, {});
  for (const key of keys) {
    const value = normalizedSource[key];
    const text = stringifyReconstructedValue(value).trim();
    if (text) return text;
  }
  return '';
};

const toBriefPatch = (source: Record<string, ReconstructedValue>, fallback: string): Partial<Brief> => {
  const productName = firstText(source, ['productName', 'name', 'briefName']);
  const price = firstText(source, ['price']);
  const slogan = firstText(source, ['slogan']);
  const targetAudience = firstText(source, ['targetAudience', 'audience', 'userProfile']);
  const targetScene = firstText(source, ['productFeatures', 'featureSellingPoint', 'targetScene', 'scene', 'useScene', 'usageScenarios']);
  const primarySellingPoint = firstText(source, ['coreSellingPoints', 'primarySellingPoint', 'mainSellingPoint', 'coreSellingPoint', 'mainPoints']);
  const otherRequirements = firstText(source, ['secondarySellingPoints', 'otherRequirements', 'secondarySellingPoint', 'secondaryPoints', 'complianceNotes', 'complianceNote', 'callToAction']);

  return {
    ...(productName ? { name: productName, productName } : {}),
    ...(price ? { price } : {}),
    ...(slogan ? { slogan } : {}),
    ...(targetAudience ? { targetAudience } : {}),
    ...(targetScene ? { targetScene } : {}),
    ...(primarySellingPoint ? { primarySellingPoint } : {}),
    ...(otherRequirements ? { otherRequirements } : {}),
    briefContent: firstText(source, ['briefContent']) || fallback,
  };
};

const toneLabels: Record<BriefDetectionReport['metrics'][number]['tone'], string> = {
  success: 'green',
  warning: 'amber',
  danger: 'red',
};

const BriefDetectionDialog = ({ brief, requestNo, operationCosts, onClose, onApplyOptimized }: BriefDetectionDialogProps) => {
  const [report, setReport] = useState<BriefDetectionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rechecking, setRechecking] = useState(false);
  const [applying, setApplying] = useState(false);
  const autoDetectedBriefIdRef = useRef<string | null>(null);
  const recheckRequestNoRef = useRef<string | null>(null);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await briefApi.detect(brief.id, {
        ...brief,
        requestNo,
        expectedPointCost: operationCosts.briefDetect,
      });
      setReport(result);
      notifyPointBalanceChanged();
    } catch (requestError) {
      requestOperationCostRefresh();
      const errorMessage = getApiErrorMessage(requestError, 'Brief 检测失败，请稍后重试');
      setReport(null);
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [brief, operationCosts.briefDetect, requestNo]);

  useEffect(() => {
    if (autoDetectedBriefIdRef.current === brief.id) return;
    autoDetectedBriefIdRef.current = brief.id;
    loadReport();
  }, [brief.id, loadReport]);

  const scorePercent = useMemo(() => {
    if (!report) return 0;
    return Math.max(0, Math.min(100, Math.round((report.totalScore / report.maxScore) * 100)));
  }, [report]);

  const handleRecheck = async () => {
    setRechecking(true);
    try {
      const nextRequestNo = recheckRequestNoRef.current || createOperationRequestNo('brief_detect');
      recheckRequestNoRef.current = nextRequestNo;
      const result = await briefApi.detect(brief.id, {
        ...brief,
        requestNo: nextRequestNo,
        expectedPointCost: operationCosts.briefDetect,
      });
      recheckRequestNoRef.current = null;
      setReport(result);
      notifyPointBalanceChanged();
      message.success('已重新检测');
    } catch (requestError) {
      if (!isAmbiguousOperationError(requestError)) recheckRequestNoRef.current = null;
      requestOperationCostRefresh();
      message.error(getApiErrorMessage(requestError, '重新检测失败'));
    } finally {
      setRechecking(false);
    }
  };

  const handleApply = async () => {
    if (!report) return;
    setApplying(true);
    try {
      const parsed = parseReconstructedExample(report.reconstructedExample);
      const patch = parsed ? toBriefPatch(parsed, report.reconstructedExample) : { briefContent: report.reconstructedExample };
      await onApplyOptimized?.(patch);
      message.success('已采纳优化并应用');
    } catch (requestError) {
      message.error(getApiErrorMessage(requestError, '采纳优化失败'));
    } finally {
      setApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="modal-backdrop brief-detection-backdrop" role="dialog" aria-modal="true" aria-labelledby="brief-detection-title">
        <section className="modal-card brief-detection-modal">
          <header className="modal-head brief-detection-head">
            <div>
              <span>产品检测报告</span>
              <h2 id="brief-detection-title">{brief.productName || brief.name}</h2>
            </div>
            <button type="button" aria-label="关闭" className="modal-close-button" onClick={onClose}>
              <CloseOutlined />
            </button>
          </header>
          <div className="brief-detection-loading">
            <div className="brief-detection-loading-ring" />
            <strong>正在生成检测报告…</strong>
            <span>系统正在整理结构、痛点、数据和合规性结果</span>
          </div>
        </section>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-backdrop brief-detection-backdrop" role="dialog" aria-modal="true" aria-labelledby="brief-detection-title">
        <section className="modal-card brief-detection-modal">
          <header className="modal-head brief-detection-head">
            <div>
              <span>产品检测报告</span>
              <h2 id="brief-detection-title">{brief.productName || brief.name}</h2>
            </div>
            <button type="button" aria-label="关闭" className="modal-close-button" onClick={onClose}>
              <CloseOutlined />
            </button>
          </header>
          <div className="brief-detection-loading brief-detection-error">
            <ExclamationCircleOutlined />
            <strong>{error}</strong>
            <button type="button" className="primary-action" onClick={loadReport}>重新加载</button>
          </div>
        </section>
      </div>
    );
  }

  const activeReport = report as BriefDetectionReport;
  const compactRisks = activeReport.seriousRisks.slice(0, 2);
  const compactSuggestions = activeReport.suggestions.slice(0, 2);
  const reconstructedFields = parseReconstructedExample(activeReport.reconstructedExample);

  return (
    <div className="modal-backdrop brief-detection-backdrop" role="dialog" aria-modal="true" aria-labelledby="brief-detection-title">
      <section className="modal-card brief-detection-modal">
        <header className="modal-head brief-detection-head">
          <div>
            <span>产品检测报告</span>
            <h2 id="brief-detection-title">{brief.productName || brief.name}</h2>
          </div>
          <button type="button" aria-label="关闭" className="modal-close-button" onClick={onClose}>
            <CloseOutlined />
          </button>
        </header>

        <div className="brief-detection-body">
          <section className="detection-score-card">
            <div className="score-ring" style={{ background: `conic-gradient(#59e57f 0deg ${Math.round((scorePercent / 100) * 360)}deg, rgba(255,255,255,0.08) ${Math.round((scorePercent / 100) * 360)}deg 360deg)` }}>
              <div className="score-ring-inner">
                <strong>{activeReport.totalScore}</strong>
                <span>总分</span>
              </div>
            </div>
            <div className="score-summary">
              <div className="score-summary-top">
                <strong>{activeReport.grade}</strong>
                <span>{activeReport.evaluatedAt}</span>
              </div>
              <p>{activeReport.summary}</p>
              <div className="score-summary-tags">
                <span><CheckCircleOutlined />{activeReport.briefName}</span>
                <span><ThunderboltOutlined />基于 6 个核心维度</span>
              </div>
            </div>
          </section>

          <section className="metric-grid">
            {activeReport.metrics.map((metric) => {
              const fill = Math.round((metric.score / metric.maxScore) * 100);
              return (
                <article key={metric.key} className={`metric-card tone-${toneLabels[metric.tone]}`}>
                  <div className="metric-card-head">
                    <strong>{metric.label}</strong>
                    <span>{metric.score}/{metric.maxScore}</span>
                  </div>
                  <div className="metric-progress"><i style={{ width: `${fill}%` }} /></div>
                  <small>{fill}% 完成度</small>
                </article>
              );
            })}
          </section>

          <div className="brief-report-insights">
            <section className="warning-block">
              <div className="warning-block-head">
                <ExclamationCircleOutlined />
                <strong>严重风险</strong>
              </div>
              <ul>
                {compactRisks.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </section>

            <section className="suggestion-block">
              <div className="section-title">
                <BulbOutlined />
                <strong>优化建议</strong>
              </div>
              <div className="suggestion-list">
                {compactSuggestions.map((suggestion, index) => (
                  <article key={suggestion.title} className="suggestion-item">
                    <span>{index + 1}</span>
                    <div>
                      <strong>{suggestion.title}</strong>
                      <p>{suggestion.detail}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="example-block">
              <div className="section-title">
                <CodeOutlined />
                <strong>重构示例</strong>
              </div>
              <div className="reconstructed-example-scroll">
                {reconstructedFields ? Object.entries(reconstructedFields).map(([key, value]) => {
                  const normalizedKey = normalizeReconstructedKey(key);
                  return (
                  <div className="reconstructed-example-row" key={key}>
                    <span>{reconstructedFieldLabels[normalizedKey] || reconstructedFieldLabels[key] || fallbackFieldLabel(key)}</span>
                    <p>{stringifyReconstructedValue(value)}</p>
                  </div>
                );
                }) : <pre>{activeReport.reconstructedExample}</pre>}
              </div>
            </section>
          </div>
        </div>

        <footer className="brief-detection-actions">
          <button type="button" className="secondary-action" onClick={handleRecheck} disabled={loading || rechecking || applying}>
            <ReloadOutlined />{rechecking ? '检测中...' : '重新检测'}
            <OperationCostLabel cost={operationCosts.briefDetect} />
          </button>
          <button type="button" className="primary-action" onClick={handleApply} disabled={loading || rechecking || applying}>
            {applying ? '应用中...' : '采纳优化并应用'}
          </button>
        </footer>
      </section>
    </div>
  );
};

export default BriefDetectionDialog;
