import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = await readFile(new URL('../src/pages/Workspace/VisualCanvas/CreativeLibrary/characterViews.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { resolveCharacterViews } = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);

test('the four named character views stay independent and in presentation order', () => {
  const gallery = [
    { label: '多角度设定图', url: '/turnaround.png' },
    { label: '表情九宫格', url: '/expressions.png' },
    { label: '全身图', url: '/fullbody.png' },
    { label: '面部特写', url: '/portrait.png' },
  ];
  const result = resolveCharacterViews(gallery);
  assert.deepEqual(result.views.map(view => view.image.url), ['/fullbody.png', '/portrait.png', '/expressions.png', '/turnaround.png']);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.extras, []);
  assert.equal(gallery.length, 4, 'resolving does not mutate the gallery that gets applied to one node');
});

test('legacy one/two-image characters show genuine missing slots and keep old sheets available', () => {
  const legacySheet = { label: '正侧背与六种表情', url: '/legacy-sheet.png' };
  const result = resolveCharacterViews([{ label: '独立肖像', url: '/portrait.png' }, legacySheet]);
  assert.deepEqual(result.missing, ['全身图', '表情九宫格', '多角度设定图']);
  assert.equal(result.views.filter(view => view.image).length, 1, 'the composite sheet is never duplicated into three missing views');
  assert.equal(result.views[1].image.url, '/portrait.png');
  assert.deepEqual(result.extras, [legacySheet]);
  assert.equal(resolveCharacterViews([legacySheet]).views[1].image, undefined);
  assert.deepEqual(resolveCharacterViews([]).missing, ['全身图', '面部特写', '表情九宫格', '多角度设定图']);
});

test('empty URLs do not count as supplied artwork', () => {
  const result = resolveCharacterViews([{ label: '全身图', url: '   ' }]);
  assert.ok(result.missing.includes('全身图'));
  assert.deepEqual(result.extras, []);
});

test('standard labels trim surrounding whitespace and preserve the original gallery objects', () => {
  const labels = ['全身图', '面部特写', '表情九宫格', '多角度设定图'];
  const gallery = labels.map((label, index) => ({ label: `  ${label}\n`, url: `/view-${index}.png` }));
  const result = resolveCharacterViews(gallery);
  assert.deepEqual(result.missing, []);
  result.views.forEach((view, index) => assert.equal(view.image, gallery[index]));
  assert.equal(gallery[0].label, '  全身图\n', 'parsing never mutates data applied to the canvas');
});

test('all supported portrait aliases are recognized, with the standard label taking priority', () => {
  for (const label of ['独立肖像', '独立肖像参考', '肖像特写', '肖像']) {
    const alias = { label: ` ${label} `, url: '/legacy-portrait.png' };
    assert.equal(resolveCharacterViews([alias]).views[1].image, alias);
    const standard = { label: ' 面部特写 ', url: '/portrait.png' };
    assert.equal(resolveCharacterViews([alias, standard]).views[1].image, standard);
  }
});

test('removing the portrait from gallery leaves a missing slot even when a cover still exists', () => {
  const resource = {
    coverUrl: '/portrait.png',
    gallery: [{ label: '全身图', url: '/fullbody.png' }, { label: '面部特写', url: '/portrait.png' }],
  };
  resource.gallery = resource.gallery.filter(image => image.label !== '面部特写');
  const result = resolveCharacterViews(resource.gallery);
  assert.equal(result.views[1].image, undefined);
  assert.ok(result.missing.includes('面部特写'));
  resource.coverUrl = '/fullbody.png';
  assert.equal(resolveCharacterViews(resource.gallery).views[1].image, undefined, 'a full-body cover is never misidentified as a portrait');
});
