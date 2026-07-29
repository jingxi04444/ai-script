import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { message } from 'antd';
import {
  LeftOutlined,
  EditOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PlusCircleOutlined,
  FileExcelOutlined,
  SaveOutlined,
  CrownOutlined,
  FileTextOutlined,
  HighlightOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import HomeRail from '../../components/Layout/HomeRail';
import MemberPaymentDialog from '../../components/Modal/MemberPaymentDialog';
import RechargeDialog from '../../components/Modal/RechargeDialog';
import BriefDialog from '../../components/Modal/BriefDialog';
import BriefDetectionDialog from '../../components/Modal/BriefDetectionDialog';
import UploadDialog from '../../components/Modal/UploadDialog';
import { projectApi } from '../../api/project';
import { siteApi } from '../../api/site';
import { useWorkspaceStore, steps, type ScriptMode, type StepKey } from '../../stores/workspaceStore';
import SellingPointsPanel from './SellingPoints/SellingPointsPanel';
import type { SellingPointsPanelRef } from './SellingPoints/SellingPointsPanel';
import type { Brief } from '../../types/brief';
import ScriptGeneratorPanel from './ScriptGenerator/ScriptGeneratorPanel';
import StoryboardPanel from './Storyboard/StoryboardPanel';
import AssetsPanel from './Assets/AssetsPanel';
import ProductionPanel from './Production/ProductionPanel';
import DeliveryPanel from './Delivery/DeliveryPanel';
import './workspace-page.css';

const isWorkspaceStep = (value: string | null): value is StepKey => !!value && steps.some((step) => step.id === value);
const isScriptMode = (value: string | null): value is ScriptMode => value === 'viral' || value === 'template' || value === 'original' || value === 'mine' || value === 'product' || value === 'product-dimension';

interface ScriptModeVisual {
  key: ScriptMode;
  headerLabel?: string;
  iconUrl?: string;
}

const WorkspacePage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    projectId,
    setProject,
    activeStep,
    setActiveStep,
    setScriptMode,
    projectTitle,
    setProjectTitle,
    isEditingTitle,
    setIsEditingTitle,
    isStepsCollapsed,
    toggleStepsCollapsed,
    goNext,
    reset,
  } = useWorkspaceStore();

  const [titleDraft, setTitleDraft] = useState(projectTitle);
  const [productName, setProductName] = useState('');
  const [commerceDialog, setCommerceDialog] = useState<'member' | 'recharge' | null>(null);
  const [briefDialog, setBriefDialog] = useState(false);
  const [briefDetectionBrief, setBriefDetectionBrief] = useState<Brief | null>(null);
  const [uploadDialog, setUploadDialog] = useState(false);
  const [briefRefreshKey, setBriefRefreshKey] = useState(0);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [scriptModeVisuals, setScriptModeVisuals] = useState<ScriptModeVisual[]>([]);
  const sellingPointsRef = useRef<SellingPointsPanelRef>(null);
  const isSavingTitleRef = useRef(false);
  const activeIndex = steps.findIndex((s) => s.id === activeStep);
  const activeStepInfo = steps[activeIndex];
  const scriptModeParam = searchParams.get('scriptMode');
  const activeScriptMode = isScriptMode(scriptModeParam) ? scriptModeParam : null;
  const requestedBriefId = searchParams.get('briefId');
  const briefOrigin = searchParams.get('briefOrigin');
  const assetBriefProjectId = searchParams.get('assetProjectId');
  const currentProjectId = searchParams.get('projectId') || projectId;
  const isAssetBriefDetail = briefOrigin === 'assets'
    && searchParams.get('briefDialog') === '1'
    && !!requestedBriefId;
  const workspaceMainClass = [
    'workspace-main',
    activeStep === 'script-generator' ? 'script-workspace-main' : '',
    activeStep === 'selling-points' ? 'selling-workspace-main' : '',
    activeStep === 'storyboard' ? 'storyboard-workspace-main' : '',
  ].filter(Boolean).join(' ');
  const activeScriptModeVisual = scriptModeVisuals.find((item) => item.key === activeScriptMode);

  useEffect(() => {
    siteApi.getConfig().then((config) => {
      if (!config.scriptVisualConfig?.trim()) return;
      try {
        const parsed = JSON.parse(config.scriptVisualConfig) as { modeItems?: ScriptModeVisual[] };
        setScriptModeVisuals(Array.isArray(parsed.modeItems) ? parsed.modeItems : []);
      } catch {
        setScriptModeVisuals([]);
      }
    }).catch(() => setScriptModeVisuals([]));
  }, []);
  const saveProjectTitle = async () => {
    if (isSavingTitleRef.current) return;
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      setTitleDraft(projectTitle);
      setIsEditingTitle(false);
      return;
    }
    if (nextTitle === projectTitle) {
      setIsEditingTitle(false);
      return;
    }
    setProjectTitle(nextTitle);
    setIsEditingTitle(false);
    if (!projectId) return;

    isSavingTitleRef.current = true;
    setIsSavingTitle(true);
    try {
      const updated = await projectApi.update(projectId, { name: nextTitle });
      setProject({ id: updated.id, title: updated.name });
      setTitleDraft(updated.name);
      message.success('项目名称已保存');
    } catch {
      setProjectTitle(projectTitle);
      setTitleDraft(projectTitle);
      message.error('项目名称保存失败');
    } finally {
      isSavingTitleRef.current = false;
      setIsSavingTitle(false);
    }
  };

  const handleStepChange = (step: StepKey) => {
    setActiveStep(step);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('step', step);
    if (projectId) nextParams.set('projectId', projectId);
    setSearchParams(nextParams, { replace: true });
  };

  const handleBackToScriptPicker = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('step', 'script-generator');
    nextParams.delete('scriptMode');
    nextParams.delete('editScriptId');
    if (projectId) nextParams.set('projectId', projectId);
    setSearchParams(nextParams, { replace: true });
    setActiveStep('script-generator');
  };

  const handleNextStep = () => {
    const nextStep = steps[activeIndex + 1];
    if (nextStep) handleStepChange(nextStep.id);
    else goNext();
  };

  useEffect(() => {
    if (isAssetBriefDetail) return;
    const id = searchParams.get('projectId');
    if (!id) {
      if (projectId) {
        reset();
        setTitleDraft('未命名项目');
        setProductName('');
      }
      return;
    }
    if (!id || id === projectId) return;
    projectApi.getById(id).then((project) => {
      setProject({ id: project.id, title: project.name });
      setTitleDraft(project.name);
    }).catch(() => message.warning('项目详情加载失败'));
  }, [isAssetBriefDetail, projectId, reset, searchParams, setProject]);

  useEffect(() => {
    const step = searchParams.get('step');
    if (isWorkspaceStep(step) && step !== activeStep) {
      setActiveStep(step);
    }
  }, [activeStep, searchParams, setActiveStep]);

  useEffect(() => {
    if (searchParams.get('briefDialog') === '1' && searchParams.get('step') === 'selling-points') {
      setBriefDialog(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!activeScriptMode) return;
    setScriptMode(activeScriptMode);
  }, [activeScriptMode, setScriptMode]);

  const ensureProjectId = async (fallbackTitle?: string) => {
    if (projectId) return projectId;
    const nextTitle = projectTitle.trim() && projectTitle.trim() !== '未命名项目'
      ? projectTitle.trim()
      : fallbackTitle?.trim();
    if (!nextTitle || nextTitle === '未命名项目') {
      throw new Error('请先填写项目名称');
    }
    const created = await projectApi.create({
      name: nextTitle,
      category: '产品介绍',
      status: 'active',
    });
    setProject({ id: created.id, title: created.name });
    setTitleDraft(created.name);
    setSearchParams({ projectId: created.id, step: activeStep }, { replace: true });
    return created.id;
  };

  const ensureNamedProjectId = async () => {
    const nextTitle = projectTitle.trim();
    if (!nextTitle || nextTitle === '未命名项目') {
      throw new Error('请先填写项目名称，再导入卖点');
    }
    if (projectId) return projectId;
    return ensureProjectId();
  };

  const returnToAssetBriefs = () => {
    const returnProjectId = assetBriefProjectId || currentProjectId;
    navigate(returnProjectId
      ? `/assets?briefProjectId=${encodeURIComponent(returnProjectId)}`
      : '/assets');
  };

  const renderPanel = () => {
    switch (activeStep) {
      case 'selling-points':
        return <SellingPointsPanel ref={sellingPointsRef} projectId={projectId} productName={productName} ensureProjectId={ensureProjectId} onBriefDetect={(currentBrief) => setBriefDetectionBrief(currentBrief)} onUpload={() => setUploadDialog(true)} onProductNameLoaded={setProductName} />;
      case 'script-generator':
        return <ScriptGeneratorPanel projectId={projectId} ensureProjectId={ensureProjectId} />;
      case 'storyboard':
        return <StoryboardPanel projectId={projectId} onPolishScript={(mode, scriptId) => {
          setScriptMode(mode);
          const nextParams = new URLSearchParams(searchParams);
          nextParams.set('step', 'script-generator');
          nextParams.set('scriptMode', mode);
          nextParams.set('editScriptId', scriptId);
          if (projectId) nextParams.set('projectId', projectId);
          setSearchParams(nextParams, { replace: true });
          setActiveStep('script-generator');
        }} />;
      case 'visual':
        return <AssetsPanel projectId={projectId} ensureProjectId={ensureProjectId} />;
      case 'video':
        return <ProductionPanel projectId={projectId} ensureProjectId={ensureProjectId} />;
      case 'preview':
        return <DeliveryPanel projectId={projectId} ensureProjectId={ensureProjectId} />;
      default:
        return (
          <div className="generic-step">
            <div>
              <h2>{activeStepInfo?.name}</h2>
              <p>{activeStepInfo?.desc}</p>
            </div>
          </div>
        );
    }
  };

  if (isAssetBriefDetail) {
    return (
      <BriefDialog
        projectId={currentProjectId}
        ensureProjectId={ensureProjectId}
        initialBriefId={requestedBriefId}
        onBack={returnToAssetBriefs}
        refreshKey={briefRefreshKey}
        onClose={returnToAssetBriefs}
      />
    );
  }

  return (
    <main className={isStepsCollapsed ? 'workspace-shell steps-collapsed' : 'workspace-shell'}>
      <HomeRail
        activeLabel="制作大片"
        onCreate={() => {
          reset();
          setProductName('');
          setTitleDraft('未命名项目');
          navigate('/workspace?step=selling-points');
        }}
        onHome={() => navigate('/home')}
        onProjects={() => navigate('/projects')}
        onAssets={() => navigate('/assets')}
        onMember={() => setCommerceDialog('member')}
        onRecharge={() => setCommerceDialog('recharge')}
      />

      <aside className="workspace-sidebar">
        <header className="project-step-head">
          <button className="project-back" aria-label="返回" onClick={() => navigate('/home')}>
            <LeftOutlined />
          </button>
          {isEditingTitle ? (
            <input
              className="project-title-inline-input"
              value={titleDraft}
              autoFocus
              disabled={isSavingTitle}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => { void saveProjectTitle(); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void saveProjectTitle();
                if (e.key === 'Escape') {
                  setTitleDraft(projectTitle);
                  setIsEditingTitle(false);
                }
              }}
            />
          ) : (
            <>
              <span className="project-title-text">{projectTitle}</span>
              <button
                className="project-title-edit-button"
                aria-label="编辑项目名称"
                onClick={() => {
                  setTitleDraft(projectTitle);
                  setIsEditingTitle(true);
                }}
              >
                <EditOutlined />
              </button>
            </>
          )}
        </header>
        <nav aria-label="脚本生成步骤">
          {steps.map((step, index) => (
            <button
              key={step.id}
              className={step.id === activeStep ? 'active' : index < activeIndex ? 'done' : ''}
              onClick={() => handleStepChange(step.id)}
            >
              <span>{index + 1}</span>
              <strong>{step.name}</strong>
              <i>{index < activeIndex ? <CheckCircleOutlined /> : <InfoCircleOutlined />}</i>
            </button>
          ))}
        </nav>
      </aside>

      <section className={workspaceMainClass}>
        <button
          className={isStepsCollapsed ? 'step-collapse-toggle collapsed' : 'step-collapse-toggle'}
          aria-label={isStepsCollapsed ? '展开重点步骤' : '收缩重点步骤'}
          onClick={toggleStepsCollapsed}
        >
          {isStepsCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </button>

        <div className="creation-topbar">
          {activeStep === 'selling-points' && (
            <>
              <input aria-label="产品名称" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="请输入产品名称" />
              <button className="brief-top-button" onClick={() => setBriefDialog(true)}>
                <PlusCircleOutlined />Brief
              </button>
              <button className="outline-action-button" onClick={() => setUploadDialog(true)}>
                <FileExcelOutlined />上传卖点
              </button>
              <button className="outline-action-button green" onClick={() => sellingPointsRef.current?.save()}>
                <SaveOutlined />保存
              </button>
            </>
          )}
          {activeStep === 'script-generator' && (
            <>
              {activeScriptMode ? (
                <div className="script-mode-nav script-mode-nav-single" aria-label="当前创作方式">
                  {activeScriptMode === 'viral' && <button className="active" type="button">{activeScriptModeVisual?.iconUrl ? <img src={activeScriptModeVisual.iconUrl} alt="" /> : <CrownOutlined />}<span>{activeScriptModeVisual?.headerLabel || '爆款复刻'}</span></button>}
                  {activeScriptMode === 'template' && <button className="active" type="button">{activeScriptModeVisual?.iconUrl ? <img src={activeScriptModeVisual.iconUrl} alt="" /> : <FileTextOutlined />}<span>{activeScriptModeVisual?.headerLabel || '脚本模板库'}</span></button>}
                  {activeScriptMode === 'original' && <button className="active" type="button">{activeScriptModeVisual?.iconUrl ? <img src={activeScriptModeVisual.iconUrl} alt="" /> : <HighlightOutlined />}<span>{activeScriptModeVisual?.headerLabel || 'AI原创'}</span></button>}
                  {activeScriptMode === 'mine' && <button className="active" type="button">{activeScriptModeVisual?.iconUrl ? <img src={activeScriptModeVisual.iconUrl} alt="" /> : <FolderOutlined />}<span>{activeScriptModeVisual?.headerLabel || '我的模板库'}</span></button>}
                  {(activeScriptMode === 'product' || activeScriptMode === 'product-dimension') && <button className="active" type="button"><FileTextOutlined /><span>产品维度脚本</span></button>}
                </div>
              ) : (
                <div className="script-mode-entry-tip">请选择一种创作方式，开始进入脚本生成</div>
              )}
              {activeScriptMode && (
                <button className="outline-action-button script-picker-back-button" onClick={handleBackToScriptPicker}>
                  <LeftOutlined />返回选择页
                </button>
              )}
            </>
          )}
          {activeStep === 'storyboard' && (
            <button className="outline-action-button" onClick={() => { setScriptMode('original'); handleStepChange('script-generator'); message.success('已进入 AI原创，可新增脚本'); }}>
              <PlusCircleOutlined />新增脚本
            </button>
          )}
          <button className="next-step-button" onClick={handleNextStep}>
            下一步：{steps[activeIndex + 1]?.name || '完成'}
            {(activeStep === 'script-generator' || activeStep === 'storyboard') && <span>›</span>}
          </button>
        </div>

        <main className="workbench-card step-panel creation-panel workspace-step-panel">
          {renderPanel()}
        </main>
      </section>

      {briefDialog && (
        <BriefDialog
          projectId={currentProjectId}
          ensureProjectId={ensureProjectId}
          initialBriefId={requestedBriefId}
          onBack={briefOrigin === 'assets' ? returnToAssetBriefs : undefined}
          onNewProductDraft={() => {
            sellingPointsRef.current?.resetDraft();
            setProductName('');
          }}
          onApplyBrief={(brief) => {
            sellingPointsRef.current?.loadBrief(brief);
            setProductName(brief.productName || brief.name || '');
          }}
          refreshKey={briefRefreshKey}
          onClose={() => {
            setBriefDialog(false);
            if (searchParams.has('briefDialog') || searchParams.has('briefId')) {
              const nextParams = new URLSearchParams(searchParams);
              nextParams.delete('briefDialog');
              nextParams.delete('briefId');
              nextParams.delete('briefOrigin');
              nextParams.delete('assetProjectId');
              setSearchParams(nextParams, { replace: true });
            }
          }}
        />
      )}
      {briefDetectionBrief && (
        <BriefDetectionDialog
          brief={briefDetectionBrief}
          onClose={() => setBriefDetectionBrief(null)}
          onApplyOptimized={async (patch) => {
            await sellingPointsRef.current?.applyBriefPatch(patch);
            setBriefDetectionBrief(null);
          }}
        />
      )}
      {uploadDialog && (
        <UploadDialog
          ensureProjectId={ensureNamedProjectId}
          onClose={() => setUploadDialog(false)}
          onImported={(briefs) => {
            const firstBrief = briefs[0];
            setBriefRefreshKey((key) => key + 1);
            if (firstBrief) {
              sellingPointsRef.current?.loadBrief(firstBrief);
              setProductName(firstBrief.productName || firstBrief.name || '');
            }
          }}
        />
      )}
      {commerceDialog === 'member' && (
        <MemberPaymentDialog
          onClose={() => setCommerceDialog(null)}
          onRecharge={() => setCommerceDialog('recharge')}
        />
      )}
      {commerceDialog === 'recharge' && (
        <RechargeDialog onClose={() => setCommerceDialog(null)} />
      )}
    </main>
  );
};

export default WorkspacePage;
