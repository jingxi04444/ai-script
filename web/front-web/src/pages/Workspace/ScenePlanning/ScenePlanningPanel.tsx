import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { message } from 'antd';
import {
  ArrowRightOutlined, CheckOutlined, DownloadOutlined, FileImageOutlined,
  PlusOutlined, ReloadOutlined, ThunderboltOutlined, DeleteOutlined,
} from '@ant-design/icons';
import { briefApi } from '../../../api/brief';
import { scriptApi } from '../../../api/script';
import { sceneNoticeApi } from '../../../api/sceneNotice';
import { config } from '../../../config';
import { buildScenePlan, minimumSceneCount, modelsFromProject, sceneSettingAt } from './scenePlanning';
import type { ModelDemand, ScenePlan, SceneSetting } from './scenePlanning';
import SceneNoticeTable from './SceneNoticeTable';
import './scene-planning-panel.css';

interface ScenePlanningPanelProps {
  projectId: string | null;
  projectTitle: string;
  onOpenCanvas: () => void;
}

interface ScenePlanningDraft {
  perSceneCap: number;
  sceneCount: number;
  models: ModelDemand[];
  scenes: SceneSetting[];
  shootDate: string;
  coordinator: string;
  photographer: string;
  actor: string;
  generated: boolean;
  aiImageCounts: Record<string, number>;
  rowNotes: Record<string, string>;
}

const defaultDraft = (): ScenePlanningDraft => ({
  perSceneCap: 10,
  sceneCount: 3,
  models: [],
  scenes: [sceneSettingAt(0), sceneSettingAt(1), sceneSettingAt(2)],
  shootDate: '', coordinator: '', photographer: '', actor: '', generated: false, aiImageCounts: {}, rowNotes: {},
});

const readDraft = (projectId: string | null): ScenePlanningDraft => {
  try {
    const saved = localStorage.getItem(`ai-script:scene-plan:v1:${projectId || 'draft'}`);
    if (!saved) return defaultDraft();
    const parsed = JSON.parse(saved) as Partial<ScenePlanningDraft>;
    if (!Array.isArray(parsed.models) || !Array.isArray(parsed.scenes)) return defaultDraft();
    return { ...defaultDraft(), ...parsed,
      models: parsed.models.filter(model => model && typeof model.id === 'string' && !model.id.startsWith('example-') && (String(model.name || '').trim() || Number(model.targetCount) > 0)).map(model => ({ ...model,
        name: String(model.name || ''), targetCount: Number(model.targetCount) || 0,
      })),
      aiImageCounts: parsed.aiImageCounts && typeof parsed.aiImageCounts === 'object' ? parsed.aiImageCounts : {},
      rowNotes: parsed.rowNotes && typeof parsed.rowNotes === 'object' ? parsed.rowNotes : {},
      scenes: parsed.scenes.map(scene => ({ ...scene,
      imageUrl: scene.imageUrl?.startsWith('/scene-planning/') ? scene.imageUrl.replace(/\.png$/, '.jpg') : scene.imageUrl,
      })) };
  } catch { return defaultDraft(); }
};

const csvCell = (value: string | number) => {
  const safe = String(value).replace(/^[\s]*[=+@-]/, "'$&");
  return `"${safe.replace(/"/g, '""')}"`;
};

const isProjectProduct = (model: ModelDemand) => !!model.briefId || model.id === 'unlinked-scripts';

