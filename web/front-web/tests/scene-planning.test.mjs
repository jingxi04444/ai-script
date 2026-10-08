import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

const ts = createRequire(import.meta.url)('typescript');
const source = await readFile(new URL('../src/pages/Workspace/ScenePlanning/scenePlanning.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
}).outputText;
const { buildScenePlan, minimumSceneCount, modelsFromProject, sceneSettingAt } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

const models = [
  { id: 'a', name: 'A', targetCount: 30 },
  { id: 'b', name: 'B', targetCount: 20 },
  { id: 'c', name: 'C', targetCount: 30 },
  { id: 'd', name: 'D', targetCount: 20 },
];
const input = (patch = {}) => ({
  perSceneCap: 10, sceneCount: 3, models,
  scenes: [sceneSettingAt(0), sceneSettingAt(1), sceneSettingAt(2)], ...patch,
});

test('100 scripts across four models fit exactly three scenes with 10 per model per scene', () => {
  const plan = buildScenePlan(input());
  assert.equal(plan.error, undefined);
  assert.equal(plan.minimumScenes, 3);
  assert.equal(plan.totalScripts, 100);
  assert.equal(plan.scenes.length, 3);
  assert.deepEqual(plan.scenes.map(scene => scene.totalCount), [34, 33, 33]);
  for (const scene of plan.scenes) for (const assignment of scene.assignments) assert.ok(assignment.count <= 10);
  assert.equal(plan.blankAssets, 3);
  assert.equal(plan.productAssets, 12);
  assert.equal(plan.plannedImages, 15);
  assert.equal(plan.reusedImages, 185);
  assert.equal(plan.totalAiImages, 100);
  assert.ok(plan.scenes.every(scene => scene.assignments.every(row => row.aiImageCount === row.count)));
});

test('AI output targets can be adjusted per scene and product without changing script allocation', () => {
  const plan = buildScenePlan(input({ aiImageCounts: { 'S1-a': 12, 'S2-b': 0 }, rowNotes: { 'S1-a': 'A 产品近景' } }));
  assert.equal(plan.error, undefined);
  assert.equal(plan.totalScripts, 100);
  assert.equal(plan.totalAiImages, 95);
  assert.equal(plan.scenes[0].assignments.find(row => row.modelId === 'a').aiImageCount, 12);
  assert.equal(plan.scenes[1].assignments.find(row => row.modelId === 'b').aiImageCount, 0);
  assert.equal(plan.scenes[0].assignments.find(row => row.modelId === 'a').note, 'A 产品近景');
  assert.equal(plan.scenes[0].assignments.find(row => row.modelId === 'b').note, '');
});

test('a scene limit below the arithmetic minimum blocks an invalid notice board', () => {
  assert.equal(minimumSceneCount(models, 10), 3);
  const plan = buildScenePlan(input({ sceneCount: 2 }));
  assert.match(plan.error, /至少需要 3 个场景/);
  assert.equal(plan.scenes.length, 0);
});

test('uneven quantities distribute deterministically without exceeding the cap', () => {
  const plan = buildScenePlan(input({ models: [{ id: 'x', name: 'X', targetCount: 23 }] }));
  assert.deepEqual(plan.scenes.map(scene => scene.totalCount), [8, 8, 7]);
  assert.deepEqual(plan.scenes.map(scene => scene.assignments[0].productAssetKey), ['S1-x', 'S2-x', 'S3-x']);
});

test('every selected scene retains each product, even when its script allocation is zero', () => {
  const plan = buildScenePlan(input({ sceneCount: 4, models: [{ id: 'x', name: 'X', targetCount: 2 }] }));
  assert.equal(plan.blankAssets, 4);
  assert.equal(plan.productAssets, 4);
  assert.equal(plan.scenes[2].totalCount, 0);
  assert.equal(plan.scenes[2].assignments.length, 1);
  assert.equal(plan.scenes[2].assignments[0].aiImageCount, 1);
});

test('distinct Brief products remain distinct even with the same model name', () => {
  const products = modelsFromProject([
    { id: 'brief-1', name: '甲产品', productName: '甲产品', productModel: 'X1' },
    { id: 'brief-2', name: '乙产品', productName: '乙产品', productModel: 'X1' },
  ], [{ id: 'script-1', briefId: 'brief-1' }]);
  assert.equal(products.length, 2);
  assert.deepEqual(products.map(product => product.targetCount), [1, 0]);
  const plan = buildScenePlan(input({ models: products }));
  assert.equal(plan.scenes.length, 3);
  assert.equal(plan.scenes[0].assignments.length, 2);
  assert.equal(plan.scenes[0].assignments[0].productName, '甲产品');
  assert.equal(plan.scenes[0].assignments[1].productName, '乙产品');
  assert.equal(plan.totalAiImages, 6);
});

test('invalid counts and duplicate IDs are rejected', () => {
  assert.match(buildScenePlan(input({ perSceneCap: 0 })).error, /上限/);
  assert.match(buildScenePlan(input({ models: [{ id: 'x', name: 'A', targetCount: 1 }, { id: 'x', name: 'a', targetCount: 1 }] })).error, /不能重复/);
  assert.match(buildScenePlan(input({ models: [{ id: 'x', name: 'X', targetCount: -1 }] })).error, /整数/);
  assert.match(buildScenePlan(input({ aiImageCounts: { 'S1-a': -1 } })).error, /AI 生图张数/);
});
