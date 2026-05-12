import { useEffect, useState, type ReactNode } from 'react';
import { navigate } from '../../app/router';
import { assetApi } from '../../services/assetApi';
import { generationApi } from '../../services/generationApi';
import { scriptApi } from '../../services/scriptApi';
import { sellingPointApi } from '../../services/sellingPointApi';
import { sourceAnalysisApi } from '../../services/sourceAnalysisApi';
import { workflowApi } from '../../services/workflowApi';
import type { Asset } from '../../types/asset';
import type { GenerationTask } from '../../types/generation';
import type { ProductBriefInput, SellingAsset, SellingAssetDetail } from '../../types/sellingPoint';
import type { SourceAnalysis, OriginalTemplate } from '../../types/source';
import type { StoryboardRow } from '../../types/script';
import type { Toast, UploadModalState } from '../../types/ui';
import { StoryboardTable } from './StoryboardTable';

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

export function StepContent({ step, projectId, onNext, showToast }: { step: string; projectId: string; onNext: () => void; showToast: (message: string, tone?: Toast['tone']) => void }) {
  const [videoRatio, setVideoRatio] = useState('9:16');
  const [videoType, setVideoType] = useState('剧情口播');
  const [platform, setPlatform] = useState('抖音');
  const [productName, setProductName] = useState('宠鲜鲜智能加热饭盒');
  const [brief, setBrief] = useState('宠鲜鲜智能加热饭盒，主打 20 分钟快速加热、分层不串味、通勤便携。');
  const [sellingPoints, setSellingPoints] = useState(['20 分钟快速加热', '分层防串味设计', '通勤包可轻松放下']);
  const [primarySellingPoint, setPrimarySellingPoint] = useState('20 分钟快速加热');
  const [auxiliarySellingPoints, setAuxiliarySellingPoints] = useState(['分层防串味设计', '通勤包可轻松放下']);
  const [newSellingPoint, setNewSellingPoint] = useState('');
  const [targetGroups, setTargetGroups] = useState(['25-35岁女性', '职场白领']);
  const [customTargetGroup, setCustomTargetGroup] = useState('');
  const [otherRequirements, setOtherRequirements] = useState('品牌调性偏真实生活化，不要使用夸张广告词，可参考加班场景。');
  const [sourceMode, setSourceMode] = useState<'viral' | 'original'>('viral');
  const [sourceUrl, setSourceUrl] = useState('https://www.douyin.com/video/7423456789');
  const [scriptName, setScriptName] = useState('宠鲜鲜加热饭盒_职场加班版_v3');
  const [assets, setAssets] = useState<SellingAsset[]>([]);
  const [analysis, setAnalysis] = useState<SourceAnalysis | null>(null);
  const [storyboard, setStoryboard] = useState<StoryboardRow[]>([]);
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
  const [monitorType, setMonitorType] = useState('优惠码监测');
  const [dataSource, setDataSource] = useState('平台汇总');
  const [abVariant, setAbVariant] = useState('A版 强痛点');
  const [reportScope, setReportScope] = useState('单视频');
  const [monitorLink, setMonitorLink] = useState('未生成');

  useEffect(() => {
    sellingPointApi.getSellingAssets().then((data) => setAssets(data));
  }, []);

  useEffect(() => {
    let cancelled = false;
    workflowApi.getStep<ProductBriefInput>(projectId, 'selling-points').then((state) => {
      if (cancelled || !state.data) return;
      const data = state.data;
      if (data.productName) setProductName(data.productName);
      if (data.brief) setBrief(data.brief);
      if (data.sellingPoints?.length) setSellingPoints(data.sellingPoints);
      if (data.primarySellingPoint) setPrimarySellingPoint(data.primarySellingPoint);
      if (data.auxiliarySellingPoints) setAuxiliarySellingPoints(data.auxiliarySellingPoints);
      if (data.targetGroups?.length) setTargetGroups(data.targetGroups);
      if (data.otherRequirements) setOtherRequirements(data.otherRequirements);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

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

  const completeUpload = async (file: File | null) => {
    if (!file || !uploadModal) {
      showToast('请选择文件后再上传。', 'warning');
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

  const generateMonitorLink = () => {
    const link = `https://track.ai-script.local/${projectId}?mode=${encodeURIComponent(monitorType)}&variant=${encodeURIComponent(abVariant)}`;
    setMonitorLink(link);
    showToast('监测链接已生成。');
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

  const saveSellingPointDraft = async () => {
    await workflowApi.saveStep({ projectId, step: 'selling-points', data: sellingPointData });
    showToast('产品卖点草稿已保存。');
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

  if (step === 'global') {
    return panel(<StepPanel title="步骤 1：全局设定" intro="确定视频比例、内容类型和投放平台，为后续生成提供方向。" actions={<button className="primary-button" onClick={() => saveAndNext('global')}>保存并进入产品卖点</button>}>
      <OptionSection title="视频比例" subtitle="影响分镜画面布局和导出尺寸">
        <div className="choice-grid three">
          {[
            ['9:16', '抖音竖版，默认推荐'],
            ['16:9', '横版内容，适合教程类'],
            ['1:1', '图文混合，适配多场景'],
          ].map(([label, note]) => <button className={videoRatio === label ? 'choice active' : 'choice'} key={label} onClick={() => setVideoRatio(label)}><strong>{label}</strong><span>{note}</span></button>)}
        </div>
      </OptionSection>
      <OptionSection title="视频类型" subtitle="决定脚本文风和镜头节奏">
        <div className="choice-grid five">
          {['剧情口播', '产品展示', '教程干货', '情感共鸣', '其他'].map((item) => <button className={videoType === item ? 'choice active' : 'choice'} key={item} onClick={() => setVideoType(item)}>{item}</button>)}
        </div>
      </OptionSection>
      <OptionSection title="投放平台" subtitle="适配平台节奏、合规和内容表达">
        <div className="choice-grid four">
          {[
            ['抖音', '重节奏、强前 3 秒吸引'],
            ['小红书', '重场景、重种草表达'],
            ['视频号', '重信任感与转化链路'],
            ['快手', '重真实感与生活化表达'],
          ].map(([label, note]) => <button className={platform === label ? 'choice active' : 'choice'} key={label} onClick={() => setPlatform(label)}><strong>{label}</strong><span>{note}</span></button>)}
        </div>
      </OptionSection>
      <div className="summary-grid">
        <Metric label="视频比例" value={videoRatio} />
        <Metric label="视频类型" value={videoType} />
        <Metric label="投放平台" value={platform} />
      </div>
    </StepPanel>);
  }

  if (step === 'selling-points') {
    const targetOptions = ['25-35岁女性', '职场白领', '通勤上班族', '精致妈妈', '学生党', '晚归加班人群'];
    const visibleTargetGroups = [...targetOptions, ...targetGroups.filter((group) => !targetOptions.includes(group))];
    return panel(<StepPanel title="步骤 2：产品卖点" intro="支持模板上传、卖点资产库复用和 AI 优化 Brief。" actions={<><button className="secondary-button" onClick={saveSellingPointDraft}>保存草稿</button><button className="secondary-button" onClick={async () => { const result = await sellingPointApi.optimizeBrief(sellingPointData); setBrief(result.summary); showToast('AI Brief 已优化，可继续手动修订。'); }}>AI 优化 Brief</button><button className="primary-button" onClick={() => saveAndNext('selling-points', sellingPointData)}>保存并进入内容来源</button></>}>
      <div className="two-column">
        <OptionSection title="模板上传" subtitle="支持 xlsx / csv 标准产品卖点模板">
          <button className="upload-zone" onClick={() => openUpload({ title: '产品卖点模板', type: 'selling-point-template', accept: '.xlsx,.xls,.csv', hint: '请选择包含产品名称、卖点、人群、补充要求的 xlsx/csv 文件。' })}>选择文件上传产品卖点模板</button>
        </OptionSection>
        <OptionSection title="产品名称" subtitle="用于脚本标题、下载文件名和素材归档">
          <input value={productName} onChange={(event) => { setProductName(event.target.value); setBrief(buildSellingBrief(event.target.value)); }} />
        </OptionSection>
      </div>
      <OptionSection title="产品特色卖点" subtitle="可区分主卖点和辅助卖点">
        <textarea value={brief} onChange={(event) => setBrief(event.target.value)} />
        <div className="inline-form compact-inline">
          <input value={newSellingPoint} onChange={(event) => setNewSellingPoint(event.target.value)} placeholder="新增卖点，如：低噪音加热不打扰同事" />
          <button onClick={addSellingPoint}>添加卖点</button>
        </div>
        <div className="choice-grid three compact-grid">
          {sellingPoints.map((item) => {
            const isPrimary = primarySellingPoint === item;
            const isAuxiliary = auxiliarySellingPoints.includes(item);
            return <article className={isPrimary || isAuxiliary ? 'selling-point-card active' : 'selling-point-card'} key={item}>
              <div className="selling-card-head"><strong>{isPrimary ? '主卖点' : isAuxiliary ? '辅助卖点' : '待选择'}</strong><span>{item}</span></div>
              <div className="selling-card-actions">
                <button onClick={() => setAsPrimaryPoint(item)} disabled={isPrimary}>设为主卖点</button>
                <button onClick={() => toggleAuxiliaryPoint(item)} disabled={isPrimary}>{isAuxiliary ? '移出辅助' : '加入辅助'}</button>
                <button onClick={() => removeSellingPoint(item)}>删除</button>
              </div>
            </article>;
          })}
        </div>
      </OptionSection>
      <OptionSection title="目标用户人群" subtitle="可多选，用于内容场景和话术定位">
        <div className="choice-grid six compact-grid">
          {visibleTargetGroups.map((item) => <button className={targetGroups.includes(item) ? 'choice active' : 'choice'} key={item} onClick={() => toggleTargetGroup(item)}>{item}</button>)}
        </div>
        <div className="inline-form compact-inline">
          <input value={customTargetGroup} onChange={(event) => setCustomTargetGroup(event.target.value)} placeholder="自定义人群，如：经常出差的销售" />
          <button onClick={addTargetGroup}>添加人群</button>
        </div>
      </OptionSection>
      <OptionSection title="其他要求" subtitle="品牌调性、禁忌词、参考素材等补充说明">
        <textarea value={otherRequirements} onChange={(event) => { setOtherRequirements(event.target.value); setBrief(buildSellingBrief(productName, primarySellingPoint, auxiliarySellingPoints, targetGroups, event.target.value)); }} />
      </OptionSection>
      <OptionSection title="产品卖点资产库" subtitle="从历史已审核卖点和行业场景包中复用">
      <div className="asset-row">
        {assets.map((asset) => <article className="asset-card" key={asset.id}><span>{asset.tag}</span><h3>{asset.name}</h3><p>{asset.main}</p><strong>{asset.count} 条卖点</strong><div className="button-strip"><button className="secondary-button" onClick={() => openSellingAssetDetail(asset)}>查看详情</button><button className="primary-button" onClick={() => reuseSellingAssetFromList(asset)}>复用为主卖点</button></div></article>)}
        {assets.length === 0 ? <p>暂无可复用卖点资产，请先到“我的资产库”上传或由后台导入。</p> : null}
      </div>
      </OptionSection>
    </StepPanel>);
  }

  if (step === 'source') {
    return panel(<StepPanel title="步骤 3：爆款链接 / 原创" intro="爆款链接解析结果可手动修订，原创模式可选择模板库脚本。" actions={<><button className="secondary-button" onClick={() => showToast('内容来源草稿已保存。')}>保存草稿</button><button className="primary-button" onClick={() => saveAndNext('source', analysis)}>确认分析结果</button></>}>
      <div className="mode-tabs">
        <button className={sourceMode === 'viral' ? 'active' : ''} onClick={() => setSourceMode('viral')}>爆款复刻（推荐）</button>
        <button className={sourceMode === 'original' ? 'active' : ''} onClick={() => setSourceMode('original')}>原创模式</button>
      </div>
      {sourceMode === 'viral' ? <>
        <OptionSection title="输入爆款链接" subtitle="支持抖音、小红书视频链接，可解析文案、互动数据和结构公式">
          <div className="inline-form"><input placeholder="粘贴抖音 / 小红书链接" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} /><button onClick={async () => { const data = await sourceAnalysisApi.parseSourceLink(sourceUrl); setAnalysis(data); showToast('链接解析完成。'); }}>开始解析</button></div>
        </OptionSection>
        <OptionSection title="爆款分析手动修订" subtitle="解析结果可人工修改后再确认，避免数据缺失或结构判断偏差">
          <textarea defaultValue="3 秒强痛点开头 + 场景化放大 + 产品方案 + 效果展示 + 限时优惠；第 2 镜需强化 20 分钟快速加热。" />
          <div className="choice-grid three compact-grid">{['完整文案', '结构公式', '分镜报告'].map((item) => <button className="choice" key={item} onClick={() => showToast(`${item}已进入可编辑状态。`)}>修改{item}</button>)}</div>
        </OptionSection>
        {analysis && <div className="analysis-card"><h3>{analysis.title}</h3><p>{analysis.metrics}</p><strong>{analysis.structure}</strong>{analysis.report.map((line) => <span key={line}>{line}</span>)}</div>}
      </> : <>
        <OptionSection title="自定义结构公式" subtitle="适合已有成功脚本框架或品牌固定表达">
          <textarea defaultValue="3秒强痛点开头 + 场景化问题放大 + 产品方案 + 使用效果 + 评论区引导" />
          <button className="secondary-button" onClick={() => openUpload({ title: '原创参考文案', type: 'original-reference', accept: '.txt,.doc,.docx,.pdf', hint: '请选择已有脚本、参考文案或品牌内容说明。' })}>上传参考文案</button>
        </OptionSection>
        <OptionSection title="原创爆款模板库脚本" subtitle="选择结构模板后继续编辑，避免直接套用">
          <TemplateStrip />
        </OptionSection>
      </>}
    </StepPanel>);
  }

  if (step === 'storyboard') {
    return panel(<StepPanel title="步骤 4：分镜脚本生成与审核" intro="支持脚本命名、在线编辑、合规检测、原创度、下载与分享。" actions={<><button className="secondary-button" onClick={async () => { const data = await scriptApi.runCompliance(); showToast(`${data.suggestion} 原创度 ${data.similarity}`, 'warning'); }}>运行合规检查</button><button className="primary-button" onClick={async () => { await scriptApi.submitAudit(); showToast('脚本已提交审核。'); onNext(); }}>提交审核</button></>}>
      <div className="inline-form"><input value={scriptName} onChange={(event) => setScriptName(event.target.value)} /><button onClick={async () => { const data = await scriptApi.generateStoryboard(); setStoryboard(data); showToast('分镜脚本已生成。'); }}>生成脚本</button></div>
      <div className="status-grid">
        <Metric label="脚本状态" value="待审核" />
        <Metric label="合规检查" value="1 处风险" />
        <Metric label="原创度" value="38%" />
      </div>
      <StoryboardTable rows={storyboard} />
      <div className="button-strip"><button className="secondary-button" onClick={() => showToast('脚本草稿已保存。')}>保存草稿</button><button className="secondary-button" onClick={async () => { const result = await scriptApi.downloadScript(scriptName); showToast(`${result.fileName} 已生成下载任务。`); }}>下载脚本</button><button className="secondary-button" onClick={async () => { const result = await scriptApi.shareScript(scriptName); showToast(`分享链接已生成：${result.url}`); }}>分享脚本</button><button className="secondary-button" onClick={async () => { const data = await scriptApi.generateStoryboard(); setStoryboard(data); showToast('已按当前修改意见重新生成脚本。'); }}>重新生成</button></div>
    </StepPanel>);
  }

  if (step === 'visual') {
    const filteredVisualAssets = visualCategory === '全部' ? visualAssets : visualAssets.filter((asset) => asset.type === visualCategory);
    const selectedVisualAssets = visualAssets.filter((asset) => selectedVisualAssetIds.includes(asset.id));
    const visualStepData = { visualCategory, selectedAssetIds: selectedVisualAssetIds, selectedAssets: selectedVisualAssets, assets: visualAssets };
    return panel(<StepPanel title="步骤 5：场景、角色、道具" intro="为每个分镜绑定场景、角色、道具和风格参考图。" actions={<><button className="secondary-button" onClick={() => openUpload({ title: '风格参考图', type: 'style-reference', accept: '.png,.jpg,.jpeg,.webp', hint: '请选择场景风格图、人物参考图或产品参考图。' })}>上传素材</button><button className="secondary-button" onClick={generateVisualScene}>AI 生成场景</button><button className="primary-button" onClick={() => saveAndNext('visual', visualStepData)}>完成配置</button></>}>
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

  if (step === 'video') {
    const videoStepData = { scope: videoScope, selectedShot: selectedVideoShot, tags: selectedVideoTags, task };
    return panel(<StepPanel title="步骤 6：分镜视频生成" intro="按分镜生成视频片段，展示任务进度和失败重试状态。" actions={<><button className="secondary-button" onClick={startVideoGeneration}>开始生成</button><button className="primary-button" onClick={() => saveAndNext('video', videoStepData)}>全部生成完成</button></>}>
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

  if (step === 'dubbing') {
    const isTtsMode = dubbingMode === 'TTS 旁白模式';
    const dubbingStepData = { mode: dubbingMode, voice: selectedVoice, speed: speechSpeed, tone: speechTone, volume: audioVolume, customAudioName, digitalHuman: selectedDigitalHuman, lipPrecision, lipFaceVideoName, status: dubbingStatus };
    return panel(<StepPanel title="步骤 7：配音与对口型" intro="选择音色、上传音频或生成 TTS，并配置口型同步。" actions={<><button className="secondary-button" onClick={() => openUpload(isTtsMode ? { title: '自定义音频', type: 'custom-audio', accept: '.mp3,.wav,.m4a', hint: '请选择旁白音频或角色台词音频。' } : { title: '模特面部视频', type: 'lip-face-video', accept: '.mp4,.mov,.webm', hint: '请选择模特面部视频，用于对口型同步。' })}>{isTtsMode ? '上传音频' : '上传面部视频'}</button><button className="secondary-button" onClick={generateDubbing}>{isTtsMode ? 'AI 生成配音' : 'AI 生成对口型'}</button><button className="primary-button" onClick={() => saveAndNext('dubbing', dubbingStepData)}>音频配置完成</button></>}>
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

  if (step === 'preview') {
    const previewMaterials = [
      { id: 'clip_01', type: '视频片段', name: selectedPreviewClip, tag: selectedVideoTags.join('、') },
      { id: 'audio_01', type: '配音', name: dubbingMode, tag: dubbingStatus },
      { id: 'visual_01', type: '视觉素材', name: `${selectedVisualAssetIds.length} 个已绑定素材`, tag: visualCategory },
    ];
    const filteredPreviewMaterials = previewMaterials.filter((item) => {
      if (assetFilter === '全部') return true;
      if (assetFilter === '已收藏') return favoriteAssetIds.includes(item.id);
      return item.tag.includes(assetFilter) || item.name.includes(assetFilter);
    });
    const previewStepData = { clip: selectedPreviewClip, isPlaying: isPreviewPlaying, transition: transitionEffect, backgroundMusic, assetFilter, exportResolution, favoriteAssetIds };
    return panel(<StepPanel title="步骤 8：视频预览与素材管理" intro="时间轴预览、导出视频、分享成片。" actions={<><button className="secondary-button" onClick={() => showToast(`视频分享链接已生成，分辨率：${exportResolution}`)}>分享</button><button className="primary-button" onClick={async () => { const file = await generationApi.exportVideo(); await workflowApi.saveStep({ projectId, step: 'preview', data: previewStepData }); showToast(`${file.fileName} 已按 ${exportResolution} 导出。`); onNext(); }}>导出 / 发布完成</button></>}>
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
        <div className="asset-board">{filteredPreviewMaterials.map((item) => <button className={favoriteAssetIds.includes(item.id) ? 'asset-card selected' : 'asset-card'} key={item.id} onClick={() => toggleFavoriteAsset(item.id)}><span>{item.type}</span><h3>{item.name}</h3><p>{item.tag}</p><strong>{favoriteAssetIds.includes(item.id) ? '已收藏' : '未收藏'}</strong><small>点击切换收藏</small></button>)}</div>
      </OptionSection>
      <OptionSection title="导出设置" subtitle="选择成片导出清晰度">
        <div className="choice-grid three compact-grid">{resolutionOptions.map((item) => <button className={exportResolution === item ? 'choice active' : 'choice'} key={item} onClick={() => setExportResolution(item)}>{item} MP4</button>)}</div>
      </OptionSection>
      <div className="config-grid"><ConfigBox title="当前片段" value={selectedPreviewClip} /><ConfigBox title="转场" value={transitionEffect} /><ConfigBox title="背景音乐" value={backgroundMusic} /><ConfigBox title="导出设置" value={`${exportResolution} / MP4`} /></div>
    </StepPanel>);
  }

  const analyticsStepData = { monitorType, dataSource, abVariant, reportScope, monitorLink };
  const analyticsMetrics = dataSource === '抖音回传'
    ? { views: '18.4 万', rate: '9.1%', orders: '426' }
    : dataSource === '视频号回传'
      ? { views: '7.8 万', rate: '6.9%', orders: '182' }
      : { views: '12.6 万', rate: '8.4%', orders: '328' };
  return panel(<StepPanel title="步骤 9：投放数据" intro="MVP 阶段先展示占位数据，后续接入平台回传和 A/B 测试。" actions={<><button className="secondary-button" onClick={async () => { await workflowApi.saveStep({ projectId, step: 'analytics', data: analyticsStepData }); showToast(`分析报告导出任务已创建：${reportScope}`); }}>导出报告</button><button className="primary-button" onClick={async () => { await workflowApi.saveStep({ projectId, step: 'analytics', data: analyticsStepData }); navigate('/projects'); }}>完成并返回首页</button></>}>
    <OptionSection title="监测链接生成" subtitle="选择链接植入方式后生成投放监测地址">
      <div className="choice-grid three compact-grid">{monitorTypeOptions.map((item) => <button className={monitorType === item ? 'choice active' : 'choice'} key={item} onClick={() => setMonitorType(item)}>{item}</button>)}</div>
      <div className="button-strip"><button className="secondary-button" onClick={generateMonitorLink}>生成监测链接</button><button className="secondary-button" onClick={() => showToast(`已复制监测链接：${monitorLink}`)}>复制链接</button></div>
    </OptionSection>
    <OptionSection title="数据回传来源" subtitle="切换平台来源后，指标卡会按当前来源展示回传数据">
      <div className="choice-grid three compact-grid">{dataSourceOptions.map((item) => <button className={dataSource === item ? 'choice active' : 'choice'} key={item} onClick={() => setDataSource(item)}>{item}</button>)}</div>
    </OptionSection>
    <OptionSection title="A/B 测试版本" subtitle="选择当前查看的脚本投放版本">
      <div className="choice-grid three compact-grid">{abVariantOptions.map((item) => <button className={abVariant === item ? 'choice active' : 'choice'} key={item} onClick={() => setAbVariant(item)}>{item}</button>)}</div>
    </OptionSection>
    <OptionSection title="报表范围" subtitle="控制导出的数据报表粒度">
      <div className="choice-grid three compact-grid">{reportScopeOptions.map((item) => <button className={reportScope === item ? 'choice active' : 'choice'} key={item} onClick={() => setReportScope(item)}>{item}</button>)}</div>
    </OptionSection>
    <div className="metric-grid"><Metric label="播放量" value={analyticsMetrics.views} /><Metric label="互动率" value={analyticsMetrics.rate} /><Metric label="转化订单" value={analyticsMetrics.orders} /></div>
    <div className="config-grid"><ConfigBox title="监测链接" value={monitorLink} /><ConfigBox title="数据回传" value={dataSource} /><ConfigBox title="A/B 测试" value={abVariant} /><ConfigBox title="报表导出" value={reportScope} /></div>
  </StepPanel>);
}

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

  useEffect(() => {
    setFile(null);
  }, [modal?.title]);

  if (!modal) return null;

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

function TemplateStrip() {
  const [templates, setTemplates] = useState<OriginalTemplate[]>([]);
  useEffect(() => { sourceAnalysisApi.getOriginalTemplates().then((data) => setTemplates(data)); }, []);
  return <div className="template-strip">{templates.map((template) => <button key={template.id}><strong>{template.name}</strong><span>{template.structure}</span></button>)}</div>;
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
