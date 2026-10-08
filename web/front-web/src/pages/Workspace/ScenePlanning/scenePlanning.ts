export interface ModelDemand {
  id: string;
  name: string;
  productName?: string;
  briefId?: string;
  targetCount: number;
  sourceCount?: number;
}

export interface ProjectBriefProduct {
  id: string;
  name: string;
  productName?: string;
  productModel?: string;
}

export interface ProjectScriptProduct {
  id: string;
  briefId?: string;
  briefName?: string;
}

export const modelsFromProject = (briefs: ProjectBriefProduct[], scripts: ProjectScriptProduct[]): ModelDemand[] => {
  const scriptCounts = new Map<string, number>();
  scripts.forEach(script => {
    if (script.briefId) scriptCounts.set(script.briefId, (scriptCounts.get(script.briefId) || 0) + 1);
  });
  const products = briefs.map(brief => {
    const productName = brief.productName?.trim() || brief.name?.trim() || `产品 Brief ${brief.id}`;
    return {
      id: `brief-${brief.id}`,
      briefId: brief.id,
      productName,
      name: brief.productModel?.trim() || productName,
      targetCount: scriptCounts.get(brief.id) || 0,
      sourceCount: scriptCounts.get(brief.id) || 0,
    };
  });
  const linkedBriefIds = new Set(briefs.map(brief => brief.id));
  const unlinked = scripts.filter(script => !script.briefId || !linkedBriefIds.has(script.briefId));
  if (unlinked.length) products.push({
    id: 'unlinked-scripts', briefId: '', productName: '未关联 Brief 的脚本', name: '未关联型号',
    targetCount: unlinked.length, sourceCount: unlinked.length,
  });
  return products;
};

export interface SceneSetting {
  name: string;
  imageUrl: string;
  note: string;
}

export interface ScenePlanInput {
  perSceneCap: number;
  sceneCount: number;
  models: ModelDemand[];
  scenes: SceneSetting[];
  aiImageCounts?: Record<string, number>;
  rowNotes?: Record<string, string>;
}

export interface SceneAssignment {
  modelId: string;
  modelName: string;
  productName: string;
  briefId?: string;
  count: number;
  aiImageCount: number;
  note: string;
  productAssetKey: string;
}

export interface PlannedScene extends SceneSetting {
  id: string;
  number: number;
  totalCount: number;
  blankAssetKey: string;
  assignments: SceneAssignment[];
}

export interface ScenePlan {
  scenes: PlannedScene[];
  totalScripts: number;
  minimumScenes: number;
  blankAssets: number;
  productAssets: number;
  baselineImages: number;
  plannedImages: number;
  reusedImages: number;
  totalAiImages: number;
  error?: string;
}

export const scenePresets = [
  { name: '日光白系厨房', imageUrl: '/scene-planning/bright-kitchen.jpg', note: '明亮空镜，适合清洁感与产品功能演示' },
  { name: '黑白现代厨房', imageUrl: '/scene-planning/contrast-kitchen.jpg', note: '高对比空镜，适合结构与性能卖点' },
  { name: '原木暖调厨房', imageUrl: '/scene-planning/warm-kitchen.jpg', note: '生活化空镜，适合情绪与使用场景' },
] satisfies SceneSetting[];

export const sceneSettingAt = (index: number): SceneSetting => ({ ...scenePresets[index % scenePresets.length] });

export const minimumSceneCount = (models: ModelDemand[], perSceneCap: number): number => {
  if (!Number.isInteger(perSceneCap) || perSceneCap < 1) return 0;
  return Math.max(0, ...models.map(model => Math.ceil(Math.max(0, model.targetCount) / perSceneCap)));
};

