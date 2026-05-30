import { useEffect, useRef, useState } from 'react';
import { navigate } from '../app/router';
import { ToastView } from '../components/ToastView';
import { Topbar } from '../components/Topbar';
import { StepContent } from '../features/workspace/StepContent';
import { steps } from '../features/workspace/steps';
import { projectApi } from '../services/projectApi';
import type { User } from '../types/auth';
import type { Project } from '../types/project';
import type { ThemeKey, Toast } from '../types/ui';

export function WorkspacePage({ projectId, user, showToast, toast, theme, onThemeToggle, onLogout }: { projectId: string; user: User; showToast: (message: string, tone?: Toast['tone']) => void; toast: Toast | null; theme: ThemeKey; onThemeToggle: () => void; onLogout: () => void }) {
  const queryStep = new URLSearchParams(window.location.search).get('step') || 'global';
  const [activeStep, setActiveStep] = useState(queryStep);
  const [project, setProject] = useState<Project | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const activeIndex = Math.max(steps.findIndex((step) => step.id === activeStep), 0);

  useEffect(() => {
    projectApi.getProject(projectId).then((data) => {
      setProject(data);
      setTitleDraft(data.title);
    });
  }, [projectId]);

  const setStep = (step: string) => {
    setActiveStep(step);
    window.history.replaceState({}, '', `/projects/${projectId}/workspace?step=${step}`);
  };

  const next = () => {
    const nextStep = steps[activeIndex + 1];
    if (nextStep) setStep(nextStep.id);
  };

  const saveProjectTitle = async () => {
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      showToast('项目名称不能为空。', 'warning');
      return;
    }
    if (!project || nextTitle === project.title) {
      setIsEditingTitle(false);
      return;
    }
    const nextProject = await projectApi.updateProject(project.id, { title: nextTitle });
    setProject(nextProject);
    setTitleDraft(nextProject.title);
    setIsEditingTitle(false);
    showToast('项目名称已更新。');
  };

  const stepContentRef = useRef<{ openBriefDrawer: () => void; newBrief: () => void; newScript: () => void }>(null);

  return (
    <main className="workspace-shell">
      <aside className="workspace-sidebar">
        <button className="back-button" onClick={() => navigate('/projects')}>← 返回项目</button>
        <div className="workspace-brand">北钥 AI 工作台</div>
        <nav>
          {steps.map((step, index) => (
            <button key={step.id} className={step.id === activeStep ? 'active' : index < activeIndex ? 'done' : ''} onClick={() => setStep(step.id)}>
              <span>{step.short}</span>
              {step.label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="workspace-main">
        <Topbar user={user} compact theme={theme} onThemeToggle={onThemeToggle} onLogout={onLogout} />
        {toast && <ToastView toast={toast} />}
        <div className="workspace-title panel">
          {isEditingTitle ? (
            <div className="workspace-title-edit">
              <input
                value={titleDraft}
                autoFocus
                onChange={(event) => setTitleDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void saveProjectTitle();
                  if (event.key === 'Escape') {
                    setTitleDraft(project?.title || '');
                    setIsEditingTitle(false);
                  }
                }}
              />
              <button onClick={saveProjectTitle}>保存</button>
              <button onClick={() => { setTitleDraft(project?.title || ''); setIsEditingTitle(false); }}>取消</button>
            </div>
          ) : (
            <div className="workspace-title-display">
              <h1 onClick={() => project && setIsEditingTitle(true)} role={project ? 'button' : undefined} tabIndex={project ? 0 : -1} onKeyDown={(event) => { if (!project) return; if (event.key === 'Enter') setIsEditingTitle(true); }} title={project ? '点击修改项目名称' : undefined}>
                {project?.title || project?.product || '加载项目中...'}
              </h1>
            </div>
          )}

          {activeStep === 'selling-points' && !isEditingTitle && (
            <div className="workspace-title-actions">
              <button className="ghost-button" onClick={() => stepContentRef.current?.newBrief()}>新增 Brief</button>
              <button className="primary-button" onClick={next}>下一步 → 脚本生成器</button>
            </div>
          )}

          {activeStep === 'script-generator' && !isEditingTitle && (
            <div className="workspace-title-actions">
              <button className="ghost-button" onClick={() => stepContentRef.current?.newScript()}>新增脚本</button>
              <button className="primary-button" onClick={next}>下一步 → 分镜脚本润色</button>
            </div>
          )}
        </div>
        <StepContent ref={stepContentRef} step={activeStep} projectId={projectId} onNext={next} showToast={showToast} />
      </section>
    </main>
  );
}
