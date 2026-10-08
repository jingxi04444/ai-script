import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const load = async name => {
  const source = readFileSync(new URL(name, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
};
const sceneCore = await load('./directorScene.ts');
const { applyDirectorAiLayout, directorLayoutRequest } = await load('./directorAiLayout.ts');

test('AI layout changes only known unlocked objects and camera', () => {
  const scene = sceneCore.createDirectorScene('product');
  const product = scene.objects.find(item => item.kind === 'product');
  const actor = scene.objects.find(item => item.kind === 'actor');
  actor.locked = true;
  const response = JSON.stringify({ objects: [
    { id: product.id, position: [1, 0.4, 0] },
    { id: actor.id, position: [9, 0, 0] },
    { id: 'unknown', position: [2, 2, 2] },
  ], camera: { id: scene.cameras[0].id, position: [0, 2, 5], target: [1, 1, 0], fov: 35 }, summary: '产品靠右，镜头对准主体' });
  const result = applyDirectorAiLayout(scene, response);
  assert.equal(result.changed, true);
  assert.deepEqual(result.scene.objects.find(item => item.id === product.id).position, [1, 0.4, 0]);
  assert.deepEqual(result.scene.objects.find(item => item.id === actor.id).position, actor.position);
  assert.deepEqual(result.scene.cameras[0].target, [1, 1, 0]);
  assert.equal(scene.objects.find(item => item.id === product.id).position[0], 0);
});

test('AI request omits image data and malformed coordinates are ignored', () => {
  const scene = sceneCore.createDirectorScene('product');
  scene.panoramaUrl = 'data:image/png;base64,sensitive';
  assert.ok(!directorLayoutRequest(scene, '产品靠右').prompt.includes('sensitive'));
  const response = JSON.stringify({ objects: [{ id: scene.objects[0].id, position: [Infinity, 0, 0] }] });
  assert.equal(applyDirectorAiLayout(scene, response).changed, false);
});
