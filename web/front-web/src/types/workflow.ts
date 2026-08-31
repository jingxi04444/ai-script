import type { Edge, Node } from '@xyflow/react';

export type WorkflowMode = 'image' | 'video';

export type WorkflowNodeKind =
  | 'storyboard'
  | 'scriptGenerator'
  | 'text'
  | 'character'
  | 'scene'
  | 'product'
  | 'categorySkill'
  | 'prompt'
  | 'image'
  | 'batchMaterial'
  | 'result'
  | 'video'
  | 'music'
  | 'voice'
  | 'editor'
  | 'export'
  | 'note';

export type WorkflowNodeStatus = 'idle' | 'queued' | 'running' | 'success' | 'failed';

export interface WorkflowNodeData extends Record<string, unknown> {
  kind: WorkflowNodeKind;
  stage?: 'A' | 'B' | 'C' | 'D' | 'E';
  title: string;
  description: string;
  prompt?: string;
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  quality?: string;
  assetUrl?: string;
  outputUrl?: string;
  skillCode?: string;
  renderMode?: string;
  category?: string;
  batchSize?: number;
  outputCount?: number;
  durationSeconds?: number;
  voice?: string;
  speed?: string;
  musicStyle?: string;
  executionMode?: 'single' | 'batch';
  progress?: number;
  status: WorkflowNodeStatus;
  taskId?: string;
}

export type WorkflowNode = Node<WorkflowNodeData, 'workflow'>;
export type WorkflowEdge = Edge;

export interface WorkflowDocument {
  version: 3;
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

export interface WorkflowRecord {
  id: string;
  projectId: string;
  name: string;
  mode: WorkflowMode;
  version: number;
  graphJson: string;
  updatedAt?: string;
}

export interface WorkflowValidation {
  valid: boolean;
  nodeCount: number;
  edgeCount: number;
  estimatedShotCount: number;
  estimatedVideoCount: number;
  errors: string[];
}

export const workflowNodeDefinitions: WorkflowNodeDefinition[] = [
  { kind: 'storyboard', title: '分镜脚本', description: '镜头、画面和对白', group: 'source' },
  { kind: 'scriptGenerator', title: '脚本生成器', description: '根据需求生成营销脚本', group: 'creative' },
  { kind: 'text', title: '文本', description: '输入提示词、文案或说明', group: 'creative' },
  { kind: 'character', title: '角色设定', description: '人物形象与参考图', group: 'source' },
  { kind: 'scene', title: '场景设定', description: '空间、光线与氛围', group: 'source' },
  { kind: 'product', title: '产品素材', description: '商品图与关键卖点', group: 'source' },
  { kind: 'categorySkill', title: '品类场景 Skill', description: '调用品类知识与场景生成插件', group: 'creative' },
  { kind: 'prompt', title: '分镜 AI 提示词', description: '把脚本拆成可执行镜头提示词', group: 'creative' },
  { kind: 'image', title: '产品场景图', description: '生成一致的产品场景图套装', group: 'generation' },
  { kind: 'batchMaterial', title: '批量品类素材', description: '批量生产通用品类视频镜头', group: 'generation' },
  { kind: 'result', title: '图片结果', description: '选择并继续创作', group: 'generation' },
  { kind: 'video', title: '卖点视频素材', description: '按分镜提示词生成镜头素材', group: 'generation' },
  { kind: 'music', title: '音乐模型', description: '生成与节奏匹配的商业音乐', group: 'generation' },
  { kind: 'voice', title: '配音模型', description: '生成旁白与口播音轨', group: 'generation' },
  { kind: 'editor', title: 'AI 剪辑组装', description: '按分镜从素材池组装多条视频', group: 'generation' },
  { kind: 'export', title: '批量成片', description: '渲染并导出 10–20 条成片', group: 'generation' },
  { kind: 'note', title: '文本', description: '直接输入或承接上游文本', group: 'utility' },
];

export const createWorkflowNodeData = (kind: WorkflowNodeKind): WorkflowNodeData => {
  const definition = workflowNodeDefinitions.find((item) => item.kind === kind);
  const defaults: Partial<Record<WorkflowNodeKind, Partial<WorkflowNodeData>>> = {
    storyboard: { stage: 'C', prompt: '前 3 秒建立痛点，中段演示核心卖点，结尾给出购买理由与行动指令。' },
    scriptGenerator: {
      model: '商业短视频脚本模型',
      durationSeconds: 30,
      prompt: '',
    },
    text: { prompt: '', model: 'GVLM 3.1' },
    character: { stage: 'B', prompt: '自然、可信赖的年轻使用者，服装、发型和面部特征在全部镜头中保持一致。' },
    scene: { stage: 'A', prompt: '选择与产品品类和受众匹配的真实使用场景，保持统一光线与美术风格。' },
    product: { stage: 'A', prompt: '保持产品结构、包装文字、Logo 与品牌颜色准确。' },
    categorySkill: {
      stage: 'A',
      category: '美妆个护',
      skillCode: 'category-scene-v1',
      renderMode: 'AI 场景合成',
      prompt: '读取产品卖点与品类规则，规划场景、机位、道具、光线和展示动作。',
    },
    prompt: {
      stage: 'D',
      model: '商业分镜提示词模型',
      prompt: '结合脚本、模特和场景图，为每个镜头输出主体、动作、运镜、光线、时长与负面提示词。',
    },
    image: {
      stage: 'A',
      model: 'Lib Image',
      aspectRatio: '16:9',
      quality: '高画质',
      resolution: '4K',
      batchSize: 1,
      executionMode: 'batch',
      prompt: '',
    },
    batchMaterial: {
      stage: 'D',
      model: '通用品类视频模型',
      aspectRatio: '9:16',
      batchSize: 100,
      durationSeconds: 3,
      executionMode: 'batch',
      prompt: '覆盖产品特写、手持展示、使用过程、成分质感、生活场景和转场空镜。',
    },
    result: {},
    video: {
      stage: 'D',
      model: '高质量图生视频模型',
      aspectRatio: '9:16',
      batchSize: 16,
      durationSeconds: 5,
      executionMode: 'batch',
      prompt: '镜头运动自然，产品主体稳定，不改变包装文字、Logo 与结构。',
    },
    music: {
      stage: 'E',
      model: '商业音乐生成模型',
      musicStyle: '轻快高级 / 120 BPM',
      durationSeconds: 30,
      prompt: '前 3 秒有抓人的节奏点，中段稳定推进，结尾保留品牌落版空间。',
    },
    voice: {
      stage: 'E',
      model: '自然口播配音模型',
      voice: '年轻女声·清透',
      speed: '1.05x',
      prompt: '读取脚本中的旁白与口播文本，按镜头时长自动调整停顿和语速。',
    },
    editor: {
      stage: 'E',
      model: 'AI 智能剪辑引擎',
      aspectRatio: '9:16',
      resolution: '1080P',
      outputCount: 15,
      executionMode: 'batch',
      prompt: '依据分镜脚本匹配镜头，自动完成节奏、转场、字幕、音乐卡点和卖点强调。',
    },
    export: {
      stage: 'E',
      aspectRatio: '9:16',
      resolution: '1080P',
      outputCount: 15,
      executionMode: 'batch',
    },
    note: { prompt: '创作便签' },
  };

  return {
    kind,
    title: definition?.title || '工作流节点',
    description: definition?.description || '配置节点内容',
    status: 'idle',
    ...defaults[kind],
  };
};
