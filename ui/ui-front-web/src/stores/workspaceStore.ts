import { create } from 'zustand';

export type StepKey = 'selling-points' | 'script-generator' | 'storyboard' | 'visual' | 'video' | 'preview';
export type ScriptMode = 'viral' | 'template' | 'original' | 'mine';

export const steps: Array<{ id: StepKey; name: string; desc: string }> = [
  { id: 'selling-points', name: '产品卖点', desc: 'Brief 和版本' },
  { id: 'script-generator', name: '脚本生成器', desc: '爆款 / 模板 / 原创' },
  { id: 'storyboard', name: '分镜脚本及润色', desc: '分镜脚本库' },
  { id: 'visual', name: '场景 角色 道具', desc: '素材绑定' },
  { id: 'video', name: '分镜视频', desc: '镜头任务' },
  { id: 'preview', name: '视频预览', desc: '成片检查' },
];

interface WorkspaceState {
  activeStep: StepKey;
  scriptMode: ScriptMode;
  projectTitle: string;
  isEditingTitle: boolean;
  isStepsCollapsed: boolean;

  setActiveStep: (step: StepKey) => void;
  setScriptMode: (mode: ScriptMode) => void;
  setProjectTitle: (title: string) => void;
  setIsEditingTitle: (isEditing: boolean) => void;
  toggleStepsCollapsed: () => void;
  goNext: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  activeStep: 'selling-points',
  scriptMode: 'viral',
  projectTitle: '未命名项目',
  isEditingTitle: false,
  isStepsCollapsed: false,

  setActiveStep: (step) => set({ activeStep: step }),
  setScriptMode: (mode) => set({ scriptMode: mode }),
  setProjectTitle: (title) => set({ projectTitle: title }),
  setIsEditingTitle: (isEditing) => set({ isEditingTitle: isEditing }),
  toggleStepsCollapsed: () => set((state) => ({ isStepsCollapsed: !state.isStepsCollapsed })),
  goNext: () => {
    const { activeStep } = get();
    const currentIndex = steps.findIndex((s) => s.id === activeStep);
    const nextStep = steps[currentIndex + 1];
    if (nextStep) set({ activeStep: nextStep.id });
  },
}));
