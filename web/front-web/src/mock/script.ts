import type { PolishScriptParams, Script, ScriptTemplate } from '../types/script';
import { createSuccessResponse, unwrapApiResponse } from '../types/api';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockScripts: Script[] = [
  { id: 'script-1', name: '爆款复刻脚本_2026-05-30', projectId: 'project-1', type: 'viral', status: 'done', content: '熬夜累眼圈、毛孔粗大、胶原崩塌？别再拿美妆硬撑了！', createdAt: '2026-05-30', updatedAt: '2026-05-30 23:51:10' },
  { id: 'script-2', name: '模板脚本_2026-05-30', projectId: 'project-1', type: 'template', status: 'pending', createdAt: '2026-05-30', updatedAt: '2026-05-30 22:47:37' },
  { id: 'script-3', name: 'AI原创脚本_2026-05-30', projectId: 'project-1', type: 'original', status: 'draft', createdAt: '2026-05-30', updatedAt: '2026-05-30 22:47:37' },
  { id: 'script-4', name: '产品维度脚本_2026-05-30', projectId: 'project-1', type: 'product', status: 'done', content: '围绕产品核心卖点拆解：开场点出场景痛点，中段展示成分/功能证据，结尾给出明确购买理由。', createdAt: '2026-05-30', updatedAt: '2026-05-30 21:35:18' },
  { id: 'script-5', name: '产品卖点拆解脚本_2026-05-30', projectId: 'project-1', type: 'product-dimension', status: 'pending', content: '从产品维度展开：目标人群、使用场景、差异化卖点、行动引导四段式脚本。', createdAt: '2026-05-30', updatedAt: '2026-05-30 20:18:42' },
];

const getProjectMockScripts = (projectId: string): Script[] => {
  const projectScripts = mockScripts.filter((script) => script.projectId === projectId);
  if (projectScripts.length) return projectScripts;

  return mockScripts
    .filter((script) => script.projectId === 'project-1')
    .map((script) => ({
      ...script,
      id: `${projectId}-${script.id}`,
      projectId,
    }));
};

const mockTemplates: ScriptTemplate[] = [
  { id: '01', name: '痛点解决型', actor: '女', people: '1人', popularity: '高', difficulty: '简单', locked: false },
  { id: '02', name: '功能讲解型', actor: '男', people: '1人', popularity: '高', difficulty: '简单', locked: false },
  { id: '03', name: '对比突出型', actor: '男女', people: '2人', popularity: '中', difficulty: '中等', locked: false },
  { id: '04', name: '场景代入型', actor: '女', people: '1人', popularity: '中', difficulty: '中等', locked: true },
  { id: '05', name: '用户证言型', actor: '男女', people: '2人', popularity: '中', difficulty: '中等', locked: true },
  { id: '06', name: '权威背书型', actor: '男', people: '1人', popularity: '中', difficulty: '中等', locked: true },
  { id: '07', name: '清单推荐型', actor: '女', people: '1人', popularity: '中', difficulty: '中等', locked: true },
  { id: '08', name: '教程步骤型', actor: '男女', people: '1人', popularity: '中', difficulty: '中等', locked: true },
  { id: '09', name: '使用对比型', actor: '男女', people: '2人', popularity: '中', difficulty: '中等', locked: true },
  { id: '10', name: '优惠促销型', actor: '女', people: '1人', popularity: '中', difficulty: '中等', locked: true },
];

export const mockScriptApi = {
  getList: async (_projectId: string) => {
    await delay(300);
    return unwrapApiResponse(createSuccessResponse(getProjectMockScripts(_projectId)));
  },

  getById: async (id: string) => {
    await delay(200);
    const script = mockScripts.find((s) => s.id === id);
    if (!script) throw new Error('Script not found');
    return unwrapApiResponse(createSuccessResponse(script));
  },

  generate: async (_params: import('../types/script').GenerateScriptParams) => {
    await delay(1000);
    const script: Script = {
      id: `script-${Date.now()}`,
      name: `生成脚本_${new Date().toISOString().split('T')[0]}`,
      projectId: _params.projectId,
      type: _params.type,
      status: 'done' as const,
      content: `【${_params.type === 'viral' ? '爆款复刻' : _params.type === 'template' ? '模板生成' : _params.type === 'product' || _params.type === 'product-dimension' ? '产品维度' : 'AI原创'}】开场抛出痛点，展示产品卖点，结尾引导立即行动。`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockScripts.unshift(script);
    return unwrapApiResponse(createSuccessResponse(script));
  },

  update: async (id: string, data: Partial<Script>) => {
    await delay(300);
    const script = mockScripts.find((s) => s.id === id);
    if (!script) throw new Error('Script not found');
    const nextScript = { ...script, ...data, updatedAt: new Date().toISOString() };
    Object.assign(script, nextScript);
    return unwrapApiResponse(createSuccessResponse(nextScript));
  },

  polish: async (_id: string, params: PolishScriptParams) => {
    await delay(1100);
    const source = params.content.trim() || '暂无原脚本内容';
    const instruction = params.instruction.trim();
    const revised = `${source}\n\n【AI润色修改版】\n修改要求：${instruction}\n1. 开场更直接指出用户觉得“这个脚本不行”的核心问题，用一句更强的痛点钩子重新抓注意力。\n2. 中段把产品卖点改成更口语、更有画面感的表达，避免空泛描述。\n3. 结尾增加明确行动引导，让观众知道下一步要点击、咨询或下单。`;
    return unwrapApiResponse(createSuccessResponse({
      content: revised,
      summary: `已按“${instruction}”完成改写，重点优化开场钩子、卖点表达和结尾转化。`,
    }));
  },

  delete: async (_id: string) => {
    await delay(300);
  },

  getTemplates: async () => {
    await delay(300);
    return unwrapApiResponse(createSuccessResponse(mockTemplates));
  },
};
