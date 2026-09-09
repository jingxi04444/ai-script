import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test, { afterEach, beforeEach } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');

// Load the real TypeScript store in memory. No generated build files, mocked
// Zustand actions, browser storage, API requests, or browser process are used.
const moduleUrls = new Map();
async function sourceModuleUrl(sourceUrl) {
  const key = sourceUrl.href;
  if (moduleUrls.has(key)) return moduleUrls.get(key);
  const source = await readFile(sourceUrl, 'utf8');
  const compiled = ts.transpileModule(source, {
    fileName: fileURLToPath(sourceUrl),
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const parsed = ts.createSourceFile(key, compiled, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  const replacements = await Promise.all(parsed.statements
    .filter(statement => (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement))
      && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier))
    .map(async statement => {
      const specifier = statement.moduleSpecifier.text;
      let url;
      if (specifier.startsWith('.')) {
        const base = fileURLToPath(new URL(specifier, sourceUrl));
        let resolved;
        for (const candidate of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`]) {
          try {
            await readFile(candidate, 'utf8');
            resolved = pathToFileURL(candidate);
            break;
          } catch (error) {
            if (error.code !== 'ENOENT' && error.code !== 'EISDIR') throw error;
          }
        }
        if (!resolved) throw new Error(`Cannot resolve ${specifier} from ${sourceUrl}`);
        url = await sourceModuleUrl(resolved);
      } else {
        // Preserve the package's actual ESM import condition (not its CJS build).
        url = import.meta.resolve(specifier);
      }
      return { start: statement.moduleSpecifier.getStart(parsed), end: statement.moduleSpecifier.end, url };
    }));
  let output = compiled;
  for (const replacement of replacements.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, replacement.start) + JSON.stringify(replacement.url) + output.slice(replacement.end);
  }
  const url = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
  moduleUrls.set(key, url);
  return url;
}

const { useWorkflowStore: store } = await import(await sourceModuleUrl(new URL('../src/stores/workflowStore.ts', import.meta.url)));
const { createWorkflowNodeData } = await import(await sourceModuleUrl(new URL('../src/types/workflow.ts', import.meta.url)));
const { workflowResourceImageUrl, characterResourceImages, withoutDeletedNodeReferences } = await import(
  await sourceModuleUrl(new URL('../src/utils/workflowCreativeResource.ts', import.meta.url)),
);
const initialState = store.getState();
let savedStorageDescriptor;
let memoryStorage;

beforeEach(() => {
  savedStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map();
  memoryStorage = {
    get length() { return values.size; },
    key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(String(key)) ?? null,
    setItem: (key, value) => values.set(String(key), String(value)),
    removeItem: key => values.delete(String(key)),
    clear: () => values.clear(),
  };
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: memoryStorage });
  store.setState({ ...initialState, projectKey: 'character-store-test', nodes: [], edges: [], past: [], future: [] }, true);
});

afterEach(() => {
  store.setState(initialState, true);
  if (savedStorageDescriptor) Object.defineProperty(globalThis, 'localStorage', savedStorageDescriptor);
  else delete globalThis.localStorage;
});

const viewLabels = ['全身图', '面部特写', '表情九宫格', '多角度设定图', '动作参考'];
const character = (overrides = {}) => ({
  id: '1871234567890123456', code: 'character-lin', type: 'character', name: '林晓',
  category: '生活方式', description: '保持人物五官与服装一致。',
  coverUrl: '/creative-library/lin-portrait.png',
  gallery: viewLabels.map((label, index) => ({ label, url: `/creative-library/lin-view-${index}.png` })),
  tags: ['角色参考'], prompt: '保持相同角色身份与衣着。', negativePrompt: '不同角色、五官漂移',
  config: { identity: { preserve: ['face', 'clothes'] } }, status: 'published', sortOrder: 10,
  licenseNote: '仅供测试', author: '测试作者', ...overrides,
});
const makeNode = (id, kind, data = {}) => ({
  id, type: 'workflow', position: { x: 800, y: 100 }, selected: false,
  data: { ...createWorkflowNodeData(kind), title: `${kind} ${id}`, ...data },
});
const nodeById = id => store.getState().nodes.find(node => node.id === id);
const characterNodes = () => store.getState().nodes.filter(node => node.data.kind === 'character');
const graph = () => structuredClone({ nodes: store.getState().nodes, edges: store.getState().edges });
const viewTitle = (name, label) => new RegExp(`^${name}\\s*·\\s*${label}$`);

function expectAtomicFailure(action, message) {
  const before = store.getState();
  const beforeGraph = graph();
  assert.throws(action, undefined, message);
  assert.equal(store.getState(), before, 'rejected application must not call set/checkpoint');
  assert.deepEqual(graph(), beforeGraph, 'rejected application must not mutate nested data');
}

function seedTarget(kind = 'image') {
  const previous = makeNode('previous-source', 'product', { title: '已有产品参考', assetUrl: '/product.png' });
  const target = makeNode('generation-target', kind, {
    referenceNodeIds: [previous.id], referenceLabels: [previous.data.title],
    referenceMarks: [{ nodeId: previous.id, nodeTitle: previous.data.title, parts: ['包装文字'] }],
  });
  store.setState({
    nodes: [previous, target],
    edges: [{ id: 'previous-edge', source: previous.id, target: target.id, animated: true }],
  });
  return target.id;
}

test('one application creates independent gallery nodes including custom references with one checkpoint and a shared bundle', () => {
  const resource = character();
  const before = graph();
  const id = store.getState().applyCreativeResource(resource, { position: { x: 40, y: 80 } });
  const nodes = characterNodes();
  assert.equal(nodes.length, 5);
  assert.equal(id, nodes[0].id, 'returning the first ID preserves the existing caller contract');
  assert.equal(new Set(nodes.map(node => node.id)).size, 5);
  assert.equal(new Set(nodes.map(node => node.data.resourceBundleId)).size, 1);
  assert.ok(nodes[0].data.resourceBundleId, 'every set has a non-empty identity');
  assert.equal(new Set(nodes.map(node => `${node.position.x},${node.position.y}`)).size, 5, 'views do not overlap at one position');
  assert.equal(store.getState().past.length, 1);
  assert.deepEqual(store.getState().past[0], before);
  assert.ok(nodes.every(node => node.selected));
  nodes.forEach((node, index) => {
    const image = resource.gallery[index];
    assert.equal(node.data.creativeResourceId, resource.id);
    assert.equal(node.data.resourceId, resource.id);
    assert.equal(node.data.resourceName, resource.name);
    assert.equal(node.data.resourceViewLabel, image.label);
    assert.match(node.data.title, viewTitle(resource.name, image.label));
    assert.equal(node.data.assetUrl, image.url);
    assert.equal(node.data.resourceCoverUrl, image.url);
    assert.deepEqual(node.data.resourceGallery, [image], 'each node contributes only its own image downstream');
    assert.notEqual(node.data.resourceGallery[0], image);
    assert.deepEqual(node.data.resourceConfig, resource.config);
    assert.notEqual(node.data.resourceConfig, resource.config);
    assert.equal(node.data.resourcePrompt, resource.prompt);
    assert.equal(node.data.resourceNegativePrompt, resource.negativePrompt);
  });
});

test('old composite boards stay in the library but are never automatically applied or connected', () => {
  const standardViews = character().gallery.slice(0, 4);
  const resource = character({ gallery: [
    { label: ' 旧综合设定板（正侧背与六种表情） ', url: '/old-board.png' },
    ...standardViews,
    { label: '旧综合设定板', url: '/older-board.png' },
  ] });
  const originalGallery = structuredClone(resource.gallery);
  const targetId = seedTarget();
  store.getState().applyCreativeResource(resource, { targetNodeId: targetId });
  assert.deepEqual(characterNodes().map(node => node.data.assetUrl), standardViews.map(image => image.url));
  assert.equal(nodeById(targetId).data.referenceNodeIds.length, 5, 'four views plus the existing product');
  assert.equal(store.getState().edges.length, 5);
  assert.deepEqual(resource.gallery, originalGallery, 'optional library material is preserved');
  assert.deepEqual(characterResourceImages({ gallery: [originalGallery[0]], coverUrl: '/old-board.png' }), [],
    'a gallery containing only an old board must not fall back to its cover');
});

test('cover duplication, repeated gallery URLs and invalid entries cannot create extra nodes', () => {
  const resource = character({
    coverUrl: '/portrait.png',
    gallery: [
      { label: ' 面部特写 ', url: ' /portrait.png ' },
      { label: '重复肖像', url: '/portrait.png' },
      { label: '全身图', url: 'https://assets.example.test/body.png' },
      ...['', ' ', 'javascript:alert(1)', 'data:image/png;base64,aA==', 'blob:temporary', 'ftp://assets.test/image.png',
        '//evil.example/image.png', 'https://user:secret@example.test/image.png', '/bad image.png', '/bad\\image.png']
        .map((url, index) => ({ label: `无效图 ${index}`, url })),
    ],
  });
  store.getState().applyCreativeResource(resource);
  assert.deepEqual(characterNodes().map(node => node.data.assetUrl), ['/portrait.png', 'https://assets.example.test/body.png']);
  assert.deepEqual(characterNodes().map(node => node.data.resourceViewLabel), ['面部特写', '全身图']);
  assert.equal(store.getState().past.length, 1);
  assert.equal(resource.gallery[0].url, ' /portrait.png ', 'normalization never mutates the catalog result');
});

test('image URL validation accepts durable bounded URLs and rejects transient, credentialed or malformed inputs', () => {
  for (const value of [undefined, null, 123, {}, [], '', '//host/image.png', 'http:/host/image.png',
    'https://', 'https://@example.test/image.png', 'https://user@example.test/image.png',
    'https://:password@example.test/image.png', '/control\u0001.png', '/delete\u007f.png',
    '/control\u0085.png', '/tab\t.png', '/back\\slash.png', 'relative.png', 'file:///image.png',
    'data:image/png;base64,AAAA', 'blob:temporary', `/${'a'.repeat(2048)}`]) {
    assert.equal(workflowResourceImageUrl(value), undefined, `reject ${JSON.stringify(value)}`);
  }
  for (const value of ['/uploads/picture.png', 'https://example.test/image.png?version=2',
    'http://example.test/image.png', `/${'a'.repeat(2047)}`]) {
    assert.equal(workflowResourceImageUrl(` ${value} `), value);
  }
});

test('gallery helper keeps first-occurrence order, labels unlabeled views, and treats an absent gallery as legacy', () => {
  const first = { label: '  面部特写  ', url: ' /face.png ' };
  assert.deepEqual(characterResourceImages({ coverUrl: '/cover.png', gallery: [
    first, { label: '另一个标签', url: '/face.png' }, null,
    { label: '', url: '/body.png' }, { label: ' ', url: '/pose.png' },
  ] }), [
    { label: '面部特写', url: '/face.png' },
    { label: '参考图 2', url: '/body.png' },
    { label: '参考图 3', url: '/pose.png' },
  ]);
  assert.deepEqual(first, { label: '  面部特写  ', url: ' /face.png ' });
  assert.deepEqual(characterResourceImages({ coverUrl: '/cover.png' }), [{ label: '角色参考', url: '/cover.png' }]);
  assert.deepEqual(characterResourceImages({ coverUrl: '/cover.png', gallery: [{ label: '失效', url: 'blob:expired' }] }), []);
});

test('legacy empty gallery uses one valid cover, but a non-empty invalid gallery never silently falls back', () => {
  const legacy = character({ gallery: [], coverUrl: '/legacy-portrait.png' });
  store.getState().applyCreativeResource(legacy);
  assert.equal(characterNodes().length, 1);
  assert.equal(characterNodes()[0].data.assetUrl, legacy.coverUrl);
  assert.equal(characterNodes()[0].data.resourceGallery.length, 1);
  assert.equal(characterNodes()[0].data.resourceGallery[0].url, legacy.coverUrl);
  expectAtomicFailure(() => store.getState().applyCreativeResource(character({
    gallery: [{ label: '失效图库', url: 'blob:expired' }], coverUrl: '/otherwise-valid-cover.png',
  })));
  expectAtomicFailure(() => store.getState().applyCreativeResource(character({ gallery: [], coverUrl: 'data:image/png;base64,AA==' })));
});

test('adding a complete set can be undone and redone as a single operation', () => {
  seedTarget();
  const before = graph();
  store.getState().applyCreativeResource(character());
  const after = graph();
  store.getState().undo();
  assert.deepEqual(graph(), before);
  assert.equal(store.getState().future.length, 1);
  store.getState().redo();
  assert.deepEqual(graph(), after, 'redo restores the same five node IDs and bundle identity');
  assert.equal(store.getState().past.length, 1);
});

for (const kind of ['image', 'video']) {
  test(`${kind} target receives every individual gallery reference and edge without losing existing references`, () => {
    const targetId = seedTarget(kind);
    store.getState().applyCreativeResource(character(), { targetNodeId: targetId });
    const nodes = characterNodes();
    assert.equal(nodes.length, 5);
    const target = nodeById(targetId);
    assert.deepEqual(target.data.referenceNodeIds, ['previous-source', ...nodes.map(node => node.id)]);
    assert.deepEqual(target.data.referenceLabels, ['已有产品参考', ...nodes.map(node => node.data.title)]);
    assert.equal(new Set(target.data.referenceNodeIds).size, 6);
    assert.equal(store.getState().edges.length, 6);
    for (const node of nodes) {
      assert.equal(store.getState().edges.filter(edge => edge.source === node.id && edge.target === targetId).length, 1);
    }
    assert.deepEqual(target.data.referenceMarks, [{ nodeId: 'previous-source', nodeTitle: '已有产品参考', parts: ['包装文字'] }]);
    assert.equal(store.getState().past.length, 1);
    assert.deepEqual(store.getState().nodes.filter(node => node.selected).map(node => node.id), nodes.map(node => node.id));
  });
}

test('draft resources and explicit missing, empty or incompatible targets reject without any graph/history change', () => {
  const targetId = seedTarget();
  store.setState({ nodes: [...store.getState().nodes, makeNode('text-target', 'text')] });
  store.getState().checkpoint();
  expectAtomicFailure(() => store.getState().applyCreativeResource(character({ status: 'draft' }), { targetNodeId: targetId }));
  for (const targetNodeId of ['not-found', '', 'text-target', 'previous-source']) {
    expectAtomicFailure(() => store.getState().applyCreativeResource(character(), { targetNodeId }), `target ${JSON.stringify(targetNodeId)} must reject`);
  }
  expectAtomicFailure(() => store.getState().applyCreativeResource(character(), { nodeId: 'not-found' }));
  expectAtomicFailure(() => store.getState().applyCreativeResource(character(), { nodeId: '' }));
  expectAtomicFailure(() => store.getState().applyCreativeResource(character(), { nodeId: targetId }));
});

test('replacement rejects every cross-resource type change without touching graph or undo/redo history', () => {
  const targetId = seedTarget();
  const resourceTypes = ['character', 'style', 'effect'];
  for (const existingType of resourceTypes) {
    const nodeId = store.getState().applyCreativeResource(character({ type: existingType }), { targetNodeId: targetId });
    store.getState().checkpoint();
    store.getState().undo();
    assert.ok(store.getState().past.length && store.getState().future.length, 'both history directions exist before rejection');
    for (const changedType of resourceTypes.filter(type => type !== existingType)) {
      const before = store.getState();
      const beforeGraph = graph();
      assert.throws(() => store.getState().applyCreativeResource(character({ type: changedType }), { nodeId, targetNodeId: targetId }), /不允许更换节点类型/);
      assert.equal(store.getState(), before, `${existingType} → ${changedType} must not checkpoint, clear redo, or set state`);
      assert.deepEqual(graph(), beforeGraph, 'rejection preserves node data, references, marks, selection and edges');
    }
  }
});

test('applying through an old whole-character node expands every view and preserves downstream references', () => {
  const legacy = makeNode('legacy-character', 'character', {
    creativeResourceId: character().id, resourceGallery: character().gallery, assetUrl: '/old-cover.png',
  });
  const target = makeNode('legacy-video', 'video', { referenceNodeIds: [legacy.id], referenceLabels: ['旧角色'] });
  store.setState({ nodes: [legacy, target], edges: [{ id: 'legacy-edge', source: legacy.id, target: target.id }] });
  const before = graph();
  const firstId = store.getState().applyCreativeResource(character(), { nodeId: legacy.id });
  assert.equal(firstId, legacy.id);
  assert.equal(characterNodes().length, 5);
  assert.equal(new Set(characterNodes().map(node => node.id)).size, 5);
  assert.equal(new Set(characterNodes().map(node => `${node.position.x},${node.position.y}`)).size, 5);
  assert.deepEqual(characterNodes().map(node => node.data.assetUrl), character().gallery.map(image => image.url));
  assert.deepEqual(new Set(nodeById(target.id).data.referenceNodeIds), new Set(characterNodes().map(node => node.id)));
  assert.equal(store.getState().edges.length, 5);
  assert.equal(store.getState().past.length, 1);
  store.getState().undo();
  assert.deepEqual(graph(), before);
});

test('an empty character placeholder also expands a complete gallery rather than just the first photo', () => {
  store.setState({ nodes: [makeNode('empty-character', 'character')] });
  store.getState().applyCreativeResource(character(), { nodeId: 'empty-character' });
  assert.equal(characterNodes().length, 5);
  assert.ok(characterNodes().every(node => node.data.resourceGallery.length === 1));
});

test('a complete imported set avoids covering existing canvas nodes', () => {
  const occupied = makeNode('wide-existing', 'image');
  occupied.measured = { width: 900, height: 600 };
  store.setState({ nodes: [occupied] });
  store.getState().applyCreativeResource(character(), { position: occupied.position });
  assert.ok(characterNodes().every(node => node.position.x >= occupied.position.x + 900 + 120));
  assert.deepEqual(nodeById(occupied.id).position, occupied.position, 'existing content is never repositioned');
});

test('replacement changes only the requested node, preserves its ID and chooses the same view from the new character', () => {
  const targetId = seedTarget();
  store.getState().applyCreativeResource(character(), { targetNodeId: targetId });
  const portrait = characterNodes().find(node => node.data.resourceViewLabel === '面部特写');
  assert.ok(portrait);
  const siblingsBefore = characterNodes().filter(node => node.id !== portrait.id).map(node => ({ id: node.id, data: structuredClone(node.data), position: { ...node.position } }));
  const otherTarget = makeNode('other-generation', 'video', {
    referenceNodeIds: [portrait.id], referenceLabels: [portrait.data.title],
    referenceMarks: [{ nodeId: portrait.id, nodeTitle: portrait.data.title, parts: ['面部', '发型'] }],
  });
  store.getState().updateNodeData(targetId, {
    referenceMarks: [...nodeById(targetId).data.referenceMarks,
      { nodeId: portrait.id, nodeTitle: portrait.data.title, parts: ['眼睛'] }],
  });
  store.setState({ nodes: [...store.getState().nodes, otherTarget] });
  const beforeNodeCount = store.getState().nodes.length;
  const edgesBefore = store.getState().edges.map(edge => ({ ...edge, selected: false }));
  const historyBefore = store.getState().past.length;
  const replacement = character({
    id: '1871234567890123457', code: 'character-chen', name: '陈默',
    gallery: [{ label: '全身图', url: '/chen-body.png' }, { label: '面部特写', url: '/chen-face.png' }],
  });
  const returnedId = store.getState().applyCreativeResource(replacement, { nodeId: portrait.id, targetNodeId: targetId });
  assert.equal(returnedId, portrait.id);
  assert.equal(store.getState().nodes.length, beforeNodeCount);
  assert.equal(characterNodes().length, 5, 'replacing a view never inserts the new full gallery');
  const replaced = nodeById(portrait.id);
  assert.equal(replaced.data.assetUrl, '/chen-face.png');
  assert.equal(replaced.data.resourceViewLabel, '面部特写');
  assert.equal(replaced.data.resourceName, '陈默');
  assert.match(replaced.data.title, viewTitle('陈默', '面部特写'));
  assert.deepEqual(replaced.data.resourceGallery, [{ label: '面部特写', url: '/chen-face.png' }]);
  assert.deepEqual(replaced.position, portrait.position);
  for (const sibling of siblingsBefore) {
    assert.deepEqual(nodeById(sibling.id).data, sibling.data, 'replacing one view does not rewrite its siblings');
    assert.deepEqual(nodeById(sibling.id).position, sibling.position);
  }
  assert.deepEqual(store.getState().edges, edgesBefore, 'an existing target edge is not duplicated');
  assert.equal(store.getState().past.length, historyBefore + 1);
  for (const id of [targetId, otherTarget.id]) {
    const data = nodeById(id).data;
    assert.equal(data.referenceNodeIds.filter(id => id === portrait.id).length, 1);
    assert.equal(data.referenceLabels[data.referenceNodeIds.indexOf(portrait.id)], replaced.data.title);
    assert.equal(data.referenceMarks.find(mark => mark.nodeId === portrait.id).nodeTitle, replaced.data.title);
  }
  assert.deepEqual(nodeById(otherTarget.id).data.referenceMarks[0].parts, ['面部', '发型']);
});

test('replacement falls back to the first valid gallery view when its previous label is unavailable', () => {
  store.getState().applyCreativeResource(character());
  const portrait = characterNodes().find(node => node.data.resourceViewLabel === '面部特写');
  assert.ok(portrait);
  store.getState().applyCreativeResource(character({ name: '新角色', gallery: [
    { label: '失效图', url: 'blob:expired' }, { label: '全身图', url: '/new-body.png' },
    { label: '多角度设定图', url: '/new-turnaround.png' },
  ] }), { nodeId: portrait.id });
  assert.equal(characterNodes().length, 5);
  assert.equal(nodeById(portrait.id).data.assetUrl, '/new-body.png');
  assert.equal(nodeById(portrait.id).data.resourceViewLabel, '全身图');
});

for (const removal of ['deleteSelection', 'onNodesChange']) {
  test(`${removal} removes only one view and its references/marks/edges; undo and redo restore exact graphs`, () => {
    const targetId = seedTarget();
    store.getState().applyCreativeResource(character(), { targetNodeId: targetId });
    const nodes = characterNodes();
    assert.equal(nodes.length, 5);
    const removed = nodes[2];
    store.getState().updateNodeData(targetId, {
      referenceMarks: [...nodeById(targetId).data.referenceMarks,
        ...nodes.map(node => ({ nodeId: node.id, nodeTitle: node.data.title, parts: ['身份一致'] }))],
    });
    store.setState({ nodes: store.getState().nodes.map(node => ({ ...node, selected: node.id === removed.id })) });
    const before = graph();
    const historyBefore = store.getState().past.length;
    if (removal === 'deleteSelection') store.getState().deleteSelection();
    else store.getState().onNodesChange([{ type: 'remove', id: removed.id }]);
    assert.equal(characterNodes().length, 4);
    assert.equal(nodeById(removed.id), undefined);
    const target = nodeById(targetId);
    const remaining = nodes.filter(node => node.id !== removed.id);
    assert.deepEqual(target.data.referenceNodeIds, ['previous-source', ...remaining.map(node => node.id)]);
    assert.deepEqual(target.data.referenceLabels, ['已有产品参考', ...remaining.map(node => node.data.title)]);
    assert.deepEqual(target.data.referenceMarks.map(mark => mark.nodeId), ['previous-source', ...remaining.map(node => node.id)]);
    assert.ok(store.getState().edges.every(edge => edge.source !== removed.id && edge.target !== removed.id));
    assert.equal(store.getState().edges.length, 5);
    assert.equal(store.getState().past.length, historyBefore + 1);
    const after = graph();
    store.getState().undo();
    assert.deepEqual(graph(), before);
    store.getState().redo();
    assert.deepEqual(graph(), after);
  });
}

test('React Flow selection and position changes do not create removal history or destroy references', () => {
  const targetId = seedTarget();
  store.getState().applyCreativeResource(character(), { targetNodeId: targetId });
  const node = characterNodes()[0];
  const refs = structuredClone(nodeById(targetId).data);
  const historyBefore = store.getState().past.length;
  store.getState().onNodesChange([
    { type: 'select', id: node.id, selected: false },
    { type: 'position', id: node.id, position: { x: 23, y: 45 }, dragging: false },
  ]);
  assert.equal(nodeById(node.id).selected, false);
  assert.deepEqual(nodeById(node.id).position, { x: 23, y: 45 });
  assert.deepEqual(nodeById(targetId).data, refs);
  assert.equal(store.getState().past.length, historyBefore);
});

test('reference cleanup preserves custom label positions and also clears marks without reference IDs', () => {
  const nodes = [
    makeNode('keep', 'product', { title: '保留资源' }),
    makeNode('target', 'image', {
      referenceNodeIds: ['remove', 'keep', 'also-keep'], referenceLabels: ['删除标签', '自定义视图说明', '另一个说明'],
      referenceMarks: [{ nodeId: 'remove', nodeTitle: '删除资源', parts: ['发型'] }],
    }),
    makeNode('marks-only', 'video', {
      referenceMarks: [{ nodeId: 'remove', nodeTitle: '删除资源', parts: ['服装'] },
        { nodeId: 'keep', nodeTitle: '保留资源', parts: ['包装'] }],
    }),
  ];
  const original = structuredClone(nodes);
  const cleaned = withoutDeletedNodeReferences(nodes, new Set(['remove']));
  assert.equal(cleaned[0], nodes[0], 'unaffected nodes keep stable identities');
  assert.deepEqual(cleaned[1].data.referenceNodeIds, ['keep', 'also-keep']);
  assert.deepEqual(cleaned[1].data.referenceLabels, ['自定义视图说明', '另一个说明']);
  assert.deepEqual(cleaned[1].data.referenceMarks, []);
  assert.equal(cleaned[2].data.referenceNodeIds, undefined);
  assert.deepEqual(cleaned[2].data.referenceMarks, [{ nodeId: 'keep', nodeTitle: '保留资源', parts: ['包装'] }]);
  assert.deepEqual(nodes, original, 'cleanup does not mutate snapshots or original data');
});

test('repeated imports create separate bundles and remain a single checkpoint per set', () => {
  const targetId = seedTarget();
  const firstId = store.getState().applyCreativeResource(character(), { targetNodeId: targetId });
  const firstBundle = nodeById(firstId).data.resourceBundleId;
  const secondId = store.getState().applyCreativeResource(character(), { targetNodeId: targetId });
  assert.notEqual(firstId, secondId);
  assert.notEqual(nodeById(secondId).data.resourceBundleId, firstBundle);
  assert.equal(characterNodes().length, 10);
  assert.equal(new Set(characterNodes().map(node => node.id)).size, 10);
  assert.equal(nodeById(targetId).data.referenceNodeIds.length, 11);
  assert.equal(new Set(nodeById(targetId).data.referenceNodeIds).size, 11);
  assert.equal(store.getState().edges.length, 11);
  assert.equal(store.getState().past.length, 2);
  assert.equal(characterNodes().filter(node => node.selected).length, 5);
  store.getState().undo();
  assert.equal(characterNodes().length, 5);
  assert.ok(characterNodes().every(node => node.data.resourceBundleId === firstBundle));
});

test('a complete five-view set round-trips through storage without collapsing into its catalog cover', () => {
  const targetId = seedTarget();
  store.getState().applyCreativeResource(character(), { targetNodeId: targetId });
  const expectedViews = characterNodes().map(node => ({ id: node.id, data: JSON.parse(JSON.stringify(node.data)) }));
  store.getState().persist();
  store.setState({ ...initialState, nodes: [], edges: [], past: [], future: [] }, true);
  store.getState().load('character-store-test', 'image');
  assert.deepEqual(characterNodes().map(node => ({ id: node.id, data: node.data })), expectedViews);
  assert.equal(nodeById(targetId).data.referenceNodeIds.length, 6);
  assert.equal(store.getState().edges.length, 6);
});

test('persist/load preserves every independent view, bundle and references, including a deleted view remaining deleted', () => {
  const targetId = seedTarget('video');
  store.getState().applyCreativeResource(character(), { targetNodeId: targetId });
  const removed = characterNodes()[2];
  assert.ok(removed);
  store.getState().onNodesChange([{ type: 'remove', id: removed.id }]);
  // JSON intentionally omits optional fields whose value is undefined.
  const expected = JSON.parse(JSON.stringify(graph()));
  expected.nodes.forEach(node => { node.selected = false; });
  expected.edges.forEach(edge => { edge.selected = false; });
  store.getState().persist();
  assert.equal(memoryStorage.length, 1, 'the test writes only into its isolated storage map');
  const document = JSON.parse(memoryStorage.getItem(memoryStorage.key(0)));
  assert.equal(document.version, 3);
  assert.equal(document.projectId, 'character-store-test');
  assert.deepEqual(document.nodes, expected.nodes);
  assert.deepEqual(document.edges, expected.edges);
  store.setState({ ...initialState, nodes: [], edges: [], past: [], future: [] }, true);
  store.getState().load('character-store-test', 'video');
  assert.deepEqual(graph(), expected);
  assert.equal(characterNodes().length, 4);
  assert.equal(nodeById(removed.id), undefined);
  assert.equal(nodeById(targetId).data.referenceNodeIds.includes(removed.id), false);
  assert.ok(characterNodes().every(node => node.data.resourceBundleId && node.data.resourceViewLabel));
  assert.equal(store.getState().past.length, 0, 'loading resets history without rebuilding missing views');
  assert.equal(store.getState().mode, 'video');
});

for (const type of ['style', 'effect']) {
  test(`${type} keeps the existing single-node/template behavior instead of expanding its gallery`, () => {
    const targetId = seedTarget(type === 'style' ? 'image' : 'video');
    const resource = character({ id: `${type}-id`, code: `${type}-test`, type, name: `${type} 模板`, previewVideoUrl: '/preview.mp4' });
    const id = store.getState().applyCreativeResource(resource, { targetNodeId: targetId });
    const nodes = store.getState().nodes.filter(node => node.data.kind === type);
    assert.equal(nodes.length, 1);
    assert.equal(nodes[0].id, id);
    assert.equal(nodes[0].data.title, resource.name);
    assert.equal(nodes[0].data.resourceCoverUrl, resource.coverUrl);
    assert.equal(nodes[0].data.assetUrl, type === 'effect' ? undefined : resource.coverUrl);
    assert.deepEqual(nodes[0].data.resourceGallery, resource.gallery);
    assert.equal(nodes[0].data.resourceViewLabel, undefined);
    assert.equal(nodes[0].data.resourceBundleId, undefined);
    assert.equal(nodes[0].data.resourcePreviewVideoUrl, resource.previewVideoUrl);
    assert.equal(store.getState().past.length, 1);
    assert.deepEqual(nodeById(targetId).data.referenceNodeIds, ['previous-source', id]);
    assert.equal(store.getState().edges.length, 2);
    resource.config.identity.preserve.push('source-only-change');
    resource.gallery[0].label = 'source-only-change';
    assert.deepEqual(nodeById(id).data.resourceConfig.identity.preserve, ['face', 'clothes']);
    assert.equal(nodeById(id).data.resourceGallery[0].label, '全身图');
  });
}
