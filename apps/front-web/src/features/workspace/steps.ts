import type { StepDefinition } from '../../types/workflow';

export const steps: StepDefinition[] = [
  { id: 'selling-points', label: '产品卖点', short: '01' },
  { id: 'script-generator', label: '脚本生成器', short: '02' },
  { id: 'storyboard', label: '分镜脚本及润色', short: '03' },
  { id: 'visual', label: '场景 角色 道具', short: '04' },
  { id: 'video', label: '分镜视频', short: '05' },
  { id: 'dubbing', label: '配音对口型', short: '06' },
  { id: 'preview', label: '视频预览', short: '07' },
];
