import type { StepDefinition } from '../../types/workflow';

export const steps: StepDefinition[] = [
  { id: 'global', label: '全局设定', short: '01' },
  { id: 'selling-points', label: '产品卖点', short: '02' },
  { id: 'source', label: '爆款 / 原创', short: '03' },
  { id: 'storyboard', label: '分镜脚本', short: '04' },
  { id: 'visual', label: '场景角色道具', short: '05' },
  { id: 'video', label: '分镜视频', short: '06' },
  { id: 'dubbing', label: '配音对口型', short: '07' },
  { id: 'preview', label: '视频预览', short: '08' },
  { id: 'analytics', label: '投放数据', short: '09' },
];
