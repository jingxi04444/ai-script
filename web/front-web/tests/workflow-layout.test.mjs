import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

const ts = createRequire(import.meta.url)('typescript');
const source = await readFile(new URL('../src/utils/workflowLayout.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { arrangeWorkflowNodes: arrange } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
const node = (id, width = 340, height = 300, extra = {}) => ({
  id, position: { x: -500, y: -500 }, data: { prompt: '保留提示词', referenceNodeIds: ['resource'] },
  measured: { width, height }, ...extra,
});
const edge = (source, target) => ({ id: `${source}-${target}`, source, target });
const nonOverlapping = nodes => {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      assert.ok(a.position.x + a.measured.width <= b.position.x
        || b.position.x + b.measured.width <= a.position.x
        || a.position.y + a.measured.height <= b.position.y
        || b.position.y + b.measured.height <= a.position.y, `${a.id} overlaps ${b.id}`);
    }
  }
};

test('connected nodes follow dependencies, not kind or original array order', () => {
  const input = [node('video'), node('image', 560, 480), node('text')];
  const result = arrange(input, [edge('text', 'image'), edge('image', 'video')]);
  const byId = new Map(result.map(n => [n.id, n]));
  assert.ok(byId.get('text').position.x < byId.get('image').position.x);
  assert.ok(byId.get('image').position.x + 560 < byId.get('video').position.x);
  nonOverlapping(result);
  assert.equal(result[0].data, input[0].data);
  assert.deepEqual(input[0].position, { x: -500, y: -500 });
});

test('large resources, branches and disconnected nodes never overlap', () => {
  const input = [node('product', 520, 650), node('character', 720, 460), node('image', 450, 700),
    node('video', 380, 420), node('loose1', 900, 600), node('loose2', 300, 900)];
  const result = arrange(input, [edge('product', 'image'), edge('character', 'image'), edge('image', 'video')]);
  nonOverlapping(result);
  assert.ok(result[4].position.y > Math.max(...result.slice(0, 4).map(n => n.position.y + n.measured.height)));
});

test('cycles finish deterministically, with downstream nodes in the next column', () => {
  const input = [node('a'), node('b'), node('c')];
  const edges = [edge('a', 'b'), edge('b', 'a'), edge('b', 'c')];
  const result = arrange(input, edges);
  assert.equal(result[0].position.x, result[1].position.x);
  assert.ok(result[2].position.x > result[1].position.x);
  assert.deepEqual(arrange(result, edges), result);
  nonOverlapping(result);
});

test('100 independent shots use a compact three-column grid', () => {
  const result = arrange(Array.from({ length: 100 }, (_, i) => node(String(i), 320 + i % 5 * 40, 300 + i % 3 * 80)), []);
  assert.equal(new Set(result.map(n => n.position.x)).size, 3);
  nonOverlapping(result);
});

test('empty, hidden, missing endpoints, duplicate edges and self-links are safe', () => {
  assert.deepEqual(arrange([], []), []);
  const hidden = node('hidden', 500, 500, { hidden: true });
  const result = arrange([node('a'), node('b'), hidden], [edge('a', 'b'), edge('a', 'b'), edge('missing', 'a'), edge('b', 'b')]);
  assert.equal(result[2], hidden);
  nonOverlapping(result.slice(0, 2));
  assert.ok(Number.isFinite(arrange([{ id: 'unmeasured', position: { x: 0, y: 0 }, data: {} }], [])[0].position.x));
});