export const buildScenePlan = ({ perSceneCap, sceneCount, models, scenes, aiImageCounts = {}, rowNotes = {} }: ScenePlanInput): ScenePlan => {
  const empty = (error: string): ScenePlan => ({ scenes: [], totalScripts: 0, minimumScenes: 0,
    blankAssets: 0, productAssets: 0, baselineImages: 0, plannedImages: 0, reusedImages: 0, totalAiImages: 0, error });
  if (!Number.isInteger(perSceneCap) || perSceneCap < 1 || perSceneCap > 100) return empty('单场景单型号上限须为 1–100 条');
  if (!Number.isInteger(sceneCount) || sceneCount < 1 || sceneCount > 20) return empty('场景数量须为 1–20 个');
  const activeModels = models.filter(model => model.name.trim() || model.productName?.trim() || model.targetCount > 0);
  if (activeModels.some(model => !model.name.trim() || !Number.isInteger(model.targetCount) || model.targetCount < 0 || model.targetCount > 10000)) {
    return empty('每个型号都需填写名称，脚本条数须为 0–10000 的整数');
  }
  if (!activeModels.length) return empty('当前项目还没有产品 Brief，请先创建 Brief 或添加临时产品');
  if (new Set(activeModels.map(model => model.id)).size !== activeModels.length) return empty('产品标识不能重复');
  if (Object.values(aiImageCounts).some(value => !Number.isInteger(value) || value < 0 || value > 10000)) return empty('AI 生图张数须为 0–10000 的整数');
  const minimumScenes = minimumSceneCount(activeModels, perSceneCap);
  if (sceneCount < minimumScenes) {
    return { ...empty(`按每场每型号最多 ${perSceneCap} 条，至少需要 ${minimumScenes} 个场景`), minimumScenes };
  }
  const allocations = Array.from({ length: sceneCount }, () => new Map<string, number>());
  const sceneTotals = Array<number>(sceneCount).fill(0);
  activeModels.forEach(model => {
    const base = Math.floor(model.targetCount / sceneCount);
    allocations.forEach((allocation, index) => {
      allocation.set(model.id, base);
      sceneTotals[index] += base;
    });
    const assignedExtra = new Set<number>();
    for (let extra = 0; extra < model.targetCount % sceneCount; extra += 1) {
      const index = sceneTotals.reduce((best, current, candidate) =>
        !assignedExtra.has(candidate) && (assignedExtra.has(best) || current < sceneTotals[best]) ? candidate : best, 0);
      allocations[index].set(model.id, base + 1);
      sceneTotals[index] += 1;
      assignedExtra.add(index);
    }
  });
  const plannedScenes: PlannedScene[] = Array.from({ length: sceneCount }, (_, index) => {
    const setting = scenes[index] || sceneSettingAt(index);
    const assignments = activeModels.map(model => {
      const count = allocations[index].get(model.id) || 0;
      const productAssetKey = `S${index + 1}-${model.id}`;
      return { modelId: model.id, modelName: model.name.trim(), productName: model.productName?.trim() || model.name.trim(),
        briefId: model.briefId, count, aiImageCount: aiImageCounts[productAssetKey] ?? Math.max(1, count),
        note: rowNotes[productAssetKey] || '', productAssetKey };
    });
    return { ...setting, id: `scene-${index + 1}`, number: index + 1,
      totalCount: assignments.reduce((sum, item) => sum + item.count, 0),
      blankAssetKey: `S${index + 1}-blank`, assignments };
  });
  const totalScripts = activeModels.reduce((sum, model) => sum + model.targetCount, 0);
  const blankAssets = plannedScenes.filter(scene => scene.assignments.length > 0).length;
  const productAssets = plannedScenes.reduce((sum, scene) => sum + scene.assignments.length, 0);
  // Compare two reusable image categories (blank + product composite) against creating both for every script.
  const baselineImages = totalScripts * 2;
  const plannedImages = blankAssets + productAssets;
  const totalAiImages = plannedScenes.reduce((sum, scene) => sum + scene.assignments.reduce((rowSum, row) => rowSum + row.aiImageCount, 0), 0);
  return { scenes: plannedScenes, totalScripts, minimumScenes, blankAssets, productAssets,
    baselineImages, plannedImages, reusedImages: Math.max(0, baselineImages - plannedImages), totalAiImages };
};
