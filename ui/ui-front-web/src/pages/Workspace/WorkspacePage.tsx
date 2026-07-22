import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleOutlined,
} from '@ant-design/icons';
import HomeRail from '../../components/Layout/HomeRail';
import MemberPaymentDialog from '../../components/Modal/MemberPaymentDialog';
import RechargeDialog from '../../components/Modal/RechargeDialog';
import BriefDialog from '../../components/Modal/BriefDialog';
import UploadDialog from '../../components/Modal/UploadDialog';
import { useWorkspaceStore, steps, type StepKey } from '../../stores/workspaceStore';
import SellingPointsPanel from './SellingPoints/SellingPointsPanel';
import ScriptGeneratorPanel from './ScriptGenerator/ScriptGeneratorPanel';
import StoryboardPanel from './Storyboard/StoryboardPanel';

const WorkspacePage = () => {
  const navigate = useNavigate();
  const {
    activeStep,
    setActiveStep,
    scriptMode,
    setScriptMode,
    projectTitle,
    setProjectTitle,
    isEditingTitle,
    setIsEditingTitle,
    isStepsCollapsed,
    toggleStepsCollapsed,
    goNext,
  } = useWorkspaceStore();

  const [titleDraft, setTitleDraft] = useState(projectTitle);
  const [commerceDialog, setCommerceDialog] = useState<'member' | 'recharge' | null>(null);
  const [briefDialog, setBriefDialog] = useState(false);
  const [uploadDialog, setUploadDialog] = useState(false);
  const activeIndex = steps.findIndex((s) => s.id === activeStep);
  const activeStepInfo = steps[activeIndex];

  const saveProjectTitle = () => {
    const nextTitle = titleDraft.trim();
    if (nextTitle) setProjectTitle(nextTitle);
    else setTitleDraft(projectTitle);
    setIsEditingTitle(false);
  };

  const renderPanel = () => {
    switch (activeStep) {
      case 'selling-points':
        return <SellingPointsPanel onBrief={() => setBriefDialog(true)} onUpload={() => setUploadDialog(true)} />;
      case 'script-generator':
        return <ScriptGeneratorPanel mode={scriptMode} onScriptModeChange={setScriptMode} />;
      case 'storyboard':
        return <StoryboardPanel />;
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

  return (
    <main className={isStepsCollapsed ? 'workspace-shell steps-collapsed' : 'workspace-shell'}>
      <HomeRail
        activeLabel="制作大片"
        onCreate={() => setActiveStep('selling-points')}
        onHome={() => navigate('/home')}
        onProjects={() => navigate('/projects')}
        onMember={() => setCommerceDialog('member')}
        onRecharge={() => setCommerceDialog('recharge')}
      />

      <aside className="workspace-sidebar">
        <header className="project-step-head">
          <button className="project-back" aria-label="返回" onClick={() => navigate('/home')}>
            ‹
          </button>
          {isEditingTitle ? (
            <input
              className="project-title-inline-input"
              value={titleDraft}
              autoFocus
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={saveProjectTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveProjectTitle();
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
                ✎
              </button>
            </>
          )}
        </header>
        <nav aria-label="脚本生成步骤">
          {steps.map((step, index) => (
            <button
              key={step.id}
              className={step.id === activeStep ? 'active' : index < activeIndex ? 'done' : ''}
              onClick={() => setActiveStep(step.id)}
            >
              <span>{index + 1}</span>
              <strong>{step.name}</strong>
              <i>{index < activeIndex ? <CheckCircleOutlined /> : 'ⓘ'}</i>
            </button>
          ))}
        </nav>
      </aside>

      <section className={activeStep === 'script-generator' ? 'workspace-main script-workspace-main' : 'workspace-main'}>
        <button
          className={isStepsCollapsed ? 'step-collapse-toggle collapsed' : 'step-collapse-toggle'}
          aria-label={isStepsCollapsed ? '展开重点步骤' : '收缩重点步骤'}
          onClick={toggleStepsCollapsed}
        >
          {isStepsCollapsed ? '☰' : '☰'}
        </button>

        {activeStep === 'selling-points' && (
          <div className="creation-topbar">
            <input aria-label="产品名称" placeholder="请输入产品名称" />
            <button className="brief-top-button" onClick={() => setBriefDialog(true)}>
              <span>⊕</span>Brief
            </button>
            <button className="outline-action-button" onClick={() => setUploadDialog(true)}>
              上传卖点
            </button>
            <button className="outline-action-button green">
              保存
            </button>
            <button className="next-step-button" onClick={goNext}>
              下一步：{steps[activeIndex + 1]?.name || '完成'}
            </button>
          </div>
        )}

        <main className="workbench-card step-panel creation-panel">
          {renderPanel()}
        </main>
      </section>

      {briefDialog && <BriefDialog onClose={() => setBriefDialog(false)} />}
      {uploadDialog && <UploadDialog onClose={() => setUploadDialog(false)} />}
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
