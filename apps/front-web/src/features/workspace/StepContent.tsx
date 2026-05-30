import { forwardRef, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from 'react';
import { navigate } from '../../app/router';
import { assetApi } from '../../services/assetApi';
import { generationApi } from '../../services/generationApi';
import { scriptApi } from '../../services/scriptApi';
import { sellingPointApi } from '../../services/sellingPointApi';
import { templateApi } from '../../services/templateApi';
import { workflowApi } from '../../services/workflowApi';
import type { Asset } from '../../types/asset';
import type { BriefScoreResult, BriefVersion, CompareBriefResult } from '../../types/sellingPoint';
import type { GenerationTask } from '../../types/generation';
import type { ProductBriefInput, ProjectBriefStore, SellingAsset, SellingAssetDetail } from '../../types/sellingPoint';
import type { GeneratedScriptResult, ScriptCopyAnalysisResult, ScriptFormatOption, ScriptLibraryCategory, ScriptLibraryItem, ScriptLibraryResult, ScriptStructureResult, ScriptTemplateCategory, ScriptTemplateDetail, ScriptTemplateSummary, StoryboardRow } from '../../types/script';
import type { ImportTemplateConfig, Toast, UploadModalState } from '../../types/ui';

const visualCategories = ['全部', '场景', '角色', '道具'] as const;
type VisualCategory = (typeof visualCategories)[number];
const videoScopes = ['按全部分镜生成', '仅生成选中镜头', '失败镜头重试'] as const;
const videoShots = ['镜号01 3s', '镜号02 4s', '镜号03 3s', '镜号04 4s'] as const;

const videoTagOptions = ['可用', '产品特写好', '情绪到位', '需重制'] as const;
const dubbingModes = ['TTS 旁白模式', '对口型模式'] as const;
type DubbingMode = (typeof dubbingModes)[number];
const voiceOptions = ['甜美女声', '专业男声', '活力女声', '磁性男声'] as const;
const speechSpeedOptions = ['慢速', '标准', '快速'] as const;
const speechToneOptions = ['自然', '温柔', '活力'] as const;
const volumeOptions = ['60%', '80%', '100%'] as const;
const digitalHumanOptions = ['品牌数字人 A', '职场女性模特', '真实员工口播'] as const;
const lipPrecisionOptions = ['标准', '高精度（推荐）', '快速预览'] as const;
const transitionOptions = ['淡入淡出', '滑动', '硬切', '推近'] as const;
const musicOptions = ['无背景音乐', '轻快版权音乐', '温暖生活感', '自定义上传'] as const;
const assetFilterOptions = ['全部', '可用', '镜号01', '已收藏'] as const;
const resolutionOptions = ['1080P', '720P', '480P'] as const;
const monitorTypeOptions = ['优惠码监测', '购物车参数', '短链监测'] as const;
const dataSourceOptions = ['平台汇总', '抖音回传', '视频号回传'] as const;
const abVariantOptions = ['A版 强痛点', 'B版 测评种草', 'C版 情绪共鸣'] as const;
const reportScopeOptions = ['单视频', '多视频趋势', 'A/B 对比'] as const;
const storyboardScriptCategories: Array<{ id: ScriptLibraryCategory; label: string }> = [
  { id: 'mine', label: '我的脚本' },
  { id: 'product', label: '以产品维度的脚本' },
  { id: 'viral', label: '爆款复刻脚本' },
  { id: 'template', label: '平台模板库脚本' },
  { id: 'original', label: 'AI 原创脚本' },
];

export const StepContent = forwardRef<{ openBriefDrawer: () => void; newBrief: () => void; newScript: () => void }, { step: string; projectId: string; onNext: () => void; showToast: (message: string, tone?: Toast['tone']) => void }>(function StepContent({ step, projectId, onNext, showToast }, ref) {
  const [briefStore, setBriefStore] = useState<ProjectBriefStore | null>(null);
  const [isBriefDrawerOpen, setIsBriefDrawerOpen] = useState(false);
  const [briefDrawerLoading, setBriefDrawerLoading] = useState(false);
  const [creatingBrief, setCreatingBrief] = useState(false);
  const [newBriefName, setNewBriefName] = useState('');
  const [briefSearchKeyword, setBriefSearchKeyword] = useState('');
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [pendingBriefId, setPendingBriefId] = useState('');
  const [pendingVersionId, setPendingVersionId] = useState('');

  const [videoRatio, setVideoRatio] = useState('9:16');
  const [videoType, setVideoType] = useState('剧情口播');
  const [platform, setPlatform] = useState('抖音');
  const [productName, setProductName] = useState('');
  const [brief, setBrief] = useState('');
  const [sellingPoints, setSellingPoints] = useState<string[]>([]);
  const [primarySellingPoint, setPrimarySellingPoint] = useState('');
  const [auxiliarySellingPoints, setAuxiliarySellingPoints] = useState<string[]>([]);
  const [newSellingPoint, setNewSellingPoint] = useState('');
  const [targetGroups, setTargetGroups] = useState<string[]>([]);
  const [customTargetGroup, setCustomTargetGroup] = useState('');
  const [otherRequirements, setOtherRequirements] = useState('');
  const [scriptName, setScriptName] = useState('宠鲜鲜加热饭盒_职场加班版_v3');

  const [scriptTab, setScriptTab] = useState<'viral' | 'template' | 'original' | 'mine'>('viral');
  const [scriptFormats, setScriptFormats] = useState<ScriptFormatOption[]>([]);
  const [scriptFormatId, setScriptFormatId] = useState('storyboard-table');
  const [scriptDuration, setScriptDuration] = useState('30');
  const [scriptBriefText, setScriptBriefText] = useState('');
  const [scriptBriefOptions, setScriptBriefOptions] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [scriptBriefLoading, setScriptBriefLoading] = useState(false);
  const [selectedScriptBriefId, setSelectedScriptBriefId] = useState('');
  const [scriptProductVisual, setScriptProductVisual] = useState('');
  const [viralUrl, setViralUrl] = useState('');
  const [viralTranscript, setViralTranscript] = useState('');
  const [viralSourceTitle, setViralSourceTitle] = useState('');
  const [copyAnalysis, setCopyAnalysis] = useState<ScriptCopyAnalysisResult | null>(null);
  const [structureResult, setStructureResult] = useState<ScriptStructureResult | null>(null);
  const [templateCategories, setTemplateCategories] = useState<ScriptTemplateCategory[]>([]);
  const [selectedTemplateCategoryId, setSelectedTemplateCategoryId] = useState('');
  const [templateList, setTemplateList] = useState<ScriptTemplateSummary[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ScriptTemplateDetail | null>(null);
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [generatedScript, setGeneratedScript] = useState<GeneratedScriptResult | null>(null);
  const [scriptBusyAction, setScriptBusyAction] = useState('');

  // 产品卖点表单状态
  const [productVersion, setProductVersion] = useState('v1.0');
  const [productPrice, setProductPrice] = useState('');
  const [productSlogan, setProductSlogan] = useState('');
  const [specialSellingPoint, setSpecialSellingPoint] = useState('');
  const [mainSellingPoint, setMainSellingPoint] = useState('');
  const [auxiliarySellingPoint, setAuxiliarySellingPoint] = useState('');
  const [suitableCrowd, setSuitableCrowd] = useState('');
  const [suitableScene, setSuitableScene] = useState('');
  const [briefScore, setBriefScore] = useState(0);
  const [savingBrief, setSavingBrief] = useState(false);
  const [scoringBrief, setScoringBrief] = useState(false);
  const [briefDetected, setBriefDetected] = useState(false);
  const [briefScoreResult, setBriefScoreResult] = useState<BriefScoreResult | null>(null);
  const [compareModal, setCompareModal] = useState<{ comparing: boolean; loading: boolean; briefName: string; versions: BriefVersion[]; firstVersionId: string; secondVersionId: string; result: CompareBriefResult | null }>({ comparing: false, loading: false, briefName: '', versions: [], firstVersionId: '', secondVersionId: '', result: null });
  const [assets, setAssets] = useState<SellingAsset[]>([]);
  const [storyboard, setStoryboard] = useState<StoryboardRow[]>([]);
  const [scriptLibraryCategory, setScriptLibraryCategory] = useState<ScriptLibraryCategory>('mine');
  const [scriptLibraryView, setScriptLibraryView] = useState<'list' | 'card'>('list');
  const [scriptLibrary, setScriptLibrary] = useState<ScriptLibraryResult>({ category: 'mine', total: 0, scripts: [] });
  const [scriptLibraryLoading, setScriptLibraryLoading] = useState(false);
  const [selectedLibraryScript, setSelectedLibraryScript] = useState<ScriptLibraryItem | null>(null);
  const [polishedScript, setPolishedScript] = useState<GeneratedScriptResult | null>(null);
  const [polishingScriptId, setPolishingScriptId] = useState('');
  const [savingPolishedScript, setSavingPolishedScript] = useState(false);
  const [task, setTask] = useState<GenerationTask | null>(null);
  const [uploadModal, setUploadModal] = useState<UploadModalState>(null);
  const [sellingAssetDetail, setSellingAssetDetail] = useState<SellingAssetDetail | null>(null);
  const [visualCategory, setVisualCategory] = useState<VisualCategory>('全部');
  const [visualAssets, setVisualAssets] = useState<Asset[]>([]);
  const [selectedVisualAssetIds, setSelectedVisualAssetIds] = useState<string[]>([]);
  const [videoScope, setVideoScope] = useState('按全部分镜生成');
  const [selectedVideoShot, setSelectedVideoShot] = useState('镜号01 3s');
  const [selectedVideoTags, setSelectedVideoTags] = useState(['可用']);
  const [dubbingMode, setDubbingMode] = useState<DubbingMode>('TTS 旁白模式');
  const [selectedVoice, setSelectedVoice] = useState('甜美女声');
  const [speechSpeed, setSpeechSpeed] = useState('标准');
  const [speechTone, setSpeechTone] = useState('自然');
  const [audioVolume, setAudioVolume] = useState('80%');
  const [customAudioName, setCustomAudioName] = useState('未上传');
  const [selectedDigitalHuman, setSelectedDigitalHuman] = useState('品牌数字人 A');
  const [lipPrecision, setLipPrecision] = useState('高精度（推荐）');
  const [lipFaceVideoName, setLipFaceVideoName] = useState('未上传');
  const [dubbingStatus, setDubbingStatus] = useState('待生成');
  const [selectedPreviewClip, setSelectedPreviewClip] = useState('镜号01 3s');
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [transitionEffect, setTransitionEffect] = useState('淡入淡出');
  const [backgroundMusic, setBackgroundMusic] = useState('轻快版权音乐');
  const [assetFilter, setAssetFilter] = useState('全部');
  const [exportResolution, setExportResolution] = useState('1080P');
  const [favoriteAssetIds, setFavoriteAssetIds] = useState(['clip_01']);

  useEffect(() => {
    if (step !== 'selling-points' || assets.length) return;
    sellingPointApi.getSellingAssets().then((data) => setAssets(data));
  }, [step, assets.length]);

  useEffect(() => {
    if (step !== 'script-generator') return;
    scriptApi.getScriptFormats().then((data) => {
      setScriptFormats(data);
      if (data[0]) setScriptFormatId((current) => current || data[0].id);
    });
    scriptApi.getTemplateCategories().then((data) => {
      setTemplateCategories(data);
      if (data[0]) setSelectedTemplateCategoryId((current) => current || data[0].id);
    });
  }, [step]);

  // --- step loaders ---
  useEffect(() => {
    if (step !== 'selling-points') return;
    let cancelled = false;
    sellingPointApi.getProjectBriefStore(projectId).then((store) => {
      if (cancelled) return;
      const latestBrief = store.briefs[0];
      const latestVersion = latestBrief?.versions[0];
      if (latestBrief && latestVersion) {
        setBriefStore({
          ...store,
          activeBriefId: latestBrief.id,
          briefs: store.briefs.map((item) => item.id === latestBrief.id ? { ...item, activeVersionId: latestVersion.id } : item),
        });
        _syncFormFromVersion(latestVersion.data as Record<string, unknown>);
      } else {
        setBriefStore(store);
        setProductName('');
        setProductPrice('');
        setProductSlogan('');
        setSpecialSellingPoint('');
        setMainSellingPoint('');
        setAuxiliarySellingPoint('');
        setSuitableCrowd('');
        setSuitableScene('');
        setBriefScore(0);
      }
    });
    return () => { cancelled = true; };
  }, [step, projectId]);

  useEffect(() => {
    if (step !== 'storyboard') return;
    let cancelled = false;
    workflowApi.getStep<{ scriptName?: string; rows?: StoryboardRow[] }>(projectId, 'storyboard').then((state) => {
      if (cancelled || !state.data) return;
      if (state.data.scriptName) setScriptName(state.data.scriptName);
      if (state.data.rows?.length) setStoryboard(state.data.rows);
    });
    return () => { cancelled = true; };
  }, [step, projectId]);

  useEffect(() => {
    if (step !== 'storyboard') return;
    let cancelled = false;
    setScriptLibraryLoading(true);
    scriptApi.getScriptLibrary(scriptLibraryCategory).then((data) => {
      if (cancelled) return;
      setScriptLibrary(data);
      setSelectedLibraryScript(null);
      setPolishedScript(null);
    }).catch(() => {
      if (!cancelled) showToast('脚本列表加载失败，请稍后重试。', 'warning');
    }).finally(() => {
      if (!cancelled) setScriptLibraryLoading(false);
    });
    return () => { cancelled = true; };
  }, [step, scriptLibraryCategory]);

  useEffect(() => {
    if (step !== 'visual') return;
    let cancelled = false;
    workflowApi.getStep<{ visualCategory?: VisualCategory; selectedAssetIds?: string[] }>(projectId, 'visual').then((state) => {
      if (cancelled || !state.data) return;
      if (state.data.visualCategory) setVisualCategory(state.data.visualCategory);
      if (state.data.selectedAssetIds) setSelectedVisualAssetIds(state.data.selectedAssetIds);
    });
    return () => { cancelled = true; };
  }, [step, projectId]);

  useEffect(() => {
    if (step !== 'video') return;
    let cancelled = false;
    workflowApi.getStep<{ scope?: string; selectedShot?: string; tags?: string[] }>(projectId, 'video').then((state) => {
      if (cancelled || !state.data) return;
      if (state.data.scope) setVideoScope(state.data.scope);
      if (state.data.selectedShot) setSelectedVideoShot(state.data.selectedShot);
      if (state.data.tags?.length) setSelectedVideoTags(state.data.tags);
    });
    return () => { cancelled = true; };
  }, [step, projectId]);

  useEffect(() => {
    if (step !== 'dubbing') return;
    let cancelled = false;
    workflowApi.getStep<{ mode?: DubbingMode; voice?: string; speed?: string; tone?: string; volume?: string; customAudioName?: string; digitalHuman?: string; lipPrecision?: string; lipFaceVideoName?: string; status?: string }>(projectId, 'dubbing').then((state) => {
      if (cancelled || !state.data) return;
      const d = state.data;
      if (d.mode) setDubbingMode(d.mode);
      if (d.voice) setSelectedVoice(d.voice);
      if (d.speed) setSpeechSpeed(d.speed);
      if (d.tone) setSpeechTone(d.tone);
      if (d.volume) setAudioVolume(d.volume);
      if (d.customAudioName) setCustomAudioName(d.customAudioName);
      if (d.digitalHuman) setSelectedDigitalHuman(d.digitalHuman);
      if (d.lipPrecision) setLipPrecision(d.lipPrecision);
      if (d.lipFaceVideoName) setLipFaceVideoName(d.lipFaceVideoName);
      if (d.status) setDubbingStatus(d.status);
    });
    return () => { cancelled = true; };
  }, [step, projectId]);

  useEffect(() => {
    if (step !== 'preview') return;
    let cancelled = false;
    workflowApi.getStep<{ clip?: string; transition?: string; backgroundMusic?: string; assetFilter?: string; exportResolution?: string; favoriteAssetIds?: string[] }>(projectId, 'preview').then((state) => {
      if (cancelled || !state.data) return;
      const d = state.data;
      if (d.clip) setSelectedPreviewClip(d.clip);
      if (d.transition) setTransitionEffect(d.transition);
      if (d.backgroundMusic) setBackgroundMusic(d.backgroundMusic);
      if (d.assetFilter) setAssetFilter(d.assetFilter);
      if (d.exportResolution) setExportResolution(d.exportResolution);
      if (d.favoriteAssetIds) setFavoriteAssetIds(d.favoriteAssetIds);
    });
    return () => { cancelled = true; };
  }, [step, projectId]);

  useEffect(() => {
    assetApi.getAssets().then((data) => {
      setVisualAssets((current) => {
        const currentIds = new Set(current.map((asset) => asset.id));
        return [...current, ...data.filter((asset) => !currentIds.has(asset.id))];
      });
      setSelectedVisualAssetIds((current) => {
        const boundIds = data.filter((asset) => asset.status === '已绑定').map((asset) => asset.id);
        return Array.from(new Set([...current, ...boundIds]));
      });
    });
  }, []);

  const saveAndNext = async (stepName: string, data: unknown = {}) => {
    await workflowApi.saveStep({ projectId, step: stepName, data });
    showToast('当前步骤已保存。');
    onNext();
  };

  const openUpload = (modal: NonNullable<UploadModalState>) => setUploadModal(modal);

  const importSellingPointRows = async (file: File) => {
    const currentActiveBriefId = briefStore?.activeBriefId || '';
    const result = await sellingPointApi.importBriefs(projectId, file);
    suppressBriefSync.current = true;
    setBriefStore({
      ...result.store,
      activeBriefId: currentActiveBriefId || result.store.activeBriefId,
    });
    showToast(`已导入 ${result.imported} 条：新增 ${result.created} 个 Brief，追加 ${result.versioned} 个版本。`);
    return true;
  };

  const completeUpload = async (file: File | null) => {
    if (!file || !uploadModal) {
      showToast('请选择文件后再上传。', 'warning');
      return;
    }
    if (uploadModal.type === 'selling-point-template') {
      const imported = await importSellingPointRows(file);
      if (imported) setUploadModal(null);
      return;
    }
    const result = await workflowApi.uploadFile({ type: uploadModal.type, fileName: file.name });
    if (uploadModal.type === 'style-reference') {
      const type = visualCategory === '全部' ? '场景' : visualCategory;
      const asset = { id: result.id, name: result.fileName, type, status: '待绑定', tag: '本次上传' };
      setVisualAssets((current) => [asset, ...current]);
      setVisualCategory(type);
    }
    if (uploadModal.type === 'custom-audio') {
      setCustomAudioName(result.fileName);
      setDubbingMode('TTS 旁白模式');
      setDubbingStatus('已上传自定义音频');
    }
    if (uploadModal.type === 'lip-face-video') {
      setLipFaceVideoName(result.fileName);
      setDubbingMode('对口型模式');
      setDubbingStatus('已上传面部视频');
    }
    if (uploadModal.type === 'background-music') {
      setBackgroundMusic(result.fileName);
    }
    showToast(`${result.fileName} 已上传到 ${uploadModal.title}。`);
    setUploadModal(null);
  };

  const toggleVisualAsset = (asset: Asset) => {
    const isSelected = selectedVisualAssetIds.includes(asset.id);
    setSelectedVisualAssetIds(isSelected
      ? selectedVisualAssetIds.filter((id) => id !== asset.id)
      : [...selectedVisualAssetIds, asset.id]);
    showToast(isSelected ? `已取消绑定：${asset.name}` : `已绑定素材：${asset.name}`);
  };

  const generateVisualScene = () => {
    const sceneCount = visualAssets.filter((asset) => asset.type === '场景').length + 1;
    const asset = {
      id: `ai_scene_${Date.now()}`,
      name: `AI 场景候选 ${sceneCount}`,
      type: '场景',
      status: '待绑定',
      tag: '按当前分镜生成',
    };
    setVisualAssets((current) => [asset, ...current]);
    setVisualCategory('场景');
    showToast('AI 已生成候选场景图，可在素材板中绑定。');
  };

  const toggleVideoTag = (tag: string) => {
    if (selectedVideoTags.includes(tag) && selectedVideoTags.length === 1) {
      showToast('至少保留 1 个视频片段标签。', 'warning');
      return;
    }
    const nextTags = selectedVideoTags.includes(tag)
      ? selectedVideoTags.filter((item) => item !== tag)
      : [...selectedVideoTags, tag];
    setSelectedVideoTags(nextTags);
    showToast(nextTags.includes(tag) ? `已选择视频标签：${tag}` : `已取消视频标签：${tag}`);
  };

  const startVideoGeneration = () => {
    const target = videoScope === '按全部分镜生成' ? '全部分镜' : selectedVideoShot;
    const action = videoScope === '失败镜头重试' ? '重试' : '生成';
    setTask({ status: 'running', progress: 12, label: `正在${action}${target}，标签：${selectedVideoTags.join('、')}` });
    showToast(`视频${action}任务已提交：${target}`);
  };

  const generateDubbing = () => {
    const label = dubbingMode === 'TTS 旁白模式'
      ? `${selectedVoice} / ${speechSpeed} / ${speechTone} / ${audioVolume}`
      : `${selectedDigitalHuman} / ${lipPrecision}`;
    setDubbingStatus('已生成');
    showToast(dubbingMode === 'TTS 旁白模式' ? `AI 配音已生成：${label}` : `对口型片段已生成：${label}`);
  };

  const movePreviewClip = (direction: 'previous' | 'next') => {
    const currentIndex = videoShots.findIndex((shot) => shot === selectedPreviewClip);
    const nextIndex = direction === 'previous'
      ? Math.max(0, currentIndex - 1)
      : Math.min(videoShots.length - 1, currentIndex + 1);
    const nextClip = videoShots[nextIndex];
    setSelectedPreviewClip(nextClip);
    showToast(`已选中时间轴片段：${nextClip}`);
  };

  const toggleFavoriteAsset = (assetId: string) => {
    const nextIds = favoriteAssetIds.includes(assetId)
      ? favoriteAssetIds.filter((id) => id !== assetId)
      : [...favoriteAssetIds, assetId];
    setFavoriteAssetIds(nextIds);
    showToast(nextIds.includes(assetId) ? '素材已收藏。' : '素材已取消收藏。');
  };


  const buildSellingBrief = (nextProductName = productName, nextPrimary = primarySellingPoint, nextAuxiliary = auxiliarySellingPoints, nextTargets = targetGroups, nextOtherRequirements = otherRequirements) => {
    const auxiliaryText = nextAuxiliary.length ? `，辅助卖点包括${nextAuxiliary.join('、')}` : '';
    const targetText = nextTargets.length ? `。目标用户：${nextTargets.join('、')}` : '';
    const requirementText = nextOtherRequirements ? `。补充要求：${nextOtherRequirements}` : '';
    return `${nextProductName}，主打 ${nextPrimary}${auxiliaryText}${targetText}${requirementText}。`;
  };

  const sellingPointData = {
    productName,
    brief,
    sellingPoints,
    primarySellingPoint,
    auxiliarySellingPoints,
    targetGroups,
    otherRequirements,
  };

  const setAsPrimaryPoint = (point: string) => {
    const nextAuxiliary = auxiliarySellingPoints.filter((item) => item !== point);
    setPrimarySellingPoint(point);
    setAuxiliarySellingPoints(nextAuxiliary);
    setBrief(buildSellingBrief(productName, point, nextAuxiliary));
    showToast(`已将「${point}」设为主卖点。`);
  };

  const toggleAuxiliaryPoint = (point: string) => {
    if (point === primarySellingPoint) {
      showToast('主卖点不能同时作为辅助卖点。', 'warning');
      return;
    }
    const nextAuxiliary = auxiliarySellingPoints.includes(point)
      ? auxiliarySellingPoints.filter((item) => item !== point)
      : [...auxiliarySellingPoints, point];
    setAuxiliarySellingPoints(nextAuxiliary);
    setBrief(buildSellingBrief(productName, primarySellingPoint, nextAuxiliary));
    showToast(nextAuxiliary.includes(point) ? `已加入辅助卖点：${point}` : `已移出辅助卖点：${point}`);
  };

  const addSellingPoint = () => {
    const point = newSellingPoint.trim();
    if (!point) {
      showToast('请输入要新增的产品卖点。', 'warning');
      return;
    }
    if (sellingPoints.includes(point)) {
      showToast('该卖点已存在，可直接选择。', 'warning');
      return;
    }
    if (sellingPoints.length >= 5) {
      showToast('建议保持 3-5 个特色卖点，便于脚本聚焦。', 'warning');
      return;
    }
    const nextPoints = [...sellingPoints, point];
    const nextAuxiliary = [...auxiliarySellingPoints, point];
    setSellingPoints(nextPoints);
    setAuxiliarySellingPoints(nextAuxiliary);
    setNewSellingPoint('');
    setBrief(buildSellingBrief(productName, primarySellingPoint, nextAuxiliary));
    showToast(`已新增卖点：${point}`);
  };

  const removeSellingPoint = (point: string) => {
    if (sellingPoints.length <= 1) {
      showToast('至少保留 1 个产品卖点。', 'warning');
      return;
    }
    const nextPoints = sellingPoints.filter((item) => item !== point);
    const nextPrimary = primarySellingPoint === point ? nextPoints[0] : primarySellingPoint;
    const nextAuxiliary = auxiliarySellingPoints.filter((item) => item !== point && item !== nextPrimary);
    setSellingPoints(nextPoints);
    setPrimarySellingPoint(nextPrimary);
    setAuxiliarySellingPoints(nextAuxiliary);
    setBrief(buildSellingBrief(productName, nextPrimary, nextAuxiliary));
    showToast(`已删除卖点：${point}`);
  };

  const toggleTargetGroup = (group: string) => {
    const nextGroups = targetGroups.includes(group)
      ? targetGroups.filter((item) => item !== group)
      : [...targetGroups, group];
    setTargetGroups(nextGroups);
    setBrief(buildSellingBrief(productName, primarySellingPoint, auxiliarySellingPoints, nextGroups));
    showToast(nextGroups.includes(group) ? `已选择目标人群：${group}` : `已取消目标人群：${group}`);
  };

  const addTargetGroup = () => {
    const group = customTargetGroup.trim();
    if (!group) {
      showToast('请输入自定义目标人群。', 'warning');
      return;
    }
    const nextGroups = targetGroups.includes(group) ? targetGroups : [...targetGroups, group];
    setTargetGroups(nextGroups);
    setCustomTargetGroup('');
    setBrief(buildSellingBrief(productName, primarySellingPoint, auxiliarySellingPoints, nextGroups));
    showToast(`已添加目标人群：${group}`);
  };

  const reuseSellingAsset = (asset: SellingAsset | SellingAssetDetail) => {
    const detailItems = 'items' in asset ? asset.items.filter((item) => item.content.trim()) : [];
    const primaryItem = detailItems.find((item) => item.pointType === '主卖点')?.content || asset.main;
    const point = primaryItem.trim();
    if (!point) {
      showToast('该卖点资产没有可复用的主卖点。', 'warning');
      return;
    }
    const detailPoints = detailItems.map((item) => item.content.trim());
    const nextPoints = detailPoints.length ? Array.from(new Set(detailPoints)) : [point];
    const nextAuxiliary = detailItems.length
      ? detailPoints.filter((item) => item !== point)
      : auxiliarySellingPoints.filter((item) => item !== point);
    const nextTargetGroups = 'targetGroups' in asset && asset.targetGroups.length ? asset.targetGroups : targetGroups;
    setSellingPoints(nextPoints);
    setPrimarySellingPoint(point);
    setAuxiliarySellingPoints(nextAuxiliary);
    setTargetGroups(nextTargetGroups);
    setBrief(buildSellingBrief(productName, point, nextAuxiliary, nextTargetGroups));
    showToast(`已复用「${asset.name}」，主卖点、辅助卖点和目标人群已同步。`);
  };

  const reuseSellingAssetFromList = async (asset: SellingAsset) => {
    const detail = await sellingPointApi.getSellingAssetDetail(asset.id);
    reuseSellingAsset(detail);
  };

  const openSellingAssetDetail = async (asset: SellingAsset) => {
    const detail = await sellingPointApi.getSellingAssetDetail(asset.id);
    setSellingAssetDetail(detail);
  };

  const panel = (content: ReactNode) => <>{content}<FileUploadModal modal={uploadModal} onClose={() => setUploadModal(null)} onSubmit={completeUpload} /><SellingAssetDetailModal detail={sellingAssetDetail} onClose={() => setSellingAssetDetail(null)} onReuse={(asset) => { reuseSellingAsset(asset); setSellingAssetDetail(null); }} /></>;

  const activeBrief = briefStore?.briefs.find((b) => b.id === briefStore.activeBriefId) ?? briefStore?.briefs[0];
  const activeBriefVersion = activeBrief?.versions.find((v) => v.id === activeBrief.activeVersionId) ?? activeBrief?.versions[0];

  useEffect(() => {
    if (!activeBriefVersion?.data || scriptBriefText) return;
    const d = activeBriefVersion.data;
    setScriptBriefText(d.brief || buildSellingBrief(d.productName || productName, d.primarySellingPoint || primarySellingPoint, d.auxiliarySellingPoints || auxiliarySellingPoints, d.targetGroups || targetGroups, d.otherRequirements || otherRequirements));
  }, [activeBriefVersion?.id]);

  useEffect(() => {
    if (!selectedTemplateCategoryId) return;
    scriptApi.getTemplates(selectedTemplateCategoryId).then((data) => {
      setTemplateList(data);
      setSelectedTemplate(null);
      if (data[0]) {
        scriptApi.getTemplateDetail(data[0].id).then((detail) => setSelectedTemplate(detail));
      }
    });
  }, [selectedTemplateCategoryId]);

  // Skip useEffect sync when a new brief was just created (form was just cleared)
  const skipVersionSync = useRef(false);
  const suppressBriefSync = useRef(false);
  useEffect(() => { skipVersionSync.current = false; }, [step, activeBriefVersion?.id]);

  useEffect(() => {
    if (step !== 'selling-points') return;
    if (suppressBriefSync.current) {
      suppressBriefSync.current = false;
      return;
    }
    if (skipVersionSync.current) return;
    if (!activeBriefVersion?.data) return;
    const d = activeBriefVersion.data;
    if (typeof d.productName === 'string') setProductName(d.productName);
    if (typeof d.productPrice === 'string') setProductPrice(d.productPrice);
    if (typeof d.productSlogan === 'string') setProductSlogan(d.productSlogan);
    if (typeof d.specialSellingPoint === 'string') setSpecialSellingPoint(d.specialSellingPoint);
    if (typeof d.mainSellingPoint === 'string') setMainSellingPoint(d.mainSellingPoint);
    if (typeof d.auxiliarySellingPoint === 'string') setAuxiliarySellingPoint(d.auxiliarySellingPoint);
    if (typeof d.suitableCrowd === 'string') setSuitableCrowd(d.suitableCrowd);
    if (typeof d.suitableScene === 'string') setSuitableScene(d.suitableScene);
    if (typeof d.briefScore === 'number') setBriefScore(d.briefScore);
  }, [step, activeBriefVersion?.id]);

  const openBriefDrawer = async () => {
    setNewBriefName('');
    setNewVersionLabel('');
    setPendingBriefId(activeBrief?.id || '');
    setPendingVersionId(activeBriefVersion?.id || '');
    setIsBriefDrawerOpen(true);
    setBriefDrawerLoading(true);
    try {
      const store = await sellingPointApi.getProjectBriefStore(projectId);
      setBriefStore(store);
      const drawerBrief = store.briefs.find((item) => item.id === store.activeBriefId) || store.briefs[0];
      setPendingBriefId(drawerBrief?.id || '');
      setPendingVersionId(drawerBrief?.activeVersionId || drawerBrief?.versions[0]?.id || '');
    } catch {
      showToast('Brief / 版本加载失败，请检查接口或稍后重试。', 'warning');
    } finally {
      setBriefDrawerLoading(false);
    }
  };

  const newBrief = async () => {
    const shouldSave = hasUnsavedChanges();
    const savedData = shouldSave ? getCurrentBriefData() : null;
    const briefName = productName.trim() || '未命名 Brief';
    if (shouldSave && activeBrief && activeBriefVersion) {
      await sellingPointApi.saveBriefVersion(projectId, activeBrief.id, activeBriefVersion.id, savedData, briefScore);
    }
    skipVersionSync.current = true;
    setProductName(briefName);
    setProductPrice('');
    setProductSlogan('');
    setSpecialSellingPoint('');
    setMainSellingPoint('');
    setAuxiliarySellingPoint('');
    setSuitableCrowd('');
    setSuitableScene('');
    setBriefScore(0);
    setBriefDetected(false);
    const store = await sellingPointApi.createBrief(projectId, briefName);
    const createdBrief = store.briefs.find((item) => item.id === store.activeBriefId) || store.briefs[0];
    const createdVersion = createdBrief?.versions.find((item) => item.id === createdBrief.activeVersionId) || createdBrief?.versions[0];
    if (createdBrief && createdVersion) {
      await sellingPointApi.saveBriefVersion(projectId, createdBrief.id, createdVersion.id, {
        productName: briefName,
        brief: buildSellingBrief(briefName, '', [], [], ''),
        sellingPoints: [],
        primarySellingPoint: '',
        auxiliarySellingPoints: [],
        targetGroups: [],
        otherRequirements: '',
        productVersion: createdVersion.label,
        productPrice: '',
        productSlogan: '',
        specialSellingPoint: '',
        mainSellingPoint: '',
        auxiliarySellingPoint: '',
        suitableCrowd: '',
        suitableScene: '',
        briefScore: 0,
      }, 0);
      setBriefStore(await sellingPointApi.getProjectBriefStore(projectId));
    } else {
      setBriefStore(store);
    }
    showToast(`已新增产品 Brief：${briefName}`);
  };

  const newScript = () => {
    setScriptTab('viral');
    setViralUrl('');
    setViralTranscript('');
    setViralSourceTitle('');
    setCopyAnalysis(null);
    setStructureResult(null);
    setOriginalPrompt('');
    setGeneratedScript(null);
    setScriptProductVisual('');
    setScriptBriefOptions([]);
    setSelectedScriptBriefId('');
    setScriptBusyAction('');
    showToast('已新增脚本，请重新选择生成方式。');
  };

  useImperativeHandle(ref, () => ({ openBriefDrawer, newBrief, newScript }), [openBriefDrawer, newBrief, newScript]);

  const createBrief = async () => {
    const name = newBriefName.trim();
    if (!name) {
      showToast('请填写 Brief 名称（用于区分不同产品）。', 'warning');
      return;
    }
    const shouldSave = hasUnsavedChanges();
    // Capture current form data before clearing
    const savedData = shouldSave ? getCurrentBriefData() : null;
    setCreatingBrief(true);
    skipVersionSync.current = true;
    setNewBriefName('');
    // Immediately clear form — user sees reset right away
    setProductName(name);
    setProductPrice('');
    setProductSlogan('');
    setSpecialSellingPoint('');
    setMainSellingPoint('');
    setAuxiliarySellingPoint('');
    setSuitableCrowd('');
    setSuitableScene('');
    setBriefScore(0);
    try {
      if (savedData && activeBrief && activeBriefVersion) {
        await sellingPointApi.saveBriefVersion(projectId, activeBrief.id, activeBriefVersion.id, savedData, briefScore);
        const store = await sellingPointApi.getProjectBriefStore(projectId);
        setBriefStore(store);
      }
      const store = await sellingPointApi.createBrief(projectId, name);
      const createdBrief = store.briefs.find((item) => item.id === store.activeBriefId) || store.briefs[0];
      const createdVersion = createdBrief?.versions.find((item) => item.id === createdBrief.activeVersionId) || createdBrief?.versions[0];
      if (createdBrief && createdVersion) {
        await sellingPointApi.saveBriefVersion(projectId, createdBrief.id, createdVersion.id, {
          productName: name,
          brief: buildSellingBrief(name, '', [], [], ''),
          sellingPoints: [],
          primarySellingPoint: '',
          auxiliarySellingPoints: [],
          targetGroups: [],
          otherRequirements: '',
          productVersion: createdVersion.label,
          productPrice: '',
          productSlogan: '',
          specialSellingPoint: '',
          mainSellingPoint: '',
          auxiliarySellingPoint: '',
          suitableCrowd: '',
          suitableScene: '',
          briefScore: 0,
        }, 0);
        setBriefStore(await sellingPointApi.getProjectBriefStore(projectId));
      } else {
        setBriefStore(store);
      }
      showToast('已新增产品 Brief，默认版本 v1.0。');
    } finally {
      setCreatingBrief(false);
    }
  };

  const setActiveBriefId = async (briefId: string) => {
    if (hasUnsavedChanges()) {
      await saveCurrentBriefVersion();
    }
    const store = await sellingPointApi.setActiveBrief(projectId, briefId);
    setBriefStore(store);
    const newActive = store.briefs.find((b) => b.id === briefId);
    const newVer = newActive?.versions.find((v) => v.id === newActive.activeVersionId) || newActive?.versions[0];
    if (newVer?.data) {
      _syncFormFromVersion(newVer.data as Record<string, unknown>);
    }
    setPendingVersionId(newVer?.id || '');
  };

  const setActiveVersionId = async (briefId: string, versionId: string) => {
    if (hasUnsavedChanges()) {
      await saveCurrentBriefVersion();
    }
    const result = await sellingPointApi.setActiveVersion(projectId, briefId, versionId);
    setBriefStore((current) => current ? {
      ...current,
      activeBriefId: result.activeBriefId,
      briefs: current.briefs.map((brief) => brief.id === result.briefId ? { ...brief, activeVersionId: result.activeVersionId, updatedAt: result.brief?.updatedAt || brief.updatedAt } : brief),
    } : current);
    if (result.version?.data) {
      _syncFormFromVersion(result.version.data as Record<string, unknown>);
    }
  };

  const confirmVersionSwitch = async () => {
    const targetBrief = briefStore?.briefs.find((item) => item.id === pendingBriefId);
    const targetVersion = targetBrief?.versions.find((item) => item.id === pendingVersionId) || targetBrief?.versions[0];
    if (!targetBrief || !targetVersion) {
      setIsBriefDrawerOpen(false);
      return;
    }
    if (hasUnsavedChanges()) {
      await saveCurrentBriefVersion();
    }
    const result = await sellingPointApi.setActiveVersion(projectId, targetBrief.id, targetVersion.id);
    setBriefStore((current) => {
      if (!current) return current;
      return {
        ...current,
        activeBriefId: result.activeBriefId,
        briefs: current.briefs.map((brief) => brief.id === result.briefId ? { ...brief, activeVersionId: result.activeVersionId, updatedAt: result.brief?.updatedAt || brief.updatedAt } : brief),
      };
    });
    if (result.version?.data) _syncFormFromVersion(result.version.data as Record<string, unknown>);
    showToast(`已切换到 ${targetBrief.name} / ${result.version?.label || targetVersion.label}`);
    setIsBriefDrawerOpen(false);
  };

  const createVersion = async () => {
    if (!activeBrief) {
      showToast('当前 Brief 未加载，请稍后重试。', 'warning');
      return;
    }
    const currentLabel = activeBriefVersion?.label || activeBrief.versions[0]?.label || 'v1.0';
    const major = Number(currentLabel.match(/v?(\d+)/i)?.[1] || 1);
    const label = `v${major + 1}.0`;
    setCreatingVersion(true);
    try {
      const store = await sellingPointApi.createBriefVersion(projectId, activeBrief.id, label, 'copy');
      setBriefStore(store);
      setNewVersionLabel('');
      showToast(`已新增 Brief 版本：${label}`);
      setIsBriefDrawerOpen(false);
    } finally {
      setCreatingVersion(false);
    }
  };

  const getCurrentBriefData = (): ProductBriefInput => ({
    productName,
    brief: buildSellingBrief(productName, primarySellingPoint, auxiliarySellingPoints, targetGroups, otherRequirements),
    sellingPoints,
    primarySellingPoint,
    auxiliarySellingPoints,
    targetGroups,
    otherRequirements,
    productVersion: activeBriefVersion?.label || productVersion,
    productPrice,
    productSlogan,
    specialSellingPoint,
    mainSellingPoint,
    auxiliarySellingPoint,
    suitableCrowd,
    suitableScene,
    briefScore,
  });

  const closeCompareModal = () => {
    setCompareModal({ comparing: false, loading: false, briefName: '', versions: [], firstVersionId: '', secondVersionId: '', result: null });
  };

  const openCompareModal = async () => {
    if (hasUnsavedChanges()) {
      await saveCurrentBriefVersion();
    }
    const store = await sellingPointApi.getProjectBriefStore(projectId);
    setBriefStore(store);
    const brief = store.briefs.find((b) => b.id === store.activeBriefId) || store.briefs[0];
    if (!brief) {
      showToast('当前没有可对比的 Brief。', 'warning');
      return;
    }
    setCompareModal({ comparing: false, loading: true, briefName: brief.name, versions: [], firstVersionId: '', secondVersionId: '', result: null });
    try {
      const versions = await sellingPointApi.getBriefVersions(projectId, brief.id);
      if (versions.length < 2) {
        closeCompareModal();
        showToast('当前 Brief 至少需要两个版本才能对比。', 'warning');
        return;
      }
      setCompareModal({ comparing: false, loading: false, briefName: brief.name, versions, firstVersionId: versions[1]?.id || versions[0].id, secondVersionId: versions[0].id, result: null });
    } catch {
      closeCompareModal();
      showToast('历史版本加载失败，请重试。', 'warning');
    }
  };

  const runBriefComparison = async () => {
    if (!compareModal.firstVersionId || !compareModal.secondVersionId || compareModal.firstVersionId === compareModal.secondVersionId) {
      showToast('请选择两个不同版本进行对比。', 'warning');
      return;
    }
    const baselineVersion = compareModal.versions.find((v) => v.id === compareModal.firstVersionId);
    const currentVersion = compareModal.versions.find((v) => v.id === compareModal.secondVersionId);
    if (!baselineVersion || !currentVersion) return;
    const current = currentVersion.data as ProductBriefInput;
    const baseline = baselineVersion.data as ProductBriefInput;
    setCompareModal((prev) => ({ ...prev, comparing: true }));
    try {
      const result = await sellingPointApi.compareBrief(current, baseline, {
        briefName: compareModal.briefName,
        baselineVersion: baselineVersion.label,
        currentVersion: currentVersion.label,
      });
      setCompareModal((prev) => ({ ...prev, comparing: false, result }));
    } catch {
      setCompareModal((prev) => ({ ...prev, comparing: false }));
      showToast('对比检测失败，请重试。', 'warning');
    }
  };

  const selectedCompareFirstVersion = compareModal.versions.find((v) => v.id === compareModal.firstVersionId);
  const selectedCompareSecondVersion = compareModal.versions.find((v) => v.id === compareModal.secondVersionId);

  const hasUnsavedChanges = () => {
    if (!activeBrief || !activeBriefVersion) return false;
    const saved = activeBriefVersion.data;
    return (
      productName !== (saved?.productName || '') ||
      productPrice !== (saved?.productPrice || '') ||
      productSlogan !== (saved?.productSlogan || '') ||
      specialSellingPoint !== (saved?.specialSellingPoint || '') ||
      mainSellingPoint !== (saved?.mainSellingPoint || '') ||
      auxiliarySellingPoint !== (saved?.auxiliarySellingPoint || '') ||
      suitableCrowd !== (saved?.suitableCrowd || '') ||
      suitableScene !== (saved?.suitableScene || '')
    );
  };

  const saveCurrentBriefVersion = async () => {
    let store = briefStore || await sellingPointApi.getProjectBriefStore(projectId);
    let briefItem = store.briefs.find((item) => item.id === store.activeBriefId) || store.briefs[0];
    if (!briefItem) {
      store = await sellingPointApi.createBrief(projectId, productName.trim() || '新 Brief');
      briefItem = store.briefs.find((item) => item.id === store.activeBriefId) || store.briefs[0];
    }
    const versionItem = briefItem?.versions.find((item) => item.id === briefItem.activeVersionId) || briefItem?.versions[0];
    if (!briefItem || !versionItem) {
      showToast('当前 Brief 版本不存在，请先创建 Brief。', 'warning');
      return;
    }
    const data = getCurrentBriefData();
    await sellingPointApi.saveBriefVersion(projectId, briefItem.id, versionItem.id, { ...data, productVersion: versionItem.label }, briefScore);
    const latestStore = await sellingPointApi.getProjectBriefStore(projectId);
    setBriefStore(latestStore);
  };

  const _syncFormFromVersion = (d: Record<string, unknown>) => {
    setProductName((d.productName as string) || '');
    setProductVersion((d.productVersion as string) || 'v1.0');
    setProductPrice((d.productPrice as string) || '');
    setProductSlogan((d.productSlogan as string) || '');
    setSpecialSellingPoint((d.specialSellingPoint as string) || '');
    setMainSellingPoint((d.mainSellingPoint as string) || '');
    setAuxiliarySellingPoint((d.auxiliarySellingPoint as string) || '');
    setSuitableCrowd((d.suitableCrowd as string) || '');
    setSuitableScene((d.suitableScene as string) || '');
    setBriefScore((d.briefScore as number) || 0);
  };

  // --- Step 1: Selling Points ---
  if (step === 'selling-points') {

    const formRows: Array<{ label: string; placeholder: string; hint: string; value: string; setter: (v: string) => void }> = [
      { label: '特色卖点（与竞品区别的必提点）：', placeholder: '例如：20 分钟快速加热，竞品普遍需要 30 分钟以上…', hint: '60-120 字，突出差异化竞争优势', value: specialSellingPoint, setter: setSpecialSellingPoint },
      { label: '主卖点：', placeholder: '例如：20 分钟快速加热，一键启动…', hint: '30-80 字，记忆点强，一句话打透', value: mainSellingPoint, setter: setMainSellingPoint },
      { label: '辅助卖点（不重要的卖点）：', placeholder: '例如：分层防串味设计、通勤包可轻松放下…', hint: '20-60 字，可多条，用 | 分隔', value: auxiliarySellingPoint, setter: setAuxiliarySellingPoint },
      { label: '适合人群：', placeholder: '例如：25-35 岁职场女性、通勤上班族、精致妈妈…', hint: '标注人群年龄段与身份特征', value: suitableCrowd, setter: setSuitableCrowd },
      { label: '适合场景：', placeholder: '例如：加班场景 / 通勤路上 / 居家办公 / 外出就餐…', hint: '标注具体使用场景，画面感强', value: suitableScene, setter: setSuitableScene },
    ];

    const runBriefScoreCheck = async () => {
      setScoringBrief(true);
      try {
        const result = await sellingPointApi.scoreBrief(getCurrentBriefData(), {
          briefName: activeBrief?.name || productName,
          version: activeBriefVersion?.label || productVersion,
        });
        setBriefScore(result.score);
        setBriefScoreResult(result);
        setBriefDetected(true);
        showToast(`大模型 Brief 检测完成，综合评分 ${result.score} 分。`);
      } catch {
        showToast('Brief 大模型检测失败，请检查接口或稍后重试。', 'warning');
      } finally {
        setScoringBrief(false);
      }
    };

    const handleSaveBrief = async () => {
      setSavingBrief(true);
      try {
        await saveCurrentBriefVersion();
        showToast('当前 Brief 版本已保存。');
      } finally {
        setSavingBrief(false);
      }
    };
    const filteredBriefs = briefStore?.briefs
      .filter((item) => item.name.toLowerCase().includes(briefSearchKeyword.trim().toLowerCase()))
      .toSorted((a, b) => b.createdAt.localeCompare(a.createdAt)) || [];
    const drawerBrief = briefStore?.briefs.find((item) => item.id === pendingBriefId) || activeBrief;

    return panel(<section className="step-panel panel brief-page">
      {isBriefDrawerOpen && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card brief-drawer-modal">
            <div className="modal-head">
              <div>
                <span className="eyebrow">Brief 管理</span>
                <h3>Brief / 版本</h3>
              </div>
              <button onClick={() => setIsBriefDrawerOpen(false)}>×</button>
            </div>

            {briefDrawerLoading && <div className="brief-drawer-loading">正在从接口加载 Brief / 版本…</div>}

            {!briefDrawerLoading && briefStore && (
            <div className="brief-drawer-body">
              <section className="brief-drawer-left">
                <div className="brief-drawer-section-head">
                  <h4>产品 Brief 列表</h4>
                  <span className="section-hint">一个产品可有多个 Brief</span>
                </div>
                <div className="brief-drawer-create brief-create-product">
                  <input value={briefSearchKeyword} onChange={(e) => setBriefSearchKeyword(e.target.value)} placeholder="搜索产品 Brief 名称" />
                </div>
                <div className="brief-list-scroll">
                  {filteredBriefs.map((b) => (
                    <button key={b.id} className={b.id === pendingBriefId ? 'brief-item active' : 'brief-item'} onClick={() => { setPendingBriefId(b.id); setPendingVersionId(b.activeVersionId || b.versions[0]?.id || ''); }}>
                      <div className="brief-item-name">{b.name}</div>
                      <div className="brief-item-meta">
                        <span className="brief-item-versions">{b.versions.length} 个版本</span>
                        <span className="brief-item-date">{b.updatedAt}</span>
                      </div>
                    </button>
                  ))}
                  {briefStore.briefs.length === 0 && (
                    <div className="brief-empty-hint">暂无产品 Brief，请先创建</div>
                  )}
                  {briefStore.briefs.length > 0 && filteredBriefs.length === 0 && (
                    <div className="brief-empty-hint">未找到匹配的 Brief</div>
                  )}
                </div>
              </section>

              <section className="brief-drawer-right">
                <div className="brief-drawer-section-head">
                  <h4>Brief 版本列表</h4>
                  {drawerBrief ? <span className="section-hint">当前：{drawerBrief.name}</span> : <span className="section-hint muted">请先选择一个 Brief</span>}
                </div>

                {drawerBrief ? (
                  <>
                    <div className="brief-drawer-create">
                      <button className="secondary-button" onClick={createVersion} disabled={creatingVersion || !drawerBrief}>{creatingVersion ? '新增中…' : '新增版本'}</button>
                    </div>
                    <div className="version-list-scroll">
                      {(drawerBrief.versions || []).map((v) => (
                        <button key={v.id} className={v.id === pendingVersionId ? 'version-item active' : 'version-item'} onClick={() => setPendingVersionId(v.id)}>
                          <div className="version-item-name">{v.label}</div>
                          <div className="version-item-date">{v.updatedAt}</div>
                        </button>
                      ))}
                    </div>
                    <div className="brief-version-actions">
                      <button className="secondary-button" onClick={() => setIsBriefDrawerOpen(false)}>取消</button>
                      <button className="primary-button" onClick={confirmVersionSwitch} disabled={!pendingVersionId}>确定</button>
                    </div>
                  </>
                ) : (
                  <div className="brief-empty-state">
                    <div className="brief-empty-icon">📋</div>
                    <p>请从左侧选择一个 Brief</p>
                    <p>查看其版本列表或新建版本</p>
                  </div>
                )}
              </section>
            </div>
            )}
          </div>
        </div>
      )}
      {/* Brief 对比检测弹窗 */}
      {(compareModal.loading || compareModal.versions.length > 0) && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card detail-modal compare-modal">
            <div className="modal-head">
              <div>
                <span className="eyebrow">Brief 版本对比</span>
                <h3>{compareModal.briefName || '历史版本'}对比检测</h3>
              </div>
              <button onClick={closeCompareModal}>×</button>
            </div>

            {compareModal.loading ? (
              <div className="brief-drawer-loading">正在加载该 Brief 的所有历史版本…</div>
            ) : !compareModal.result ? (
              <>
                <p className="compare-hint">已加载该产品 Brief 的全部历史版本，请选择两个不同版本进行差异对比。</p>
                <div className="compare-picker-grid">
                  <div className="compare-version-picker">
                    <label className="compare-picker-label">版本 A（基线）：</label>
                    <div className="compare-version-list">
                      {compareModal.versions.map((v) => (
                        <button key={v.id} className={compareModal.firstVersionId === v.id ? 'compare-version-btn active' : 'compare-version-btn'} onClick={() => setCompareModal((prev) => ({ ...prev, firstVersionId: v.id, result: null }))}>
                          <strong>{v.label}</strong>
                          <span>{v.updatedAt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="compare-version-picker">
                    <label className="compare-picker-label">版本 B（对比）：</label>
                    <div className="compare-version-list">
                      {compareModal.versions.map((v) => (
                        <button key={v.id} className={compareModal.secondVersionId === v.id ? 'compare-version-btn active' : 'compare-version-btn'} onClick={() => setCompareModal((prev) => ({ ...prev, secondVersionId: v.id, result: null }))}>
                          <strong>{v.label}</strong>
                          <span>{v.updatedAt}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="compare-current-info">
                  <span className="compare-current-label">对比关系：</span>
                  <span className="compare-current-version">{selectedCompareFirstVersion?.label || '-'} → {selectedCompareSecondVersion?.label || '-'}</span>
                </div>
                <div className="modal-actions">
                  <button className="secondary-button" onClick={closeCompareModal}>取消</button>
                  <button className="primary-button" onClick={runBriefComparison} disabled={compareModal.comparing || !compareModal.firstVersionId || !compareModal.secondVersionId || compareModal.firstVersionId === compareModal.secondVersionId}>
                    {compareModal.comparing ? '检测中…' : '开始对比检测'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="compare-score-row">
                  <div className="compare-score-item">
                    <span className="compare-score-label">基线版本评分</span>
                    <span className={`score-number ${compareModal.result.baselineScore >= 70 ? 'score-good' : compareModal.result.baselineScore >= 40 ? 'score-mid' : 'score-low'}`}>{compareModal.result.baselineScore}</span>
                  </div>
                  <div className="compare-score-arrow">→</div>
                  <div className="compare-score-item">
                    <span className="compare-score-label">当前版本评分</span>
                    <span className={`score-number ${compareModal.result.score >= 70 ? 'score-good' : compareModal.result.score >= 40 ? 'score-mid' : 'score-low'}`}>{compareModal.result.score}</span>
                  </div>
                  <div className="compare-score-delta">
                    <span className="compare-score-label">变化</span>
                    <span className={compareModal.result.score - compareModal.result.baselineScore > 0 ? 'delta-positive' : compareModal.result.score - compareModal.result.baselineScore < 0 ? 'delta-negative' : ''}>
                      {compareModal.result.score - compareModal.result.baselineScore > 0 ? '+' : ''}{compareModal.result.score - compareModal.result.baselineScore}
                    </span>
                  </div>
                </div>

                <div className="compare-ai-meta">
                  <span>大模型调用</span>
                  <strong>{compareModal.result.modelProvider || '后台默认模型'}</strong>
                  <em>{compareModal.result.modelName || '-'}</em>
                  <span>提示词：{compareModal.result.promptName || 'Brief 版本对比检测'} {compareModal.result.promptVersion || ''}</span>
                </div>

                {compareModal.result.changes.length > 0 ? (
                  <div className="compare-changes-list">
                    <h4>检测到的变化（{compareModal.result.changes.length} 处）</h4>
                    {compareModal.result.changes.map((change, idx) => (
                      <div key={idx} className="compare-change-item">
                        <div className="compare-change-field">{change.field}</div>
                        <div className="compare-change-row">
                          <span className="compare-change-before">-{change.before || '(空)'}</span>
                          <span className="compare-change-arrow">→</span>
                          <span className="compare-change-after">+{change.after || '(空)'}</span>
                        </div>
                        {change.impact && <p className="compare-change-impact">AI 判断：{change.impact}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="compare-no-changes">
                    <p>两版本内容一致，未检测到变化。</p>
                  </div>
                )}

                <div className="compare-summary">
                  <h4>检测结论</h4>
                  <p>{compareModal.result.summary}</p>
                  {compareModal.result.conclusion && <p>{compareModal.result.conclusion}</p>}
                </div>

                {!!compareModal.result.suggestions?.length && (
                  <div className="compare-ai-list">
                    <h4>AI 优化建议</h4>
                    {compareModal.result.suggestions.map((item) => <p key={item}>{item}</p>)}
                  </div>
                )}

                {!!compareModal.result.risks?.length && (
                  <div className="compare-ai-list warning">
                    <h4>风险提醒</h4>
                    {compareModal.result.risks.map((item) => <p key={item}>{item}</p>)}
                  </div>
                )}

                {compareModal.result.rawPreview && (
                  <details className="compare-raw-preview">
                    <summary>查看大模型返回预览</summary>
                    <pre>{compareModal.result.rawPreview}</pre>
                  </details>
                )}

                <div className="modal-actions">
                  <button className="secondary-button" onClick={() => setCompareModal((prev) => ({ ...prev, result: null }))}>重新选择版本</button>
                  <button className="primary-button" onClick={closeCompareModal}>关闭</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* 头部：产品版本信息 */}
      <div className="brief-header-bar">
        <div className="brief-header-left">
          <span className="brief-header-label">产品版本</span>
          <span className="brief-version-tag">{activeBriefVersion?.label || productVersion}</span>
          <span className="brief-header-rule">版本号按产品型号自动更新，修改型号+0.1，重大调整升级大版本</span>
        </div>
        <div className="brief-header-actions">
          <button className="ghost-button" onClick={openBriefDrawer}>Brief 管理</button>
          <button className="secondary-button" onClick={() => openUpload({ title: '导入卖点表格', type: 'selling-point-template', accept: '.xlsx,.xls,.csv', hint: '请选择包含产品名称、卖点、人群、场景的 xlsx/csv 文件。', templateCode: 'selling-point-template' })}>导入卖点表格</button>
          <button className="secondary-button" onClick={openCompareModal}>历史版本</button>
        </div>
      </div>

      {/* 1. 顶部标题与功能区 */}
  

      {/* 2. 产品基础信息行 */}
      <div className="brief-basic-row">
        <div className="brief-basic-item">
          <label className="brief-basic-label">产品名称：</label>
          <div className="brief-basic-input">
            <input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="例如：宠鲜鲜智能加热饭盒" />
          </div>
        </div>
        <div className="brief-basic-item">
          <label className="brief-basic-label">产品价格：</label>
          <div className="brief-basic-input">
            <input value={productPrice} onChange={(e) => setProductPrice(e.target.value)} placeholder="可写区间价，如 ¥99-129" />
            <span className="input-hint-tag">可写区间价</span>
          </div>
        </div>
        <div className="brief-basic-item">
          <label className="brief-basic-label">产品 Slogan：</label>
          <div className="brief-basic-input">
            <input value={productSlogan} onChange={(e) => setProductSlogan(e.target.value)} placeholder="一句话定义产品价值" />
            <span className="input-hint-tag">一句话定义</span>
          </div>
        </div>
      </div>

      {/* 3. 核心信息填写区（主体） */}
      <div className="brief-form-section">
        {formRows.map((row) => (
          <div key={row.label} className="brief-form-row">
            <div className="brief-form-label">
              <label>{row.label}</label>
            </div>
            <div className="brief-form-content">
              <textarea
                value={row.value}
                onChange={(e) => row.setter(e.target.value)}
                placeholder={row.placeholder}
                rows={3}
              />
              <span className="brief-char-hint">{row.hint}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 4. 底部操作区 */}
      <div className="brief-footer-bar">
        <button className="secondary-button" onClick={runBriefScoreCheck} disabled={scoringBrief}>{scoringBrief ? '大模型检测中…' : 'Brief 检测评分'}</button>
        <button className="primary-button" onClick={handleSaveBrief} disabled={savingBrief}>
          {savingBrief ? '保存中…' : '保存当前 Brief 版本'}
        </button>
      </div>
      {briefDetected && (
        <div className="brief-score-panel">
          <div className="brief-score-bar">
            <span className="brief-score-label">Brief 大模型检测评分</span>
            <span className={`score-number ${briefScore >= 70 ? 'score-good' : briefScore >= 40 ? 'score-mid' : 'score-low'}`}>{briefScore}</span>
            <span className="score-max">/100</span>
          </div>
          {briefScoreResult && (
            <>
              <div className="compare-ai-meta brief-score-meta">
                <span>大模型调用</span>
                <strong>{briefScoreResult.modelProvider || '后台默认模型'}</strong>
                <em>{briefScoreResult.modelName || '-'}</em>
                <span>提示词：{briefScoreResult.promptName || 'Brief 评分检测'} {briefScoreResult.promptVersion || ''}</span>
              </div>
              <div className="compare-summary">
                <h4>检测结论</h4>
                <p>{briefScoreResult.summary}</p>
              </div>
              <div className="brief-score-dimensions">
                {briefScoreResult.dimensions.map((item) => (
                  <article key={item.name}>
                    <div><strong>{item.name}</strong><span>{item.score}/100</span></div>
                    <p>{item.comment}</p>
                  </article>
                ))}
              </div>
              {!!briefScoreResult.suggestions.length && (
                <div className="compare-ai-list">
                  <h4>AI 优化建议</h4>
                  {briefScoreResult.suggestions.map((item) => <p key={item}>{item}</p>)}
                </div>
              )}
              {!!briefScoreResult.risks.length && (
                <div className="compare-ai-list warning">
                  <h4>风险提醒</h4>
                  {briefScoreResult.risks.map((item) => <p key={item}>{item}</p>)}
                </div>
              )}
              {briefScoreResult.rawPreview && (
                <details className="compare-raw-preview">
                  <summary>查看大模型返回预览</summary>
                  <pre>{briefScoreResult.rawPreview}</pre>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </section>);
  }

  // --- Step 2: Script Generator ---
  if (step === 'script-generator') {
    const scriptConfig = { formatId: scriptFormatId, durationSeconds: scriptDuration, brief: scriptBriefText, productVisual: scriptProductVisual };
    const runScriptAction = async (action: string, task: () => Promise<void>) => {
      setScriptBusyAction(action);
      try {
        await task();
      } finally {
        setScriptBusyAction('');
      }
    };
    const generateCurrentScript = async () => {
      await runScriptAction('generate-script', async () => {
        const result = await scriptApi.generateScriptDraft({ mode: scriptTab === 'template' ? 'template' : scriptTab === 'original' ? 'original' : 'viral', config: scriptConfig, transcript: viralTranscript, analysis: copyAnalysis, structure: structureResult, templateId: selectedTemplate?.id, originalPrompt });
        setGeneratedScript(result);
        setScriptName(result.title);
        showToast('脚本已生成。');
      });
    };
    const saveGeneratedScript = async () => {
      if (!generatedScript) {
        showToast('请先生成脚本再保存。', 'warning');
        return;
      }
      await runScriptAction('save-script', async () => {
        await scriptApi.saveGeneratedScript(projectId, generatedScript);
        await workflowApi.saveStep({ projectId, step: 'script-generator', data: { tab: scriptTab, config: scriptConfig, generatedScript } });
        showToast('脚本已保存到后台。');
      });
    };
    const loadScriptBriefOptions = async () => {
      setScriptBriefLoading(true);
      try {
        const store = await sellingPointApi.getProjectBriefStore(projectId);
        setBriefStore(store);
        const options = store.briefs.flatMap((briefItem) => briefItem.versions.map((version) => {
          const data = version.data;
          const value = data.brief || buildSellingBrief(data.productName || '', data.primarySellingPoint || '', data.auxiliarySellingPoints || [], data.targetGroups || [], data.otherRequirements || '');
          return { id: `${briefItem.id}:${version.id}`, label: `${briefItem.name} / ${version.label}`, value };
        })).filter((item) => item.value.trim());
        setScriptBriefOptions(options);
        if (!options.length) {
          showToast('暂无可选择的 Brief，请先在 Brief 管理中创建并保存。', 'warning');
          return;
        }
        const first = options[0];
        setSelectedScriptBriefId(first.id);
        setScriptBriefText(first.value);
        showToast('Brief 列表已加载，可在下拉框中切换。');
      } catch {
        showToast('Brief 加载失败，请检查接口。', 'warning');
      } finally {
        setScriptBriefLoading(false);
      }
    };
    const selectScriptBrief = (id: string) => {
      setSelectedScriptBriefId(id);
      const option = scriptBriefOptions.find((item) => item.id === id);
      if (option) setScriptBriefText(option.value);
    };
    const ScriptConfigPanel = () => <OptionSection title="脚本配置" subtitle="脚本格式由后台配置，Brief 会作为生成脚本的产品依据。">
      <div className="script-config-grid script-config-one-line">
        <label><span>脚本格式选择</span><select value={scriptFormatId} onChange={(e) => setScriptFormatId(e.target.value)}>{scriptFormats.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label><span>脚本时长</span><div className="script-duration-field"><input value={scriptDuration} onChange={(e) => setScriptDuration(e.target.value)} /><em>s</em></div></label>
        <label><span>产品选择 Brief</span><div className="script-brief-field">{scriptBriefOptions.length ? <select value={selectedScriptBriefId} onChange={(e) => selectScriptBrief(e.target.value)}>{scriptBriefOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select> : <input value={scriptBriefText} onChange={(e) => setScriptBriefText(e.target.value)} placeholder="选择或填写产品 Brief" />}<button type="button" className="secondary-button script-config-action" onClick={loadScriptBriefOptions} disabled={scriptBriefLoading}>{scriptBriefLoading ? '加载中…' : '选择 Brief'}</button></div></label>
        <label><span>产品画面（非必填）</span><input value={scriptProductVisual} onChange={(e) => setScriptProductVisual(e.target.value)} placeholder="可填写画面描述，或点击右侧上传" /></label>
        <button className="secondary-button script-config-action" onClick={() => openUpload({ title: '上传产品画面', type: 'project-asset', accept: '.png,.jpg,.jpeg,.webp,.mp4', hint: '可上传产品图、场景图或短视频素材。' })}>上传产品画面</button>
      </div>
    </OptionSection>;
    const GeneratedScriptPanel = () => generatedScript ? <div className="script-ai-result">
      <div className="script-ai-bubble"><span>AI 脚本结果</span><h3>{generatedScript.title}</h3><p>{generatedScript.content}</p></div>
      <div className="table-wrap script-result-table"><table><thead><tr><th>分镜</th><th>台词</th><th>画面</th><th>时长</th><th>备注</th></tr></thead><tbody>{generatedScript.rows.map((row) => <tr key={row.shot}><td>{row.shot}</td><td>{row.line}</td><td>{row.visual}</td><td>{row.duration}</td><td>{row.note}</td></tr>)}</tbody></table></div>
    </div> : null;

    return panel(<section className="step-panel panel script-generator-page">
      <div className="mode-tabs script-tabs">
        <button className={scriptTab === 'viral' ? 'active' : ''} onClick={() => setScriptTab('viral')}>爆款复刻</button>
        <button className={scriptTab === 'template' ? 'active' : ''} onClick={() => setScriptTab('template')}>灵感模板库</button>
        <button className={scriptTab === 'original' ? 'active' : ''} onClick={() => setScriptTab('original')}>AI 原创脚本</button>
        <button className={scriptTab === 'mine' ? 'active' : ''} onClick={() => setScriptTab('mine')}>我的模板库</button>
      </div>

      {scriptTab === 'viral' && <>
        <OptionSection title="参考链接输入区" subtitle="填写参考链接，视频需要有人声；纯 BGM / 画面 / 字幕类无法解析。">
          <div className="inline-form"><input placeholder="填写参考链接（要求：视频需要有人声，纯 BGM / 画面 / 字幕类无法解析）" value={viralUrl} onChange={(e) => setViralUrl(e.target.value)} /><button onClick={() => runScriptAction('extract-copy', async () => { const data = await scriptApi.extractViralCopy(viralUrl); setViralTranscript(data.transcript); setViralSourceTitle(data.sourceTitle); showToast('文案提取完成。'); })} disabled={scriptBusyAction === 'extract-copy'}>{scriptBusyAction === 'extract-copy' ? '提取中…' : '确认文案提取（消耗积分）'}</button></div>
          {viralTranscript && <div className="script-text-card"><strong>{viralSourceTitle}</strong><p>{viralTranscript}</p></div>}
        </OptionSection>
        <OptionSection title="文案解析区" subtitle="对提取文案进行情绪点、关键信息和表达策略解析。">
          <button className="secondary-button" onClick={() => runScriptAction('analyze-copy', async () => { const data = await scriptApi.analyzeViralCopy(viralTranscript); setCopyAnalysis(data); showToast('文案解析完成。'); })} disabled={!viralTranscript || scriptBusyAction === 'analyze-copy'}>{scriptBusyAction === 'analyze-copy' ? '解析中…' : '文案解析（消耗积分）'}</button>
          {copyAnalysis && <div className="script-insight-grid"><ConfigBox title="情绪点" value={copyAnalysis.emotions.join(' / ')} /><ConfigBox title="关键信息" value={copyAnalysis.keyMessages.join(' / ')} /><ConfigBox title="解析总结" value={copyAnalysis.summary} /></div>}
        </OptionSection>
        <OptionSection title="结构拆解区" subtitle="拆解段落结构、钩子、情绪转折点和结构公式。">
          <button className="secondary-button" onClick={() => runScriptAction('breakdown-structure', async () => { const data = await scriptApi.breakdownViralStructure(viralTranscript, copyAnalysis); setStructureResult(data); showToast('结构拆解完成。'); })} disabled={!copyAnalysis || scriptBusyAction === 'breakdown-structure'}>{scriptBusyAction === 'breakdown-structure' ? '拆解中…' : '结构拆解（消耗积分）'}</button>
          {structureResult && <div className="script-structure-card"><h3>{structureResult.title}</h3><p>{structureResult.hook}</p><strong>{structureResult.formula}</strong>{structureResult.sections.map((section) => <article key={section.title}><b>{section.title}</b><span>{section.points.join(' / ')}</span></article>)}</div>}
        </OptionSection>
        <button className="script-wide-confirm" onClick={() => showToast('已确认解析结果，请继续配置脚本。')}>以上没问题，我要生成脚本</button>
        <ScriptConfigPanel />
        <OptionSection title="生成与结果区" subtitle="调用大模型生成脚本，并以分镜表格预览。"><button className="primary-button" onClick={generateCurrentScript} disabled={scriptBusyAction === 'generate-script'}>{scriptBusyAction === 'generate-script' ? '生成中…' : '确认生成脚本（消耗积分）'}</button><GeneratedScriptPanel /></OptionSection>
      </>}

      {scriptTab === 'template' && <>
        <OptionSection title="模板分类区" subtitle="左侧一级分类由后台维护，右侧展示分类下的子类模板库。">
          <div className="template-library-layout"><div className="template-category-list">{templateCategories.length ? templateCategories.map((item) => <button key={item.id} className={selectedTemplateCategoryId === item.id ? 'active' : ''} onClick={() => setSelectedTemplateCategoryId(item.id)}><strong>{item.name}</strong><span>{item.description}</span></button>) : <div className="script-template-empty">暂无模板大类，请先在后台维护模板。</div>}</div><div className="template-sub-list">{templateList.length ? templateList.map((item) => <button key={item.id} className={selectedTemplate?.id === item.id ? 'active' : ''} onClick={() => scriptApi.getTemplateDetail(item.id).then((detail) => setSelectedTemplate(detail))}><strong>{item.name}</strong><span>{item.summary}</span></button>) : <div className="script-template-empty">暂无子类模板。</div>}</div></div>
          {selectedTemplate && <div className="script-structure-card"><h3>{selectedTemplate.name}</h3><p>{selectedTemplate.summary}</p><strong>{selectedTemplate.formula}</strong>{selectedTemplate.points.map((point) => <article key={point}><span>{point}</span></article>)}</div>}
        </OptionSection>
        <ScriptConfigPanel />
        <OptionSection title="生成与保存" subtitle="基于选中的模板和产品 Brief 生成脚本。"><button className="primary-button" onClick={generateCurrentScript} disabled={!selectedTemplate || scriptBusyAction === 'generate-script'}>{scriptBusyAction === 'generate-script' ? '生成中…' : '确认生成脚本（消耗积分）'}</button><GeneratedScriptPanel /></OptionSection>
      </>}

      {scriptTab === 'original' && <>
        <OptionSection title="内容输入区" subtitle="AI帮你写脚本：请输入脚本需求、产品信息、风格要求等内容。"><div className="original-script-input"><strong>AI帮你写脚本：</strong><textarea value={originalPrompt} onChange={(e) => setOriginalPrompt(e.target.value)} placeholder="例如：帮我写一个 30 秒抖音脚本，面向加班职场人，风格真实生活化，突出快速加热和分层不串味。" rows={6} /></div></OptionSection>
        <ScriptConfigPanel />
        <OptionSection title="生成与结果区" subtitle="调用大模型生成原创脚本，并以分镜表格预览。"><button className="primary-button" onClick={generateCurrentScript} disabled={!originalPrompt.trim() || scriptBusyAction === 'generate-script'}>{scriptBusyAction === 'generate-script' ? '生成中…' : '确认生成脚本（消耗积分）'}</button><GeneratedScriptPanel /></OptionSection>
      </>}

      {scriptTab === 'mine' && <div className="script-coming-soon">功能开发中，敬请期待</div>}
      <div className="script-bottom-actions">
        <button className="primary-button" onClick={saveGeneratedScript} disabled={scriptBusyAction === 'save-script'}>{scriptBusyAction === 'save-script' ? '保存中…' : '保存脚本'}</button>
      </div>
    </section>);
  }

  // --- Step 3: Storyboard ---
  if (step === 'storyboard') {
    const activeCategory = storyboardScriptCategories.find((item) => item.id === scriptLibraryCategory) || storyboardScriptCategories[0];
    const polishLibraryScript = async (script: ScriptLibraryItem) => {
      setSelectedLibraryScript(script);
      setPolishedScript(null);
      setPolishingScriptId('');
    };
    const runPolishInModal = async () => {
      if (!selectedLibraryScript) return;
      setPolishingScriptId(selectedLibraryScript.id);
      try {
        const result = await scriptApi.polishScript(selectedLibraryScript.id);
        setPolishedScript(result);
        showToast('AI 润色完成。');
      } catch {
        showToast('AI 润色失败，请稍后重试。', 'warning');
      } finally {
        setPolishingScriptId('');
      }
    };
    const savePolished = async () => {
      if (!selectedLibraryScript || !polishedScript) {
        showToast('请先选择脚本并完成 AI 润色。', 'warning');
        return;
      }
      setSavingPolishedScript(true);
      try {
        await scriptApi.savePolishedScript(selectedLibraryScript.id, polishedScript);
        const latest = await scriptApi.getScriptLibrary(scriptLibraryCategory);
        setScriptLibrary(latest);
        setSelectedLibraryScript(null);
        setPolishedScript(null);
        showToast('润色脚本已保存。');
      } finally {
        setSavingPolishedScript(false);
      }
    };
    const renderScriptPreview = (script: GeneratedScriptResult | ScriptLibraryItem) => <div className="table-wrap storyboard-polish-table"><table><thead><tr><th>分镜</th><th>台词</th><th>画面</th><th>时长</th><th>备注</th></tr></thead><tbody>{script.rows.map((row) => <tr key={`${row.shot}-${row.duration}`}><td>{row.shot}</td><td>{row.line}</td><td>{row.visual}</td><td>{row.duration}</td><td>{row.note}</td></tr>)}</tbody></table></div>;
    const groupedScripts = scriptLibrary.scripts.reduce<Array<{ date: string; scripts: ScriptLibraryItem[] }>>((groups, item) => {
      const date = item.updatedAt.slice(0, 10) || '未知时间';
      const group = groups.find((entry) => entry.date === date);
      if (group) group.scripts.push(item);
      else groups.push({ date, scripts: [item] });
      return groups;
    }, []);
    const renderScriptCard = (item: ScriptLibraryItem) => <button key={item.id} className={selectedLibraryScript?.id === item.id ? 'active' : ''} onClick={() => polishLibraryScript(item)}>
      <div className="storyboard-card-preview">
        <div className="storyboard-preview-pane large"><span className="folder-glyph" /></div>
        <div className="storyboard-preview-pane small"><span className="folder-glyph" /></div>
      </div>
      <div className="storyboard-card-main"><strong>{item.title}</strong><small>{item.updatedAt}</small></div>
      <span className="storyboard-card-more">⋮</span>
      <em>点击润色</em>
    </button>;

    return panel(<section className="step-panel panel storyboard-polish-page">
      <div className="storyboard-category-tabs">
        {storyboardScriptCategories.map((item) => <button key={item.id} className={scriptLibraryCategory === item.id ? 'active' : ''} onClick={() => setScriptLibraryCategory(item.id)}>{item.label}</button>)}
      </div>

      <div className="storyboard-library-head">
        <div>
          <span className="eyebrow">Script Library</span>
          <h3>{activeCategory.label}</h3>
          <p>{scriptLibraryCategory === 'mine' ? `我的脚本共 ${scriptLibrary.total} 篇，按更新时间倒序展示。` : `当前分类共 ${scriptLibrary.total} 篇脚本。`}</p>
        </div>
        <div className="storyboard-view-toggle">
          <button className={scriptLibraryView === 'list' ? 'active' : ''} onClick={() => setScriptLibraryView('list')}>列表</button>
          <button className={scriptLibraryView === 'card' ? 'active' : ''} onClick={() => setScriptLibraryView('card')}>卡片</button>
        </div>
      </div>

      <section className="storyboard-script-list-panel storyboard-script-list-full">
        {scriptLibraryLoading ? <div className="script-template-empty">脚本加载中…</div> : groupedScripts.length ? <div className="storyboard-date-groups">{groupedScripts.map((group) => <section key={group.date} className="storyboard-date-group"><div className="storyboard-date-head"><strong>{group.date}</strong><span>{group.scripts.length} 篇脚本</span></div><div className={scriptLibraryView === 'card' ? 'storyboard-script-grid' : 'storyboard-script-list'}>{group.scripts.map(renderScriptCard)}</div></section>)}</div> : <div className="script-template-empty">当前分类暂无脚本，请先在脚本生成器中保存脚本。</div>}
      </section>

      {selectedLibraryScript && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card detail-modal storyboard-polish-modal">
            <div className="modal-head">
              <div><span className="eyebrow">AI Polish</span><h3>脚本润色</h3></div>
              <button onClick={() => { setSelectedLibraryScript(null); setPolishedScript(null); setPolishingScriptId(''); }}>×</button>
            </div>
            <div className="storyboard-polish-modal-grid">
              <section className="storyboard-selected-script">
                <span>原脚本</span>
                <h3>{selectedLibraryScript.title}</h3>
                <p>{selectedLibraryScript.content}</p>
              </section>
              <section>
                {polishedScript ? <div className="script-ai-bubble storyboard-polished-bubble"><span>AI 润色后</span><h3>{polishedScript.title}</h3><p>{polishedScript.content}</p></div> : <div className="script-template-empty">点击“AI 润色”后，这里会展示润色后的脚本。</div>}
              </section>
            </div>
            {polishedScript && renderScriptPreview(polishedScript)}
            <div className="modal-actions">
              <button className="secondary-button" onClick={runPolishInModal} disabled={polishingScriptId === selectedLibraryScript.id}>{polishingScriptId === selectedLibraryScript.id ? '润色中…' : 'AI 润色'}</button>
              <button className="primary-button" onClick={savePolished} disabled={!polishedScript || savingPolishedScript}>{savingPolishedScript ? '保存中…' : '保存脚本'}</button>
            </div>
          </div>
        </div>
      )}
    </section>);
  }

  // --- Step 4: Visual ---
  if (step === 'visual') {
    const filteredVisualAssets = visualCategory === '全部' ? visualAssets : visualAssets.filter((asset) => asset.type === visualCategory);
    const selectedVisualAssets = visualAssets.filter((asset) => selectedVisualAssetIds.includes(asset.id));
    const visualStepData = { visualCategory, selectedAssetIds: selectedVisualAssetIds, selectedAssets: selectedVisualAssets, assets: visualAssets };
    return panel(<StepPanel title="步骤 4：场景 角色 道具" intro="为每个分镜绑定场景、角色、道具和风格参考图。" actions={<><button className="secondary-button" onClick={() => openUpload({ title: '风格参考图', type: 'style-reference', accept: '.png,.jpg,.jpeg,.webp', hint: '请选择场景风格图、人物参考图或产品参考图。' })}>上传素材</button><button className="secondary-button" onClick={generateVisualScene}>AI 生成场景</button><button className="primary-button" onClick={() => saveAndNext('visual', visualStepData)}>完成配置</button></>}>
      <div className="choice-grid four compact-grid">{visualCategories.map((item) => <button className={visualCategory === item ? 'choice active' : 'choice'} key={item} onClick={() => setVisualCategory(item)}>{item}</button>)}</div>
      <div className="config-grid">
        <ConfigBox title="场景" value={`已绑定 ${selectedVisualAssets.filter((asset) => asset.type === '场景').length} 个`} />
        <ConfigBox title="角色" value={`已绑定 ${selectedVisualAssets.filter((asset) => asset.type === '角色').length} 个`} />
        <ConfigBox title="道具" value={`已绑定 ${selectedVisualAssets.filter((asset) => asset.type === '道具').length} 个`} />
        <ConfigBox title="风格参考图" value={`当前分类：${visualCategory} / 可用 ${filteredVisualAssets.length} 个`} />
      </div>
      <AssetBoard assets={filteredVisualAssets} selectedAssetIds={selectedVisualAssetIds} onToggle={toggleVisualAsset} />
    </StepPanel>);
  }

  // --- Step 5: Video ---
  if (step === 'video') {
    const videoStepData = { scope: videoScope, selectedShot: selectedVideoShot, tags: selectedVideoTags, task };
    return panel(<StepPanel title="步骤 5：分镜视频" intro="按分镜生成视频片段，展示任务进度和失败重试状态。" actions={<><button className="secondary-button" onClick={startVideoGeneration}>开始生成</button><button className="primary-button" onClick={() => saveAndNext('video', videoStepData)}>全部生成完成</button></>}>
      <OptionSection title="生成范围" subtitle="支持全部生成、选中镜头生成或失败镜头重试">
        <div className="choice-grid three compact-grid">{videoScopes.map((item) => <button className={videoScope === item ? 'choice active' : 'choice'} key={item} onClick={() => setVideoScope(item)}>{item}</button>)}</div>
      </OptionSection>
      <OptionSection title="选中镜头" subtitle="用于单镜头生成和失败镜头重试">
        <div className="choice-grid four compact-grid">{videoShots.map((item) => <button className={selectedVideoShot === item ? 'choice active' : 'choice'} key={item} onClick={() => setSelectedVideoShot(item)}>{item}</button>)}</div>
      </OptionSection>
      <OptionSection title="素材标签" subtitle="多选标签会保存到生成片段，便于后续筛选复用">
        <div className="choice-grid four compact-grid">{videoTagOptions.map((item) => <button className={selectedVideoTags.includes(item) ? 'choice active' : 'choice'} key={item} onClick={() => toggleVideoTag(item)}>标签：{item}</button>)}</div>
      </OptionSection>
      <div className="config-grid"><ConfigBox title="生成范围" value={videoScope} /><ConfigBox title="当前镜头" value={selectedVideoShot} /><ConfigBox title="片段标签" value={selectedVideoTags.join('、')} /><ConfigBox title="任务状态" value={task?.label || '等待开始生成'} /></div>
      <button className="secondary-button" onClick={async () => { setTask(await generationApi.getTaskProgress()); showToast('任务进度已刷新。'); }}>刷新任务进度</button>
      <TaskCard task={task || { status: 'pending', progress: 0, label: '等待开始生成' }} />
    </StepPanel>);
  }

  // --- Step 6: Dubbing ---
  if (step === 'dubbing') {
    const isTtsMode = dubbingMode === 'TTS 旁白模式';
    const dubbingStepData = { mode: dubbingMode, voice: selectedVoice, speed: speechSpeed, tone: speechTone, volume: audioVolume, customAudioName, digitalHuman: selectedDigitalHuman, lipPrecision, lipFaceVideoName, status: dubbingStatus };
    return panel(<StepPanel title="步骤 6：配音对口型" intro="选择音色、上传音频或生成 TTS，并配置口型同步。" actions={<><button className="secondary-button" onClick={() => openUpload(isTtsMode ? { title: '自定义音频', type: 'custom-audio', accept: '.mp3,.wav,.m4a', hint: '请选择旁白音频或角色台词音频。' } : { title: '模特面部视频', type: 'lip-face-video', accept: '.mp4,.mov,.webm', hint: '请选择模特面部视频，用于对口型同步。' })}>{isTtsMode ? '上传音频' : '上传面部视频'}</button><button className="secondary-button" onClick={generateDubbing}>{isTtsMode ? 'AI 生成配音' : 'AI 生成对口型'}</button><button className="primary-button" onClick={() => saveAndNext('dubbing', dubbingStepData)}>音频配置完成</button></>}>
      <div className="mode-tabs">{dubbingModes.map((mode) => <button className={dubbingMode === mode ? 'active' : ''} key={mode} onClick={() => setDubbingMode(mode)}>{mode}</button>)}</div>
      {isTtsMode ? <>
        <OptionSection title="音色库" subtitle="选择配音音色，生成后会应用到所有分镜旁白">
          <div className="choice-grid four">{voiceOptions.map((voice) => <button className={selectedVoice === voice ? 'choice active' : 'choice'} key={voice} onClick={() => setSelectedVoice(voice)}>{voice}</button>)}</div>
        </OptionSection>
        <OptionSection title="语音参数" subtitle="语速、语调、音量均可单独配置">
          <div className="choice-grid three compact-grid">{speechSpeedOptions.map((item) => <button className={speechSpeed === item ? 'choice active' : 'choice'} key={item} onClick={() => setSpeechSpeed(item)}>语速：{item}</button>)}</div>
          <div className="choice-grid three compact-grid">{speechToneOptions.map((item) => <button className={speechTone === item ? 'choice active' : 'choice'} key={item} onClick={() => setSpeechTone(item)}>语调：{item}</button>)}</div>
          <div className="choice-grid three compact-grid">{volumeOptions.map((item) => <button className={audioVolume === item ? 'choice active' : 'choice'} key={item} onClick={() => setAudioVolume(item)}>音量：{item}</button>)}</div>
        </OptionSection>
      </> : <>
        <OptionSection title="数字人与模特源" subtitle="可选择后台配置的数字人，也可上传面部视频替换">
          <div className="choice-grid three">{digitalHumanOptions.map((item) => <button className={selectedDigitalHuman === item ? 'choice active' : 'choice'} key={item} onClick={() => setSelectedDigitalHuman(item)}>{item}</button>)}</div>
        </OptionSection>
        <OptionSection title="口型同步精度" subtitle="高精度适合最终成片，快速预览适合草稿阶段">
          <div className="choice-grid three">{lipPrecisionOptions.map((item) => <button className={lipPrecision === item ? 'choice active' : 'choice'} key={item} onClick={() => setLipPrecision(item)}>{item}</button>)}</div>
        </OptionSection>
      </>}
      <div className="config-grid"><ConfigBox title="当前模式" value={dubbingMode} /><ConfigBox title="音色 / 数字人" value={isTtsMode ? selectedVoice : selectedDigitalHuman} /><ConfigBox title="自定义音频" value={customAudioName} /><ConfigBox title="面部视频" value={lipFaceVideoName} /></div>
      <div className="config-grid"><ConfigBox title="语音参数" value={`${speechSpeed} / ${speechTone} / ${audioVolume}`} /><ConfigBox title="口型同步精度" value={lipPrecision} /><ConfigBox title="生成状态" value={dubbingStatus} /></div>
    </StepPanel>);
  }

  // --- Step 7: Preview ---
  const previewMaterials = [
    { id: 'clip_01', type: '视频片段', name: selectedPreviewClip, tag: selectedVideoTags.join('、') },
    { id: 'audio_01', type: '配音', name: dubbingMode, tag: dubbingStatus },
    { id: 'visual_01', type: '视觉素材', name: `${selectedVisualAssetIds.length} 个已绑定素材`, tag: visualCategory },
  ];
  const previewStepData = { clip: selectedPreviewClip, isPlaying: isPreviewPlaying, transition: transitionEffect, backgroundMusic, assetFilter, exportResolution, favoriteAssetIds };
  return panel(<StepPanel title="步骤 7：视频预览" intro="时间轴预览、导出视频、分享成片。" actions={<><button className="secondary-button" onClick={() => showToast(`视频分享链接已生成，分辨率：${exportResolution}`)}>分享</button><button className="primary-button" onClick={async () => { const file = await generationApi.exportVideo(); await workflowApi.saveStep({ projectId, step: 'preview', data: previewStepData }); showToast(`${file.fileName} 已按 ${exportResolution} 导出。`); navigate('/projects'); }}>导出 / 发布完成</button></>}>
    <OptionSection title="时间轴预览" subtitle="选择片段后可播放、前移或后移预览焦点">
      <div className="preview-stage"><button onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}>{isPreviewPlaying ? '暂停' : '播放'}</button><span>{selectedPreviewClip} / 总时长 14s</span></div>
      <div className="timeline-strip">{videoShots.map((item) => <button className={selectedPreviewClip === item ? 'active' : ''} key={item} onClick={() => setSelectedPreviewClip(item)}>{item}</button>)}</div>
      <div className="button-strip"><button className="secondary-button" onClick={() => movePreviewClip('previous')}>选中上一个片段</button><button className="secondary-button" onClick={() => movePreviewClip('next')}>选中下一个片段</button><button className="secondary-button" onClick={() => showToast(`${selectedPreviewClip} 已裁剪 0.5 秒。`)}>裁剪当前片段</button></div>
    </OptionSection>
    <OptionSection title="时间轴编辑" subtitle="配置当前片段转场效果">
      <div className="choice-grid four compact-grid">{transitionOptions.map((item) => <button className={transitionEffect === item ? 'choice active' : 'choice'} key={item} onClick={() => setTransitionEffect(item)}>{item}</button>)}</div>
    </OptionSection>
    <OptionSection title="背景音乐" subtitle="选择版权音乐或上传自定义音乐">
      <div className="choice-grid four compact-grid">{musicOptions.map((item) => <button className={backgroundMusic === item ? 'choice active' : 'choice'} key={item} onClick={() => { setBackgroundMusic(item); if (item === '自定义上传') openUpload({ title: '自定义背景音乐', type: 'background-music', accept: '.mp3,.wav,.m4a', hint: '请选择用于成片的背景音乐。' }); }}>{item}</button>)}</div>
    </OptionSection>
    <OptionSection title="素材库管理" subtitle="按标签、镜号和收藏状态筛选项目素材">
      <div className="choice-grid four compact-grid">{assetFilterOptions.map((item) => <button className={assetFilter === item ? 'choice active' : 'choice'} key={item} onClick={() => setAssetFilter(item)}>{item}</button>)}</div>
      <div className="asset-board">{previewMaterials.map((item) => <button className={favoriteAssetIds.includes(item.id) ? 'asset-card selected' : 'asset-card'} key={item.id} onClick={() => toggleFavoriteAsset(item.id)}><span>{item.type}</span><h3>{item.name}</h3><p>{item.tag}</p><strong>{favoriteAssetIds.includes(item.id) ? '已收藏' : '未收藏'}</strong><small>点击切换收藏</small></button>)}</div>
    </OptionSection>
    <OptionSection title="导出设置" subtitle="选择成片导出清晰度">
      <div className="choice-grid three compact-grid">{resolutionOptions.map((item) => <button className={exportResolution === item ? 'choice active' : 'choice'} key={item} onClick={() => setExportResolution(item)}>{item} MP4</button>)}</div>
    </OptionSection>
    <div className="config-grid"><ConfigBox title="当前片段" value={selectedPreviewClip} /><ConfigBox title="转场" value={transitionEffect} /><ConfigBox title="背景音乐" value={backgroundMusic} /><ConfigBox title="导出设置" value={`${exportResolution} / MP4`} /></div>
  </StepPanel>);
});

function StepPanel({ title, intro, children, actions }: { title: string; intro: string; children: ReactNode; actions: ReactNode }) {
  return <section className="step-panel panel"><div className="step-header"><div><span className="eyebrow">Workspace Step</span><h2>{title}</h2><p>{intro}</p></div><div className="step-actions">{actions}</div></div>{children}</section>;
}

function OptionSection({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return <section className="option-section"><div className="option-section-head"><h3>{title}</h3><p>{subtitle}</p></div>{children}</section>;
}

function ConfigBox({ title, value }: { title: string; value: string }) {
  return <article className="config-box"><span>{title}</span><strong>{value}</strong></article>;
}

function FileUploadModal({ modal, onClose, onSubmit }: { modal: UploadModalState; onClose: () => void; onSubmit: (file: File | null) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [template, setTemplate] = useState<ImportTemplateConfig | null>(null);

  useEffect(() => {
    setFile(null);
    setTemplate(null);
    if (modal?.templateCode) {
      templateApi.getImportTemplate(modal.templateCode).then(setTemplate).catch(() => setTemplate(null));
    }
  }, [modal?.title]);

  if (!modal) return null;

  const downloadTemplate = () => {
    if (!template) return;
    const rows = [template.columns, ...template.sampleRows];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = template.fileName || `${template.code}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <span className="eyebrow">File Upload</span>
            <h3>{modal.title}</h3>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <p>{modal.hint}</p>
        {template && (
          <div className="upload-template-card">
            <div>
              <strong>{template.name}</strong>
              <span>{template.instructions}</span>
            </div>
            <button className="secondary-button" onClick={downloadTemplate}>下载模板</button>
          </div>
        )}
        <label className="file-picker">
          <input type="file" accept={modal.accept} onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <strong>{file ? file.name : '点击选择文件'}</strong>
          <span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `支持格式：${modal.accept}`}</span>
        </label>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>取消</button>
          <button className="primary-button" onClick={() => onSubmit(file)}>确认上传</button>
        </div>
      </div>
    </div>
  );
}

function SellingAssetDetailModal({ detail, onClose, onReuse }: { detail: SellingAssetDetail | null; onClose: () => void; onReuse: (asset: SellingAssetDetail) => void }) {
  if (!detail) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card detail-modal">
        <div className="modal-head">
          <div>
            <span className="eyebrow">Selling Asset Detail</span>
            <h3>{detail.name}</h3>
          </div>
          <button onClick={onClose}>×</button>
        </div>
        <div className="detail-meta"><span>{detail.tag}</span><span>{detail.status}</span><span>{detail.updatedAt}</span><span>{detail.count} 条卖点</span></div>
        <section className="detail-section"><h4>主卖点</h4><p>{detail.main || '暂无主卖点'}</p></section>
        <section className="detail-section"><h4>目标人群</h4><p>{detail.targetGroups.length ? detail.targetGroups.join('、') : '暂无目标人群'}</p></section>
        <section className="detail-section"><h4>卖点明细</h4><div className="detail-list">{detail.items.length ? detail.items.map((item) => <article key={item.id}><strong>{item.pointType}</strong><span>{item.content}</span></article>) : <p>暂无明细</p>}</div></section>
        <div className="modal-actions"><button className="secondary-button" onClick={onClose}>关闭</button><button className="primary-button" onClick={() => onReuse(detail)}>复用为主卖点</button></div>
      </div>
    </div>
  );
}

function AssetBoard({ assets, selectedAssetIds, onToggle }: { assets: Asset[]; selectedAssetIds: string[]; onToggle: (asset: Asset) => void }) {
  if (!assets.length) {
    return <div className="asset-empty">当前分类暂无素材，可上传素材或使用 AI 生成候选场景。</div>;
  }
  return <div className="asset-board">{assets.map((asset) => {
    const selected = selectedAssetIds.includes(asset.id);
    return <button className={selected ? 'asset-card selected' : 'asset-card'} key={asset.id} onClick={() => onToggle(asset)}>
      <span>{asset.type}</span>
      <h3>{asset.name}</h3>
      <p>{asset.tag}</p>
      <strong>{selected ? '已绑定' : asset.status}</strong>
      <small>{selected ? '点击取消绑定' : '点击绑定到分镜'}</small>
    </button>;
  })}</div>;
}

function TaskCard({ task }: { task: GenerationTask }) {
  return <div className="task-card"><div><span>{task.status}</span><strong>{task.label}</strong></div><div className="progress-track"><div style={{ width: `${task.progress}%` }} /></div><b>{task.progress}%</b></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}
