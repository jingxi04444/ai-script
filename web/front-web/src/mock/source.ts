import type { AnalysisDimension, SourceAnalysis } from '../types/source';

const mockCopy = [
  '你是不是也遇到过这种情况：买回家的产品看着不错，用起来却总差一点？',
  '真正影响体验的，不只是参数，而是它能不能解决每天都会遇到的具体问题。',
  '这款产品把核心功能做成了更简单的操作，上手快，也更适合日常场景。',
  '从细节展示到实际效果，都能直接看见变化，不需要复杂设置。',
  '如果你也想少走弯路，可以先从最常用的场景开始体验。',
].join('\n');

const simpleDimensions: AnalysisDimension[] = [
  { key: 'hook', title: '开场钩子', content: '用“是不是也遇到过”快速锁定共同痛点，引发代入。' },
  { key: 'pain', title: '痛点铺陈', content: '从参数转向真实使用问题，放大用户对体验落差的关注。' },
  { key: 'sellingPoint', title: '卖点展开', content: '突出操作简单、上手快和适配日常场景三个核心利益点。' },
  { key: 'proof', title: '效果证明', content: '通过细节与结果可视化建立可信度，降低理解门槛。' },
  { key: 'action', title: '行动收口', content: '用低压力体验建议完成自然转化。' },
];

const deepDimensions: AnalysisDimension[] = [
  { key: 'paragraphStructure', title: '段落结构拆解', content: '痛点提问 → 认知转折 → 产品解决 → 效果证明 → 低压力行动引导。' },
  { key: 'keyIssues', title: '需要特别指出', content: '保留具体生活场景和结果展示，避免只罗列抽象参数。' },
  { key: 'fullDeepReport', title: '完整深度拉片报告', content: '整体节奏由快到稳，先抓注意力，再用演示和细节承接信任。' },
  { key: 'structureFormula', title: '结构公式总结', content: '共同痛点 + 认知反差 + 简单方案 + 可见结果 + 轻行动。' },
  { key: 'replicationPoints', title: '复刻要点', content: '复刻提问式开场、场景化表达和逐层递进的卖点节奏。' },
  { key: 'editingSuggestions', title: '剪辑建议', content: '开头快切，中段增加产品特写，结尾用字幕强化行动信息。' },
];

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

export const mockSourceApi = {
  createParseTask: async (params: { projectId: string; url: string; mode?: 'simple' | 'deep' }): Promise<SourceAnalysis> => {
    await delay(350);
    return {
      id: 'source-preview-1',
      projectId: params.projectId,
      mode: params.mode || 'simple',
      sourceUrl: params.url,
      platform: 'douyin',
      title: '爆款短视频解析示例',
      editableCopy: mockCopy,
      status: 'parsed',
    };
  },

  analyzeCopy: async (params: { projectId: string; copy: string; mode: 'simple' | 'deep' }): Promise<SourceAnalysis> => {
    await delay(450);
    const dimensions = params.mode === 'deep' ? deepDimensions : simpleDimensions;
    return {
      id: 'source-preview-analysis-1',
      projectId: params.projectId,
      mode: params.mode,
      sourceUrl: 'copy-analysis',
      editableCopy: params.copy,
      structureSummary: dimensions.map((item) => `${item.title}：${item.content}`).join('\n'),
      dimensions,
      status: 'analyzed',
    };
  },
};
