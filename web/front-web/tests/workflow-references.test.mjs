import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/utils/workflowReferences.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } });
const { referenceKinds, referenceSelectionPatch } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const base = { kind: 'video', title: '视频', description: '', status: 'idle' };
const titleFor = id => `素材 ${id}`;

test('video first and last frames are independent and replace only their own role', () => {
  const first = { ...base, ...referenceSelectionPatch(base, ['a'], titleFor, 'firstFrame') };
  const both = { ...first, ...referenceSelectionPatch(first, ['b'], titleFor, 'lastFrame') };
  assert.deepEqual(both.referenceNodeIds, ['a', 'b']);
  assert.equal(both.firstFrameNodeId, 'a');
  assert.equal(both.lastFrameNodeId, 'b');
  const replaced = { ...both, ...referenceSelectionPatch(both, ['c'], titleFor, 'firstFrame') };
  assert.deepEqual(replaced.referenceNodeIds, ['b', 'c']);
  assert.deepEqual(replaced.referenceLabels, ['素材 b', '素材 c']);
  assert.equal(replaced.lastFrameNodeId, 'b');
});

test('removing one frame preserves the other when the same image is used in both roles', () => {
  const both = { ...base, firstFrameNodeId: 'a', lastFrameNodeId: 'a', referenceNodeIds: ['a'], referenceLabels: ['素材 a'] };
  const removed = { ...both, ...referenceSelectionPatch(both, [], titleFor, 'firstFrame') };
  assert.equal(removed.firstFrameNodeId, undefined);
  assert.equal(removed.lastFrameNodeId, 'a');
  assert.deepEqual(removed.referenceNodeIds, ['a']);
});

test('reference titles stay aligned with IDs after selection order changes', () => {
  const patch = referenceSelectionPatch(base, ['b', 'a', 'b'], titleFor);
  assert.deepEqual(patch.referenceNodeIds, ['b', 'a']);
  assert.deepEqual(patch.referenceLabels, ['素材 b', '素材 a']);
});

test('clearing generic references also clears stale video frame roles', () => {
  const data = { ...base, firstFrameNodeId: 'a', firstFrameLabel: '素材 a', lastFrameNodeId: 'b', lastFrameLabel: '素材 b' };
  const patch = referenceSelectionPatch(data, [], titleFor);
  assert.equal(patch.firstFrameNodeId, undefined);
  assert.equal(patch.lastFrameLabel, undefined);
  assert.deepEqual(patch.referenceNodeIds, []);
});

test('audio references include audio and text, while video frame roles accept visual resources only', () => {
  const audio = referenceKinds('voice', 'reference');
  assert.ok(audio.has('music') && audio.has('text'));
  assert.ok(!audio.has('image'));
  const frame = referenceKinds('video', 'reference', 'firstFrame');
  assert.ok(frame.has('image') && frame.has('character'));
  assert.ok(!frame.has('voice') && !frame.has('text'));
});
