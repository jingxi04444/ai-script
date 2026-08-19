import type { PolishScriptParams, Script, ScriptTemplate, ScriptVersion } from '../types/script';
import { createSuccessResponse, unwrapApiResponse } from '../types/api';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const mockScripts: Script[] = [
  { id: 'script-1', name: '爆款复刻脚本_2026-05-30', projectId: 'project-1', briefId: 'b1', briefName: 'JRFH-2026', type: 'viral', status: 'approved', content: '熬夜累眼圈、毛孔粗大、胶原崩塌？别再拿美妆硬撑了！', createdAt: '2026-05-30', updatedAt: '2026-05-30 23:51:10' },
  { id: 'script-2', name: '模板脚本_2026-05-30', projectId: 'project-1', briefId: 'b1', briefName: 'JRFH-2026', type: 'template', templateId: '01', templateName: '痛点解决型', status: 'pending_review', createdAt: '2026-05-30', updatedAt: '2026-05-30 22:47:37' },
  { id: 'script-3', name: 'AI原创脚本_2026-05-30', projectId: 'project-1', briefId: 'b2', briefName: 'A60MAX', type: 'original', originalCategoryId: 'ecommerce', originalCategoryName: '电商', originalScenarioId: 'product-intro', originalScenarioName: '产品介绍口播', status: 'draft', createdAt: '2026-05-30', updatedAt: '2026-05-30 22:47:37' },
  { id: 'script-4', name: '产品维度脚本_2026-05-30', projectId: 'project-1', briefId: 'b2', briefName: 'A60MAX', type: 'product', status: 'approved', content: '围绕产品核心卖点拆解：开场点出场景痛点，中段展示成分/功能证据，结尾给出明确购买理由。', createdAt: '2026-05-30', updatedAt: '2026-05-30 21:35:18' },
  { id: 'script-5', name: '产品卖点拆解脚本_2026-05-30', projectId: 'project-1', briefId: 'b3', briefName: '分层便当盒', type: 'product-dimension', status: 'pending_review', content: '从产品维度展开：目标人群、使用场景、差异化卖点、行动引导四段式脚本。', createdAt: '2026-05-30', updatedAt: '2026-05-30 20:18:42' },
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

const mockScriptVersions = new Map<string, ScriptVersion[]>();

const ensureMockVersions = (script: Script): ScriptVersion[] => {
  const existing = mockScriptVersions.get(script.id);
  if (existing) return existing;
  const initial: ScriptVersion[] = [{
    id: `${script.id}-version-1`,
    versionNo: 1,
    title: `${script.name} · V1`,
    content: script.content || '',
    changeNote: 'AI 生成原稿',
    source: 'generate',
    summary: '首次生成脚本',
    current: true,
    createdAt: script.createdAt,
  }];
  mockScriptVersions.set(script.id, initial);
  return initial;
};

const appendMockVersion = (
  script: Script,
  data: Pick<ScriptVersion, 'content' | 'changeNote' | 'source' | 'instruction' | 'summary' | 'restoredFromVersionId'>,
) => {
  const versions = ensureMockVersions(script);
  versions.forEach((version) => { version.current = false; });
  versions.push({
    id: `${script.id}-version-${versions.length + 1}`,
    versionNo: versions.length + 1,
    title: `${script.name} · V${versions.length + 1}`,
    ...data,
    current: true,
    createdAt: new Date().toISOString(),
  });
};

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
      briefId: _params.briefId,
      type: _params.type,
      templateId: _params.templateId,
      templateName: _params.type === 'template' ? mockTemplates.find((item) => item.id === _params.templateId)?.name : undefined,
      originalCategoryId: _params.originalCategoryId,
      originalCategoryName: _params.originalCategoryName,
      originalScenarioId: _params.originalScenarioId,
      originalScenarioName: _params.originalScenarioName,
      duration: _params.duration,
      format: _params.format,
      formatName: _params.format === 'product-storyboard'
        ? '产品类分镜脚本表'
        : _params.format === 'plot-storyboard'
          ? '剧情类分镜脚本表'
          : '分镜脚本表',
      status: 'approved' as const,
      content: `标题：一开口就抓住注意力的产品创意\n\n【${_params.type === 'viral' ? '爆款复刻' : _params.type === 'template' ? '模板生成' : _params.type === 'product' || _params.type === 'product-dimension' ? '产品维度' : 'AI原创'}】开场抛出痛点，展示产品卖点，结尾引导立即行动。`,
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
    if (data.content !== undefined && data.content !== script.content) {
      appendMockVersion(script, {
        content: data.content || '',
        changeNote: '人工编辑并保存',
        source: 'manual',
        summary: '已保存人工编辑内容',
      });
    }
    Object.assign(script, nextScript);
    return unwrapApiResponse(createSuccessResponse(nextScript));
  },

  polish: async (_id: string, params: PolishScriptParams) => {
    await delay(1100);
    const source = params.content.trim() || '暂无原脚本内容';
    const instruction = params.instruction.trim();
    const revised = `${source}\n\n【AI润色修改版】\n修改要求：${instruction}\n1. 开场更直接指出用户觉得“这个脚本不行”的核心问题，用一句更强的痛点钩子重新抓注意力。\n2. 中段把产品卖点改成更口语、更有画面感的表达，避免空泛描述。\n3. 结尾增加明确行动引导，让观众知道下一步要点击、咨询或下单。`;
    const script = mockScripts.find((item) => item.id === _id);
    if (script) {
      script.content = revised;
      script.updatedAt = new Date().toISOString();
      appendMockVersion(script, {
        content: revised,
        changeNote: 'AI 继续润色',
        source: 'ai_polish',
        instruction,
        summary: `已按“${instruction}”完成改写，重点优化开场钩子、卖点表达和结尾转化。`,
      });
    }
    return unwrapApiResponse(createSuccessResponse({
      content: revised,
      summary: `已按“${instruction}”完成改写，重点优化开场钩子、卖点表达和结尾转化。`,
      status: script?.status,
    }));
  },

  getVersions: async (id: string) => {
    await delay(160);
    const script = mockScripts.find((item) => item.id === id);
    if (!script) throw new Error('Script not found');
    return unwrapApiResponse(createSuccessResponse(ensureMockVersions(script).map((item) => ({ ...item }))));
  },

  restoreVersion: async (id: string, versionId: string) => {
    await delay(260);
    const script = mockScripts.find((item) => item.id === id);
    if (!script) throw new Error('Script not found');
    const target = ensureMockVersions(script).find((item) => item.id === versionId);
    if (!target) throw new Error('历史版本不存在');
    script.content = target.content;
    script.updatedAt = new Date().toISOString();
    appendMockVersion(script, {
      content: target.content,
      changeNote: `恢复到版本 V${target.versionNo}`,
      source: 'restore',
      summary: `已恢复到版本 V${target.versionNo}`,
      restoredFromVersionId: target.id,
    });
    return unwrapApiResponse(createSuccessResponse({ ...script }));
  },

  delete: async (_id: string) => {
    await delay(300);
  },

  getTemplates: async () => {
    await delay(300);
    return unwrapApiResponse(createSuccessResponse(mockTemplates));
  },
};
