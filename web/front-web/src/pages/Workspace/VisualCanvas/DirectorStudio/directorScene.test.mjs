import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Keep the serializable scene core testable without loading React, Three.js or a browser.
const source = readFileSync(new URL('./directorScene.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } });
const core = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('a new studio contains an editable product, actor, pedestal and two valid cameras', () => {
  const scene = core.createDirectorScene();
  assert.equal(scene.version, 1);
  assert.deepEqual(scene.objects.map(object => object.kind), ['product', 'cylinder', 'actor']);
  assert.equal(scene.cameras.length, 2);
  assert.ok(scene.cameras.some(camera => camera.id === scene.activeCameraId));
  assert.equal(new Set([...scene.objects, ...scene.cameras].map(item => item.id)).size, 5);
  assert.deepEqual(core.normalizeDirectorScene(JSON.parse(JSON.stringify(scene))), scene);
});

test('normalization validates colors, finite numbers, dimensions and unique identities', () => {
  const normalized = core.normalizeDirectorScene({
    duration: Infinity, aspectRatio: 'invalid', background: 'url(unsafe)', activeCameraId: 'missing',
    objects: [
      { id: 'same', kind: 'product', position: [NaN, 2, 5000], scale: [-2, 0, 500], color: 'red' },
      { id: 'same', kind: 'unknown', name: '', visible: false, locked: true },
    ],
    cameras: [],
  });
  assert.equal(normalized.duration, 6);
  assert.equal(normalized.aspectRatio, '16:9');
  assert.equal(normalized.background, '#151d21');
  assert.deepEqual(normalized.objects[0].position, [0, 2, 1000]);
  assert.deepEqual(normalized.objects[0].scale, [0.02, 0.02, 100]);
  assert.equal(normalized.objects[0].color, '#3c8177');
  assert.equal(normalized.objects[1].kind, 'box');
  assert.equal(normalized.objects[1].visible, false);
  assert.equal(normalized.objects[1].locked, true);
  assert.notEqual(normalized.objects[0].id, normalized.objects[1].id);
  assert.equal(normalized.activeCameraId, normalized.cameras[0].id);
});

test('normalization limits imports and keeps an intentionally empty stage empty', () => {
  const limited = core.normalizeDirectorScene({ objects: Array.from({ length: 110 }, () => ({})), cameras: Array.from({ length: 20 }, () => ({})), duration: 300 });
  assert.equal(limited.objects.length, 100);
  assert.equal(limited.cameras.length, 16);
  assert.equal(limited.duration, 120);
  assert.equal(core.normalizeDirectorScene({ objects: [], cameras: [] }).objects.length, 0);
});

test('keyframes are sorted, clamped to scene duration and deduplicated by time', () => {
  const normalized = core.normalizeDirectorScene({ duration: 6, objects: [{ kind: 'box', keyframes: [{ time: 9 }, { time: -3 }, { time: 2 }, { time: 2, position: [2, 3, 4] }] }] });
  assert.deepEqual(normalized.objects[0].keyframes.map(frame => frame.time), [0, 2, 6]);
  assert.deepEqual(normalized.objects[0].keyframes[1].position, [2, 3, 4]);
});

test('object transforms interpolate and rotations cross 360 by the shortest arc', () => {
  const object = core.createDirectorObject('product');
  object.keyframes = [
    { id: 'a', time: 0, position: [0, 0, 0], rotation: [0, 350, 0], scale: [1, 1, 1] },
    { id: 'b', time: 4, position: [4, 2, 0], rotation: [0, 10, 0], scale: [2, 2, 2] },
  ];
  const evaluated = core.evaluateDirectorObject(object, 2);
  assert.deepEqual(evaluated.position, [2, 1, 0]);
  assert.deepEqual(evaluated.rotation, [0, 360, 0]);
  assert.deepEqual(evaluated.scale, [1.5, 1.5, 1.5]);
  assert.deepEqual(core.evaluateDirectorObject(object, -1).position, [0, 0, 0]);
  assert.deepEqual(core.evaluateDirectorObject(object, 5).position, [4, 2, 0]);
  assert.deepEqual(object.position, [0, 0, 0]);
  assert.notStrictEqual(evaluated, object);
});

test('camera keys interpolate position, look-at target and field of view', () => {
  const camera = core.createDirectorCamera();
  assert.strictEqual(core.evaluateDirectorCamera(camera, 2), camera);
  camera.keyframes = [
    { id: 'a', time: 0, position: [0, 2, 6], target: [0, 1, 0], fov: 40 },
    { id: 'b', time: 4, position: [2, 4, 4], target: [0, 2, 0], fov: 60 },
  ];
  const evaluated = core.evaluateDirectorCamera(camera, 2);
  assert.deepEqual(evaluated.position, [1, 3, 5]);
  assert.deepEqual(evaluated.target, [0, 1.5, 0]);
  assert.equal(evaluated.fov, 50);
  assert.equal(core.directorAspectValue('16:9'), 16 / 9);
  assert.equal(core.directorAspectValue('9:16'), 9 / 16);
  assert.equal(core.directorAspectValue('1:1'), 1);
});
