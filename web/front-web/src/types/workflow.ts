import type { Edge, Node } from '@xyflow/react';

export type WorkflowMode = 'image' | 'video';

export type WorkflowNodeKind =
  | 'storyboard'
  | 'character'
  | 'scene'
  | 'product'
  | 'prompt'
  | 'image'
  | 'result'
  | 'video'
  | 'note';

export type WorkflowNodeStatus = 'idle' | 'queued' | 'running' | 'success' | 'failed';

export interface WorkflowNodeData extends Record<string, unknown> {
  kind: WorkflowNodeKind;
  title: string;
  description: string;
  prompt?: string;
  model?: string;
  aspectRatio?: string;
  assetUrl?: string;
  outputUrl?: string;
  status: WorkflowNodeStatus;
  taskId?: string;
}

export type WorkflowNode = Node<WorkflowNodeData, 'workflow'>;
export type WorkflowEdge = Edge;

export interface WorkflowDocument {
  version: 1;
  projectId: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  updatedAt: string;
}

export interface WorkflowNodeDefinition {
  kind: WorkflowNodeKind;
  title: string;
  description: string;
  group: 'source' | 'creative' | 'generation' | 'utility';
}

export const workflowNodeDefinitions: WorkflowNodeDefinition[] = [
  { kind: 'storyboard', title: '分镜脚本', description: '镜头、画面和对白', group: 'source' },
  { kind: 'character', title: '角色设定', description: '人物形象与参考图', group: 'source' },
  { kind: 'scene', title: '场景设定', description: '空间、光线与氛围', group: 'source' },
  { kind: 'product', title: '产品素材', description: '商品图与关键卖点', group: 'source' },
  { kind: 'prompt', title: '提示词编排', description: '汇总上游创作信息', group: 'creative' },
  { kind: 'image', title: '图片生成', description: '文生图与多图参考', group: 'generation' },
  { kind: 'result', title: '图片结果', description: '选择并继续创作', group: 'generation' },
  { kind: 'video', title: '视频生成', description: '将定帧转为视频镜头', group: 'generation' },
  { kind: 'note', title: '创作便签', description: '记录方向与修改意见', group: 'utility' },
];

export const createWorkflowNodeData = (kind: WorkflowNodeKind): WorkflowNodeData => {
  const definition = workflowNodeDefinitions.find((item) => item.kind === kind);
  const defaults: Partial<Record<WorkflowNodeKind, Partial<WorkflowNodeData>>> = {
    storyboard: { prompt: '近景展示产品细节，随后切换到真实使用场景。' },
    character: { prompt: '自然、可信赖的年轻使用者，形象在全部镜头中保持一致。' },
    scene: { prompt: '清晨自然光，干净克制的生活空间，商业摄影质感。' },
    product: { prompt: '保持产品结构、包装文字和品牌颜色准确。' },
    prompt: { prompt: '整合上游分镜、角色、场景和产品信息，输出适合商业广告的生图提示词。' },
    image: { model: '通用商业生图模型', aspectRatio: '9:16' },
    result: {},
    video: { model: '通用图生视频模型', aspectRatio: '9:16', prompt: '镜头运动自然，产品主体稳定，不改变包装文字。' },
    note: { prompt: '在这里记录创作方向、客户反馈或待修改内容。' },
  };

  return {
    kind,
    title: definition?.title || '工作流节点',
    description: definition?.description || '配置节点内容',
    status: 'idle',
    ...defaults[kind],
  };
};

