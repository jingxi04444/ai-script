import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const load = async name => {
  const source = readFileSync(new URL(name, import.meta.url), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
};
const core = await load('./directorScene.ts');
const { planDirectorLayout } = await load('./directorLayout.ts');

test('scene description moves existing product and actor and reframes the active camera', () => {
  const scene = core.createDirectorScene('product');
  scene.objects[0].position = [2, 0.4, 1];
  const result = planDirectorLayout(scene, '把产品瓶放在展台中央，角色站在右侧，机位俯拍并对准产品。');
  assert.equal(result.changed, true);
  assert.deepEqual(result.scene.objects[0].position, [0, 0.4, 0]);
  assert.equal(result.scene.objects.find(item => item.kind === 'actor').position[0], 1.55);
  assert.deepEqual(result.scene.cameras[0].target, [0, 1, 0]);
  assert.ok(result.scene.cameras[0].position[1] > 4);
  assert.equal(result.scene.objects.length, scene.objects.length);
  assert.deepEqual(scene.objects[0].position, [2, 0.4, 1], 'planning must not mutate the original scene');
});

test('locked objects are skipped and unsupported instructions do not modify the scene', () => {
  const scene = core.createDirectorScene('product');
  scene.objects[0].locked = true;
  const locked = planDirectorLayout(scene, '产品放在右侧');
  assert.equal(locked.changed, false);
  assert.match(locked.summary, /已锁定/);
  assert.equal(planDirectorLayout(scene, '调成更高级的感觉').changed, false);
});

test('moving a keyframed object translates its animation instead of snapping it back', () => {
  const scene = core.createDirectorScene('product');
  const product = scene.objects[0];
  product.keyframes = [{ id: 'key-1', time: 0, position: [2, 0.4, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }];
  const result = planDirectorLayout(scene, '产品放在右侧');
  assert.equal(result.scene.objects[0].position[0], 1.55);
  assert.equal(result.scene.objects[0].position[1], 0, 'a product moved off the podium must rest on the floor');
  assert.equal(result.scene.objects[0].keyframes[0].position[0], 3.55);
  assert.equal(result.scene.objects[0].keyframes[0].position[1], 0);
  assert.equal(product.keyframes[0].position[0], 2);
});

test('an object mentioned only as a spatial reference does not move', () => {
  const scene = core.createDirectorScene('product');
  const productBefore = [...scene.objects.find(item => item.kind === 'product').position];
  const actorBefore = [...scene.objects.find(item => item.kind === 'actor').position];
  const actor = planDirectorLayout(scene, '角色站在产品左侧');
  assert.deepEqual(actor.scene.objects.find(item => item.kind === 'product').position, productBefore);
  assert.equal(actor.scene.objects.find(item => item.kind === 'actor').position[0], -1.55);
  const camera = planDirectorLayout(scene, '机位在产品右侧');
  assert.deepEqual(camera.scene.objects.find(item => item.kind === 'product').position, productBefore);
  assert.deepEqual(camera.scene.objects.find(item => item.kind === 'actor').position, actorBefore);
  assert.ok(camera.scene.cameras[0].position[0] > 0);
});
