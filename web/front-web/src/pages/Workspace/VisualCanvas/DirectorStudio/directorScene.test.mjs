import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

// Keep the serializable scene core testable without loading React, Three.js or a browser.
const source = readFileSync(new URL('./directorScene.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } });
const core = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const librarySource = readFileSync(new URL('./directorLibraryConfig.ts', import.meta.url), 'utf8');
const libraryCode = ts.transpileModule(librarySource, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText;
const library = await import(`data:text/javascript;base64,${Buffer.from(libraryCode).toString('base64')}`);

test('the left rail matches the reference ordering and does not contain animation or combined settings', () => {
  assert.deepEqual(library.DIRECTOR_TOOLS.map(tool => tool.label), ['场景', '添加角色', '添加机位', '全景图', '选择画幅比例', 'AI 识图导入']);
  assert.equal(new Set(library.DIRECTOR_TOOLS.map(tool => tool.key)).size, 6);
  assert.equal(new Set(library.DIRECTOR_TOOLS.map(tool => tool.icon)).size, 6);
});

test('all seven ratios round-trip and adaptive shots use the actual viewport', () => {
  for (const ratio of library.DIRECTOR_RATIOS) {
    const scene = { ...core.createDirectorScene(), aspectRatio: ratio.value };
    assert.equal(core.normalizeDirectorScene(scene).aspectRatio, ratio.value);
    assert.ok(core.directorAspectValue(ratio.value) > 0);
  }
  assert.equal(core.directorAspectValue('21:9'), 21 / 9);
  assert.equal(core.directorAspectValue('3:4'), 3 / 4);
  assert.equal(core.directorAspectValue('auto', 2.5), 2.5);
  assert.equal(core.directorAspectValue('auto', 0), 16 / 9);
});

test('supported character proportions are finite, positive and distinct', () => {
  assert.equal(library.DIRECTOR_ACTOR_PRESETS.length, 7);
  for (const preset of library.DIRECTOR_ACTOR_PRESETS) assert.ok(preset.scale.every(value => Number.isFinite(value) && value > 0));
  assert.equal(new Set(library.DIRECTOR_ACTOR_PRESETS.map(preset => JSON.stringify(preset.scale))).size, 7);
});

test('camera templates contain valid distinct framing and preserve the Dutch roll on reopen', () => {
  assert.equal(library.DIRECTOR_CAMERA_PRESETS.length, 15);
  const shots = library.DIRECTOR_CAMERA_PRESETS.slice(1).map(preset => {
    assert.ok([...preset.values.position, ...preset.values.target, preset.values.fov].every(Number.isFinite));
    return JSON.stringify(preset.values);
  });
  assert.equal(new Set(shots).size, 14);
  const scene = core.createDirectorScene();
  scene.cameras[0] = { ...scene.cameras[0], ...library.DIRECTOR_CAMERA_PRESETS.at(-1).values };
  assert.equal(core.normalizeDirectorScene(scene).cameras[0].roll, 15);
});

test('camera visibility and lock state round-trip with safe defaults for old scenes', () => {
  const scene = core.createDirectorScene();
  assert.equal(scene.cameras[0].visible, true);
  assert.equal(scene.cameras[0].locked, false);
  const hidden = { ...scene, cameras: [{ ...scene.cameras[0], visible: false, locked: true }] };
  assert.equal(core.normalizeDirectorScene(hidden).cameras[0].visible, false);
  assert.equal(core.normalizeDirectorScene(hidden).cameras[0].locked, true);
  const legacy = { ...scene, cameras: [{ ...scene.cameras[0], visible: undefined, locked: undefined }] };
  assert.equal(core.normalizeDirectorScene(legacy).cameras[0].visible, true);
  assert.equal(core.normalizeDirectorScene(legacy).cameras[0].locked, false);
});

test('camera preset highlighting follows actual framing after selection, edits and reopening', () => {
  const camera = core.createDirectorCamera();
  assert.equal(library.getDirectorCameraPresetIndex(undefined), -1);
  for (let index = 1; index < library.DIRECTOR_CAMERA_PRESETS.length; index += 1) {
    const shot = { ...camera, ...library.DIRECTOR_CAMERA_PRESETS[index].values, name: '用户改名后的机位' };
    assert.equal(library.getDirectorCameraPresetIndex(shot), index);
    const scene = { ...core.createDirectorScene(), cameras: [shot], activeCameraId: shot.id };
    assert.equal(library.getDirectorCameraPresetIndex(core.normalizeDirectorScene(scene).cameras[0]), index);
    assert.equal(library.getDirectorCameraPresetIndex({ ...shot, fov: shot.fov + 1 }), -1);
  }
  const closeup = { ...camera, ...library.DIRECTOR_CAMERA_PRESETS[2].values };
  const overhead = { ...camera, ...library.DIRECTOR_CAMERA_PRESETS[8].values };
  assert.equal(library.getDirectorCameraPresetIndex(overhead), 8);
  assert.equal(library.getDirectorCameraPresetIndex(closeup), 2, 'selecting an old shot must clear the last-added card highlight');
});

test('panorama import preserves safe image locations, bounds embedded images and rejects active URLs', () => {
  const scene = core.createDirectorScene();
  for (const url of ['https://example.com/panorama.jpg', '/uploads/panorama.webp', 'data:image/jpeg;base64,AA==']) {
    assert.equal(core.normalizeDirectorScene({ ...scene, panoramaUrl: url }).panoramaUrl, url);
  }
  for (const url of ['javascript:alert(1)', 'data:text/html;base64,AA==', '//evil.test/pano.jpg', 'data:image/jpeg;base64,' + 'a'.repeat(1_000_001)]) {
    assert.equal(core.normalizeDirectorScene({ ...scene, panoramaUrl: url }).panoramaUrl, undefined);
  }
});

test('the real Three mannequin bends its waving arm, stays grounded and updates without rebuilding', async () => {
  const THREE = await import('three');
  const coreUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`;
  const actorSource = readFileSync(new URL('./directorActor.ts', import.meta.url), 'utf8');
  const actorCode = ts.transpileModule(actorSource, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText
    .replace("from 'three'", `from '${import.meta.resolve('three')}'`)
    .replace("from './directorScene'", `from '${coreUrl}'`);
  const { createDirectorActor, updateDirectorActor } = await import(`data:text/javascript;base64,${Buffer.from(actorCode).toString('base64')}`);
  const object = core.createDirectorObject('actor');
  const rig = createDirectorActor(object, new THREE.MeshStandardMaterial({ color: object.color }));
  const pivots = rig.userData.jointPivots;
  const count = rig.children.length;
  updateDirectorActor(rig, { ...object, pose: 'wave' });
  rig.updateMatrixWorld(true);
  const hand = pivots.get('rightElbow').children.at(-1).getWorldPosition(new THREE.Vector3());
  const head = pivots.get('head').getWorldPosition(new THREE.Vector3());
  assert.ok(hand.y > head.y, 'the waving hand must rise above the head');
  assert.ok(Math.abs(new THREE.Box3().setFromObject(rig).min.y) < 0.001);
  assert.equal(rig.children.length, count);
  assert.equal(rig.userData.jointPivots, pivots);
  for (const preset of core.DIRECTOR_POSES) {
    updateDirectorActor(rig, { ...object, pose: preset.value });
    rig.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(rig);
    assert.ok(Math.abs(bounds.min.y) < 0.001, `${preset.value} must remain grounded`);
    assert.ok([...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite));
  }
});

test('a new studio contains an editable product, actor, pedestal and two valid cameras', () => {
  const scene = core.createDirectorScene('product');
  assert.equal(scene.version, 1);
  assert.deepEqual(scene.objects.map(object => object.kind), ['product', 'cylinder', 'actor']);
  assert.equal(scene.cameras.length, 2);
  assert.ok(scene.cameras.some(camera => camera.id === scene.activeCameraId));
  assert.equal(new Set([...scene.objects, ...scene.cameras].map(item => item.id)).size, 5);
  assert.deepEqual(core.normalizeDirectorScene(JSON.parse(JSON.stringify(scene))), scene);
});

test('new character studios use a dark stage, one blue actor and one camera, without migrating old scenes', () => {
  const scene = core.createDirectorScene();
  assert.equal(scene.background, '#060608');
  assert.deepEqual(scene.objects.map(object => object.kind), ['actor']);
  assert.equal(scene.objects[0].color, '#4f8ef7');
  assert.equal(scene.cameras.length, 1);
  assert.deepEqual(core.normalizeDirectorScene(JSON.parse(JSON.stringify(scene))), scene);
  const legacy = core.createDirectorScene('product');
  assert.deepEqual(core.normalizeDirectorScene(JSON.parse(JSON.stringify(legacy))), legacy);
});

test('all 20 poses are distinct, finite and have complete joint rotations', () => {
  assert.equal(core.DIRECTOR_POSES.length, 20);
  const configurations = core.DIRECTOR_POSES.map(pose => {
    const angles = core.directorPoseJoints(pose.value);
    assert.equal(Object.keys(angles).length, 11);
    assert.ok(Object.values(angles).flat().every(value => Number.isFinite(value) && Math.abs(value) <= 180));
    return JSON.stringify(angles);
  });
  assert.equal(new Set(configurations).size, 20);
});

test('a preset keyframe resets old joint overrides while legacy transform keys inherit them', () => {
  const object = { ...core.createDirectorObject('actor'), pose: 'wave', joints: { head: [25, 0, 0] } };
  const frame = { id: 'key', time: 1, position: object.position, rotation: object.rotation, scale: object.scale };
  const preset = core.evaluateDirectorObject({ ...object, keyframes: [{ ...frame, pose: 'neutral' }] }, 1);
  assert.deepEqual(preset.joints.head, [0, 0, 0]);
  const legacy = core.evaluateDirectorObject({ ...object, keyframes: [frame] }, 1);
  assert.equal(legacy.pose, 'wave');
  assert.deepEqual(core.directorPoseJoints(legacy.pose, legacy.joints).head, [25, 0, 0]);
});

test('joint overrides are clamped, serializable, isolated and preserve legacy poses', () => {
  const scene = core.createDirectorScene();
  scene.objects[0].joints = { head: [30, 400, Infinity], unknown: [1, 2, 3] };
  const normalized = core.normalizeDirectorScene(scene);
  assert.deepEqual(normalized.objects[0].joints, { head: [30, 180, 0] });
  assert.deepEqual(core.normalizeDirectorScene(JSON.parse(JSON.stringify(normalized))), normalized);
  const angles = core.directorPoseJoints('wave', { head: [10, 20, 30] });
  angles.head[0] = 55;
  assert.deepEqual(core.directorPoseJoints('wave', { head: [10, 20, 30] }).head, [10, 20, 30]);
  assert.notDeepEqual(core.directorPoseJoints('wave').rightShoulder, [0, 0, 0]);
});

test('actor keyframes interpolate joint poses as well as position and scale', () => {
  const actor = core.createDirectorObject('actor');
  actor.keyframes = [
    { id: 'a', time: 0, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], pose: 'neutral', joints: { head: [0, 0, 0] } },
    { id: 'b', time: 2, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], pose: 'wave', joints: { head: [40, 20, 0] } },
  ];
  const sampled = core.evaluateDirectorObject(actor, 1);
  assert.deepEqual(sampled.joints.head, [20, 10, 0]);
  assert.equal(sampled.joints.rightShoulder[2], 61);
  const saved = core.normalizeDirectorScene({ ...core.createDirectorScene(), objects: [actor] });
  assert.deepEqual(saved.objects[0].keyframes, actor.keyframes);
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
