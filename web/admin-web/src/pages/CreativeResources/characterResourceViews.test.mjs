import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

async function loadModule(file) {
  const source = readFileSync(new URL(file, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { characterResourceViews, setCharacterResourceView } = await loadModule('./characterReferenceSet.ts');
const { createCreativeResourceForm, creativeResourcePayload } = await loadModule('./creativeResourceForm.ts');
const labels = ['全身图', '面部特写', '表情九宫格', '多角度设定图'];

test('four fixed slots preserve order without inventing missing images', () => {
  const result = characterResourceViews([]);
  assert.deepEqual(result.slots.map(slot => slot.label), labels);
  assert.equal(result.count, 0);
  assert.deepEqual(result.missing, labels);
  assert.ok(result.slots.every(slot => slot.url === '' && slot.index === -1));
});

test('complete sets select independently labeled images and preserve extras', () => {
  const gallery = [{ label: '其他服装', url: '/coat.png' }, ...labels.toReversed().map((label, index) => ({ label, url: `/view-${index}.png` }))];
  const result = characterResourceViews(gallery);
  assert.equal(result.count, 4);
  assert.equal(result.repeatedImage, false);
  assert.deepEqual(result.slots.map(slot => slot.url), ['/view-3.png', '/view-2.png', '/view-1.png', '/view-0.png']);
  assert.deepEqual(result.extras, [{ label: '其他服装', url: '/coat.png', index: 0 }]);
});

test('legacy standalone portrait maps only to face and combined sheet stays extra', () => {
  const gallery = [{ label: '独立肖像', url: '/portrait.png' }, { label: '正侧背与六种表情', url: '/combined.png' }, { label: '多视图设定板', url: '/another-combined.png' }];
  const result = characterResourceViews(gallery);
  assert.equal(result.count, 1);
  assert.equal(result.slots[1].url, '/portrait.png');
  assert.deepEqual(result.missing, ['全身图', '表情九宫格', '多角度设定图']);
  assert.deepEqual(result.extras.map(item => item.url), ['/combined.png', '/another-combined.png']);
});

test('portrait aliases and canonical labels tolerate surrounding whitespace', () => {
  for (const label of ['肖像', ' \t肖像\n ', ' 独立肖像 ', '\n独立肖像参考', '肖像特写\t']) {
    const gallery = [{ label, url: '/face.png' }, { label: '  全身图\n', url: '/fullbody.png' }];
    const views = characterResourceViews(gallery);
    assert.equal(views.count, 2);
    assert.equal(views.slots[0].url, '/fullbody.png');
    assert.equal(views.slots[1].url, '/face.png');
    assert.equal(views.extras.length, 0);
    assert.deepEqual(setCharacterResourceView(gallery, '面部特写', '/updated.png')[0], { label: '面部特写', url: '/updated.png' });
    assert.equal(characterResourceViews(setCharacterResourceView(gallery, '面部特写', '')).slots[1].url, '');
  }
});

test('missing or removed face never returns from the independent resource cover', () => {
  const base = { ...createCreativeResourceForm('character'), name: '角色', category: '现代生活', coverUrl: '/face-used-as-cover.png' };
  const gallery = labels.map((label, index) => ({ label, url: label === '面部特写' ? base.coverUrl : `/view-${index}.png` }));
  const removed = setCharacterResourceView(gallery, '面部特写', '');
  const payload = creativeResourcePayload({ ...base, gallery: removed });
  assert.equal(payload.coverUrl, '/face-used-as-cover.png');
  const restored = createCreativeResourceForm('character', { ...payload, id: '1234567890123456789' });
  const views = characterResourceViews(restored.gallery);
  assert.equal(views.count, 3);
  assert.equal(views.slots[1].url, '');
  assert.deepEqual(views.missing, ['面部特写']);
  assert.ok(views.slots.every(slot => slot.url !== payload.coverUrl));
});

test('canonical face takes precedence and never silently consumes additional portrait', () => {
  const gallery = [{ label: '独立肖像', url: '/old.png' }, { label: '面部特写', url: '/new.png' }];
  assert.equal(characterResourceViews(gallery).slots[1].url, '/new.png');
  const removed = setCharacterResourceView(gallery, '面部特写', '');
  assert.equal(characterResourceViews(removed).count, 0);
  assert.equal(characterResourceViews(removed).extras[0].url, '/old.png');
  assert.equal(gallery[0].label, '独立肖像');
});

test('add, replace, clear and re-add keep compatible gallery payloads without mutating source', () => {
  const original = [{ label: '独立肖像', url: '/old-face.png' }, { label: '混合设定板', url: '/combined.png' }];
  const replaced = setCharacterResourceView(original, '面部特写', '/face.png');
  assert.deepEqual(replaced[0], { label: '面部特写', url: '/face.png' });
  assert.equal(original[0].url, '/old-face.png');
  const added = setCharacterResourceView(replaced, '全身图', '/fullbody.png');
  assert.equal(characterResourceViews(added).count, 2);
  const cleared = setCharacterResourceView(added, '面部特写', '  ');
  assert.equal(characterResourceViews(cleared).count, 1);
  assert.ok(cleared.every(item => item.url));
  assert.ok(cleared.some(item => item.url === '/combined.png'));
  assert.equal(characterResourceViews(setCharacterResourceView(cleared, '面部特写', '/face2.png')).count, 2);
});

test('missing role views do not add stronger publication rules than the existing API', () => {
  const form = { ...createCreativeResourceForm('character'), name: '角色', category: '现代生活', coverUrl: '/cover.png', prompt: '保持角色一致', licenseNote: 'AI 示例，需审核' };
  assert.deepEqual(creativeResourcePayload(form).gallery, []);
  assert.doesNotThrow(() => creativeResourcePayload({ ...form, status: 'published' }));
  assert.equal(characterResourceViews(creativeResourcePayload(form).gallery).count, 0);
});

test('gallery capacity includes optional extras but allows replacing existing slot', () => {
  const full = [{ label: '面部特写', url: '/face.png' }, ...Array.from({ length: 11 }, (_, index) => ({ label: `额外参考 ${index}`, url: `/extra-${index}.png` }))];
  assert.throws(() => setCharacterResourceView(full, '全身图', '/fullbody.png'), /12 张/);
  assert.equal(setCharacterResourceView(full, '面部特写', '/new.png').length, 12);
  const freed = setCharacterResourceView(full, '面部特写', '');
  assert.equal(setCharacterResourceView(freed, '全身图', '/fullbody.png').length, 12);
});

test('duplicate URLs remain explicit and flagged, never automatically multiplied', () => {
  assert.equal(characterResourceViews([{ label: '面部特写', url: '/face.png' }]).count, 1);
  const repeated = characterResourceViews(labels.map(label => ({ label, url: '/same.png' })));
  assert.equal(repeated.count, 4);
  assert.equal(repeated.repeatedImage, true);
});