const ScenePlanningPanel = ({ projectId, projectTitle, onOpenCanvas }: ScenePlanningPanelProps) => {
  const [draft, setDraft] = useState<ScenePlanningDraft>(() => readDraft(projectId));
  const [importing, setImporting] = useState(false);
  const [productSyncError, setProductSyncError] = useState('');
  const [serverPlan, setServerPlan] = useState<ScenePlan | null>(null);
  const [saving, setSaving] = useState(false);
  const boardRef = useRef<HTMLElement>(null);
  const editEpochRef = useRef(0);
  const localPlan = useMemo(() => buildScenePlan(draft), [draft]);
  const plan = serverPlan || localPlan;
  const suggestedScenes = minimumSceneCount(draft.models, draft.perSceneCap);
  const briefCount = draft.models.filter(model => !!model.briefId).length;

  useEffect(() => {
    try { localStorage.setItem(`ai-script:scene-plan:v1:${projectId || 'draft'}`, JSON.stringify(draft)); }
    catch { /* Private browsing and full storage should not break the planner. */ }
  }, [draft, projectId]);

  const updateDraft = (patch: Partial<ScenePlanningDraft>) => {
    editEpochRef.current += 1;
    setServerPlan(null);
    setDraft(current => ({ ...current, ...patch, generated: false }));
  };
  const updateModel = (id: string, patch: Partial<ModelDemand>) => updateDraft({
    models: draft.models.map(item => item.id === id ? { ...item, ...patch } : item),
  });
  const updateScene = (index: number, patch: Partial<SceneSetting>) => updateDraft({
    scenes: Array.from({ length: Math.max(draft.sceneCount, index + 1) }, (_, position) =>
      position === index ? { ...(draft.scenes[position] || sceneSettingAt(position)), ...patch }
        : draft.scenes[position] || sceneSettingAt(position)),
  });
  const updateAiImageCount = (assetKey: string, count: number) => updateDraft({
    aiImageCounts: { ...draft.aiImageCounts, [assetKey]: count },
  });
  const updateRowNote = (assetKey: string, note: string) => updateDraft({
    rowNotes: { ...draft.rowNotes, [assetKey]: note },
  });
  const refreshProducts = useCallback(async (notify = false) => {
    if (!projectId) return;
    setImporting(true);
    try {
      const [briefResult, scriptResult] = await Promise.allSettled([briefApi.getList(projectId), scriptApi.getList(projectId)]);
      if (briefResult.status === 'rejected') throw briefResult.reason;
      const briefs = briefResult.value;
      const scripts = scriptResult.status === 'fulfilled' ? scriptResult.value : [];
      const products = modelsFromProject(briefs, scripts);
      if (notify) setServerPlan(null);
      setDraft(current => {
        const manual = current.models.filter(model => (model.id.startsWith('manual-') || model.id.startsWith('model-')) && (model.name.trim() || model.targetCount > 0));
        const models = [...products, ...manual];
        return { ...current, models, sceneCount: Math.min(20, Math.max(current.sceneCount, minimumSceneCount(models, current.perSceneCap) || 1)), generated: notify ? false : current.generated };
      });
      setProductSyncError(scriptResult.status === 'rejected' ? '产品 Brief 已同步，脚本数量暂不可用' : '');
      if (notify) message.success(`已同步 ${briefs.length} 份产品 Brief、${scripts.length} 条脚本`);
    } catch {
      setProductSyncError('Brief 或脚本加载失败，正在显示本机草稿');
      if (notify) message.error('Brief 或脚本加载失败，请稍后重试');
    }
    finally { setImporting(false); }
  }, [projectId]);

  useEffect(() => { void refreshProducts(); }, [refreshProducts]);

  useEffect(() => {
    if (!projectId || config.useMock) return;
    let canceled = false;
    const loadedAtEpoch = editEpochRef.current;
    void sceneNoticeApi.get(projectId).then(record => {
      if (canceled || loadedAtEpoch !== editEpochRef.current || !record?.draft || !record.plan) return;
      setDraft(current => ({ ...current, ...record.draft,
        models: [
          ...current.models.filter(model => isProjectProduct(model)),
          ...(record.draft.manualModels || []).map(model => ({ ...model, productName: model.name })),
        ],
        generated: true,
      }));
      setServerPlan(record.plan);
    }).catch(() => { /* An unavailable backend must not discard a local draft. */ });
    return () => { canceled = true; };
  }, [projectId]);

  const confirmNotice = async () => {
    if (!projectId || localPlan.error || saving) {
      if (!projectId) message.warning('请先保存项目，再确认场景通告表');
      return;
    }
    if (config.useMock) {
      setServerPlan(localPlan);
      setDraft(current => ({ ...current, generated: true }));
      message.info('演示模式：通告表仅保存在当前浏览器，未写入后端');
      return;
    }
    setSaving(true);
    const savedAtEpoch = editEpochRef.current;
    try {
      const record = await sceneNoticeApi.save(projectId, {
        perSceneCap: draft.perSceneCap, sceneCount: draft.sceneCount, scenes: draft.scenes,
        manualModels: draft.models.filter(model => !isProjectProduct(model)).map(model => ({ id: model.id, name: model.name, targetCount: model.targetCount })),
        aiImageCounts: draft.aiImageCounts, rowNotes: draft.rowNotes,
        shootDate: draft.shootDate, coordinator: draft.coordinator,
        photographer: draft.photographer, actor: draft.actor,
      });
      if (savedAtEpoch === editEpochRef.current) {
        setServerPlan(record.plan);
        setDraft(current => ({ ...current, generated: true }));
        message.success(`通告图已保存到项目（版本 ${record.version}）`);
      } else {
        message.info(`版本 ${record.version} 已保存；保存期间又有修改，请重新确认`);
      }
      boardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      message.error(error instanceof Error ? error.message : '保存通告图失败，请检查后端服务');
    } finally { setSaving(false); }
  };

  const exportCsv = () => {
    if (plan.error) return;
    const rows = [
      ['项目', projectTitle],
      ['拍摄日期', draft.shootDate || '未安排'],
      ['项目对接', draft.coordinator || '未填写'],
      ['摄影', draft.photographer || '未填写'],
      ['演员', draft.actor || '未填写'],
      ['片场号/场景', '场景规划贴图', '产品 Brief', '产品型号', '脚本分配条数', 'AI 生图张数（待生成）', '空镜复用编号', '产品参考编号', '备注'],
      ...plan.scenes.flatMap(scene => scene.assignments.map(assignment => [
        `${scene.number}号 · ${scene.name}`, scene.imageUrl, assignment.productName, assignment.modelName, assignment.count, assignment.aiImageCount,
        scene.blankAssetKey, assignment.productAssetKey, assignment.note,
      ])),
    ];
    const csv = `\ufeff${rows.map(row => row.map(csvCell).join(',')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${projectTitle || '项目'}-场景通告图.csv`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  return <div className="scene-planner">
    <header className="scene-planner-hero">
      <div className="scene-planner-hero-copy">
        <span className="scene-planner-eyebrow"><span>04</span> PRE-PRODUCTION / 场景规划</span>
        <h1>一张通告图，规划整批脚本。</h1>
        <p>直接读取本项目产品 Brief。每个场景与每个产品独占一行，脚本数量和计划 AI 生图张数分别计算。</p>
      </div>
      <button className="scene-planner-canvas-link" type="button" onClick={onOpenCanvas}>进入制作画布 <ArrowRightOutlined /></button>
    </header>

    <div className="scene-planner-metrics" aria-label="场景规划概览">
      <div><small>项目产品 Brief</small><strong>{briefCount}<em>份</em></strong><span>{importing ? '正在同步项目数据' : productSyncError || '进入页面后自动同步'}</span></div>
      <div><small>关联脚本</small><strong>{draft.models.reduce((sum, item) => sum + (Number(item.sourceCount) || 0), 0)}<em>条</em></strong><span>按产品 Brief 归属统计</span></div>
      <div><small>场景 × 产品</small><strong>{plan.error ? '—' : plan.scenes.reduce((sum, scene) => sum + scene.assignments.length, 0)}<em>行</em></strong><span>{draft.sceneCount} 个场景逐一搭配产品</span></div>
      <div className="scene-planner-metric-accent"><small>计划 AI 生图</small><strong>{plan.error ? '—' : plan.totalAiImages}<em>张</em></strong><span>待生成，不会自动调用模型</span></div>
    </div>

    <div className="scene-planner-layout">
      <aside className="scene-planner-config" aria-label="规划条件">
        <div className="scene-planner-config-main">
        <div className="scene-planner-section-head"><span>01 / 规划条件</span><h2>场景与产品</h2><p>产品来自本项目 Brief；关联脚本数自动统计。</p></div>
        <div className="scene-planner-number-grid">
          <label>单场景·单型号上限<input type="number" min="1" max="100" value={draft.perSceneCap} onChange={event => updateDraft({ perSceneCap: Number(event.target.value) })} /><small>默认：10 条 / 型号</small></label>
          <label>选用场景数<input type="number" min="1" max="20" value={draft.sceneCount} onChange={event => updateDraft({ sceneCount: Number(event.target.value) })} /><small>至少 {suggestedScenes || 1} 场，最多 20 场</small></label>
        </div>
        </div>
        <div className="scene-planner-config-products">
        <div className="scene-planner-list-title"><div><span>02 / 产品 Brief</span><h2>项目产品</h2></div><button type="button" onClick={() => updateDraft({ models: [...draft.models, { id: `manual-${Date.now()}`, name: '', targetCount: 0 }] })}><PlusOutlined /> 临时添加</button></div>
        <div className="scene-planner-model-list">
          {!draft.models.length && <p className="scene-planner-no-products">{importing ? '正在读取本项目产品 Brief…' : '当前项目暂无产品 Brief。完成第 1 步 Brief 后会自动出现在这里。'}</p>}
          {draft.models.map((model, index) => <div className="scene-planner-model-row" key={model.id}>
            <span className="scene-planner-model-letter">{String.fromCharCode(65 + index % 26)}</span>
            {isProjectProduct(model) ? <div className="scene-planner-model-copy"><strong>{model.productName}</strong><small>{model.name} · {model.briefId ? 'Brief' : '未关联 Brief'}</small></div> : <input aria-label={`第 ${index + 1} 个临时产品型号`} placeholder="产品名称 / 型号" value={model.name} onChange={event => updateModel(model.id, { name: event.target.value, productName: event.target.value })} />}
            {isProjectProduct(model) ? <span className="scene-planner-model-count">{model.sourceCount || 0} <small>条脚本</small></span> : <label><input aria-label={`${model.name || `第 ${index + 1} 个型号`}目标脚本条数`} type="number" min="0" max="10000" value={model.targetCount} onChange={event => updateModel(model.id, { targetCount: Number(event.target.value) })} /><small>条</small></label>}
            {!isProjectProduct(model) && <button type="button" aria-label={`删除${model.name || '临时产品'}`} title="删除临时产品" onClick={() => updateDraft({ models: draft.models.filter(item => item.id !== model.id) })}><DeleteOutlined /></button>}
          </div>)}
        </div>
        <div className="scene-planner-import-actions">
          <button type="button" onClick={() => void refreshProducts(true)} disabled={importing || !projectId}><ReloadOutlined spin={importing} /> 刷新本项目 Brief 和脚本</button>
        </div>
        {productSyncError && <p className="scene-planner-error" role="status">{productSyncError}</p>}
        </div>
        <div className="scene-planner-config-side">
        <div className="scene-planner-formula"><ThunderboltOutlined /><span>建议最少 {suggestedScenes || 1} 场。每个产品与每个场景都会生成一行；无脚本时也默认计划 1 张 AI 图，可在表中调整为 0。</span></div>
        <button className="scene-planner-generate" type="button" disabled={!!localPlan.error || saving} onClick={() => void confirmNotice()}><CheckOutlined /> {saving ? '正在保存…' : '确认并保存通告表'}</button>
        {plan.error && <p className="scene-planner-error" role="alert">{plan.error}</p>}
        </div>
      </aside>

      <section className="scene-planner-board" ref={boardRef} aria-label="场景通告图">
        <div className="scene-planner-board-head"><div><span>03 / SHOOTING NOTICE</span><h2>场景 × 产品通告表</h2><p>一行就是一个产品在一个场景里的拍摄组合；产品名称与型号从 Brief 自动带入。</p></div><div className="scene-planner-board-actions"><span className={draft.generated && serverPlan ? 'is-ready' : ''}>{draft.generated && serverPlan ? config.useMock ? '本机演示已确认' : '已保存至项目' : '实时预览 · 未确认'}</span><button type="button" disabled={!!plan.error} onClick={exportCsv}><DownloadOutlined /> 导出 CSV</button></div></div>
        <div className="scene-planner-meta">
          <label>拍摄日期<input type="date" value={draft.shootDate} onChange={event => updateDraft({ shootDate: event.target.value })} /></label>
          <label>项目对接<input placeholder="待填写" value={draft.coordinator} onChange={event => updateDraft({ coordinator: event.target.value })} /></label>
          <label>摄影<input placeholder="待填写" value={draft.photographer} onChange={event => updateDraft({ photographer: event.target.value })} /></label>
          <label>演员<input placeholder="待填写" value={draft.actor} onChange={event => updateDraft({ actor: event.target.value })} /></label>
        </div>
        {plan.error ? <div className="scene-planner-empty"><FileImageOutlined /><h3>产品与场景会在这里形成通告表</h3><p>{plan.error}</p></div> : <>
          <SceneNoticeTable scenes={plan.scenes} onSceneChange={updateScene} onAiImageCountChange={updateAiImageCount} onRowNoteChange={updateRowNote} />
          <div className="scene-planner-summary"><div><strong>数量口径</strong><p>共 {plan.scenes.reduce((sum, scene) => sum + scene.assignments.length, 0)} 个场景 × 产品组合、{plan.totalScripts} 条关联脚本、{plan.totalAiImages} 张计划 AI 输出图。场景参考图在同一场景内复用，不计入待生图张数。确认后通告图保存至项目数据库；计划张数不代表已经调用图片模型。</p></div><span>{plan.totalAiImages} <small>张待 AI 生成</small></span></div>
        </>}
      </section>
    </div>
  </div>;
};

export default ScenePlanningPanel;
