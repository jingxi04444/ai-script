import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('./creativeResourceForm.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } });
const form = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const draft = () => ({ ...form.createCreativeResourceForm('character'), name: '角色参考', code: 'character-test', category: '生活方式' });
const published = () => ({ ...draft(), status: 'published', category: '生活方式', coverUrl: '/creative-library/character-lin-portrait.png', prompt: '保持人物形象一致', licenseNote: 'AI 生成示例，需人工审核' });

test('new resources are drafts with empty structured configuration', () => {
  const payload = form.creativeResourcePayload(draft());
  assert.equal(payload.status, 'draft');
  assert.deepEqual(payload.config, {});
  assert.deepEqual(payload.gallery, []);
  assert.equal(payload.coverUrl, '');
});

test('drafts and published resources require a name and category', () => {
  for (const resource of [draft(), published()]) {
    for (const key of ['name', 'category']) assert.throws(() => form.creativeResourcePayload({ ...resource, [key]: ' ' }), /请填写/);
  }
});

test('published resources additionally require cover, prompt and honest review notes', () => {
  for (const key of ['coverUrl', 'prompt', 'licenseNote']) {
    assert.throws(() => form.creativeResourcePayload({ ...published(), [key]: '' }), /发布前/);
  }
  assert.equal(form.creativeResourcePayload(published()).status, 'published');
});

test('configuration must be a JSON object', () => {
  for (const configText of ['[]', 'null', '"text"', '{bad}']) assert.throws(() => form.creativeResourcePayload({ ...draft(), configText }), /JSON/);
});

test('all editable text limits match backend boundaries, including UTF-16 lengths', () => {
  for (const [key, max] of Object.entries({ code: 80, name: 120, category: 80, description: 2000, prompt: 12000, negativePrompt: 4000, licenseNote: 2000, author: 120 })) {
    assert.doesNotThrow(() => form.creativeResourcePayload({ ...draft(), [key]: 'a'.repeat(max) }), `${key} allows ${max}`);
    assert.throws(() => form.creativeResourcePayload({ ...draft(), [key]: 'a'.repeat(max + 1) }), /不能超过/, `${key} rejects ${max + 1}`);
    assert.throws(() => form.creativeResourcePayload({ ...draft(), [key]: 'a\0b' }), /无效字符/, `${key} rejects embedded NUL`);
  }
  assert.equal(form.creativeResourcePayload({ ...draft(), name: '😀'.repeat(60) }).name.length, 120);
  assert.throws(() => form.creativeResourcePayload({ ...draft(), name: '😀'.repeat(61) }), /120/);
  assert.equal(form.creativeResourcePayload({ ...draft(), name: '\t 名称 \n' }).name, '名称');
});

test('codes require lowercase segments and the allowed type/status enums', () => {
  for (const code of ['Character-test', 'character_test', '-test', 'test-', 'test--a', '中文', '']) assert.throws(() => form.creativeResourcePayload({ ...draft(), code }), /编码/);
  for (const code of ['a', '123', 'character-test-2']) assert.equal(form.creativeResourcePayload({ ...draft(), code }).code, code);
  assert.throws(() => form.creativeResourcePayload({ ...draft(), type: 'script' }), /资源类型/);
  assert.throws(() => form.creativeResourcePayload({ ...draft(), status: 'deleted' }), /发布状态/);
});

test('configuration max is 16000 UTF-8 bytes, not 16384 or character count', () => {
  const sizedConfig = size => {
    const value = { a: '', b: '', c: '', d: '', e: '' };
    let remaining = size - Buffer.byteLength(JSON.stringify(value));
    for (const key of Object.keys(value)) {
      value[key] = 'x'.repeat(Math.min(4000, remaining));
      remaining -= value[key].length;
    }
    return JSON.stringify(value);
  };
  assert.equal(Buffer.byteLength(sizedConfig(16000)), 16000);
  assert.doesNotThrow(() => form.creativeResourcePayload({ ...draft(), configText: sizedConfig(16000) }));
  for (const size of [16001, 16300]) assert.throws(() => form.creativeResourcePayload({ ...draft(), configText: sizedConfig(size) }), /16000/);
  const unicodeConfig = JSON.stringify({ a: '大'.repeat(1333), b: '大'.repeat(1333), c: '大'.repeat(1333), d: '大'.repeat(1333) });
  assert.ok(unicodeConfig.length < 16000);
  assert.throws(() => form.creativeResourcePayload({ ...draft(), configText: unicodeConfig }), /16000/);
});

test('config depth starts at root 0 and counts every scalar and container leaf', () => {
  const nested = (leaf, levels) => {
    for (let index = 0; index < levels; index++) leaf = { nested: leaf };
    return JSON.stringify(leaf);
  };
  for (const leaf of [null, true, 7, 'value', {}, []]) {
    assert.doesNotThrow(() => form.creativeResourcePayload({ ...draft(), configText: nested(leaf, 8) }));
    assert.throws(() => form.creativeResourcePayload({ ...draft(), configText: nested(leaf, 9) }), /8 层/);
  }
  let array = [1];
  for (let depth = 0; depth < 6; depth++) array = [array];
  assert.doesNotThrow(() => form.creativeResourcePayload({ ...draft(), configText: JSON.stringify({ array }) }));
  assert.throws(() => form.creativeResourcePayload({ ...draft(), configText: JSON.stringify({ array: [array] }) }), /8 层/);
});

test('config validates key names, collection size, strings, and finite numbers', () => {
  const saveConfig = config => form.creativeResourcePayload({ ...draft(), configText: JSON.stringify(config) });
  for (const key of ['', ' \t\u3000', '__proto__', 'prototype', 'constructor', 'x'.repeat(81)]) assert.throws(() => saveConfig(Object.fromEntries([[key, true]])), /字段名/);
  assert.doesNotThrow(() => saveConfig({ ['x'.repeat(80)]: true }));
  assert.doesNotThrow(() => saveConfig(Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`key-${i}`, i]))));
  assert.throws(() => saveConfig(Object.fromEntries(Array.from({ length: 101 }, (_, i) => [`key-${i}`, i]))), /100 个字段/);
  assert.doesNotThrow(() => saveConfig({ array: Array(100).fill(null) }));
  assert.throws(() => saveConfig({ array: Array(101).fill(null) }), /100 项/);
  assert.doesNotThrow(() => saveConfig({ text: 'x'.repeat(4000) }));
  assert.throws(() => saveConfig({ text: 'x'.repeat(4001) }), /4000/);
  assert.throws(() => saveConfig({ text: 'a\0b' }), /无效字符/);
  assert.throws(() => form.creativeResourcePayload({ ...draft(), configText: '{"number":1e400}' }), /有限数/);
});

test('media URL validation blocks scripts, blobs and external protocol-relative URLs', () => {
  for (const url of ['javascript:alert(1)', 'data:image/png;base64,AAAA', 'blob:https://example.com/1', '//example.com/a.png', '/\\example.com/a.png', 'file:///tmp/a.png', 'https://name:password@example.com/a.png', 'http://name@example.com/a.png', 'http://@example.com/a.png', 'https:/example.com/a.png', '/img\u007f.png', '/img\u0080.png', '/a%.png', '/img[1].png', 'https://bad_host/a.png']) assert.equal(form.isCreativeMediaUrl(url), false, url);
  for (const url of ['/creative-library/style-daylight.png', 'https://cdn.example/cover.webp', '/中文.png?q=%E4%B8%AD', 'http://127.0.0.1:8080/files/a.png', 'https://[::1]:8080/a.png']) assert.equal(form.isCreativeMediaUrl(url), true, url);
});

test('media addresses all enforce 2048 characters and block embedded credentials', () => {
  const maxUrl = `/${'a'.repeat(2047)}`;
  assert.equal(form.isCreativeMediaUrl(maxUrl), true);
  assert.equal(form.isCreativeMediaUrl(`${maxUrl}a`), false);
  for (const key of ['coverUrl', 'previewVideoUrl']) {
    assert.doesNotThrow(() => form.creativeResourcePayload({ ...draft(), [key]: maxUrl }));
    assert.throws(() => form.creativeResourcePayload({ ...draft(), [key]: `${maxUrl}a` }), /2048/);
    assert.throws(() => form.creativeResourcePayload({ ...draft(), [key]: 'https://user:pass@example.com/a.png' }), /账号密码/);
  }
  assert.doesNotThrow(() => form.creativeResourcePayload({ ...draft(), gallery: [{ label: '', url: maxUrl }] }));
  assert.throws(() => form.creativeResourcePayload({ ...draft(), gallery: [{ label: '', url: `${maxUrl}a` }] }), /2048/);
});

test('bundled thumbnails respect the admin base without rewriting uploaded media', () => {
  assert.equal(form.creativeMediaPreviewUrl('/creative-library/style-daylight.png', '/admin/'), '/admin/creative-library/style-daylight.png');
  assert.equal(form.creativeMediaPreviewUrl('/uploads/asset.png', '/admin/'), '/uploads/asset.png');
  assert.equal(form.creativeMediaPreviewUrl('https://cdn.example/cover.png', '/admin/'), 'https://cdn.example/cover.png');
});

test('gallery validates every view, enforces bounds, and trims labels', () => {
  assert.deepEqual(form.creativeResourcePayload({ ...draft(), gallery: [{ label: '', url: '/a.png' }] }).gallery, [{ label: '', url: '/a.png' }]);
  assert.throws(() => form.creativeResourcePayload({ ...draft(), gallery: [{ label: '', url: '' }] }), /第 1 个视图/);
  assert.doesNotThrow(() => form.creativeResourcePayload({ ...draft(), gallery: [{ label: '字'.repeat(80), url: '/a.png' }] }));
  assert.throws(() => form.creativeResourcePayload({ ...draft(), gallery: [{ label: '字'.repeat(81), url: '/a.png' }] }), /80/);
  assert.doesNotThrow(() => form.creativeResourcePayload({ ...draft(), gallery: Array.from({ length: 12 }, () => ({ label: '', url: '/a.png' })) }));
  assert.throws(() => form.creativeResourcePayload({ ...draft(), gallery: Array.from({ length: 13 }, () => ({ label: '参考', url: '/a.png' })) }), /最多 12/);
  assert.deepEqual(form.creativeResourcePayload({ ...draft(), gallery: [{ label: ' 侧面 ', url: '/side.png' }] }).gallery, [{ label: '侧面', url: '/side.png' }]);
});

test('tags deduplicate and numbers must be bounded integers', () => {
  assert.deepEqual(form.creativeResourcePayload({ ...draft(), tagsText: '自然，摄影,自然\n光线' }).tags, ['自然', '摄影', '光线']);
  assert.throws(() => form.creativeResourcePayload({ ...draft(), tagsText: Array.from({ length: 21 }, (_, index) => `tag-${index}`).join(',') }), /最多 20/);
  assert.doesNotThrow(() => form.creativeResourcePayload({ ...draft(), tagsText: Array.from({ length: 20 }, (_, index) => `tag-${index}`).join(',') }));
  assert.doesNotThrow(() => form.creativeResourcePayload({ ...draft(), tagsText: '字'.repeat(40) }));
  assert.throws(() => form.creativeResourcePayload({ ...draft(), tagsText: '字'.repeat(41) }), /40/);
  assert.throws(() => form.creativeResourcePayload({ ...draft(), tagsText: 'a\0b' }), /无效字符/);
  for (const sortOrder of [-100000, 0, 100000]) assert.equal(form.creativeResourcePayload({ ...draft(), sortOrder }).sortOrder, sortOrder);
  for (const sortOrder of [-100001, 100001, 1.5, NaN, Infinity]) assert.throws(() => form.creativeResourcePayload({ ...draft(), sortOrder }), /排序值/);
});

test('copy creates a fresh draft code without retaining identity or mutating the source', () => {
  const resource = { id: '1234567890123456789', ...form.creativeResourcePayload(published()), gallery: [{ label: '侧面', url: '/side.png' }] };
  const copy = form.createCreativeResourceForm('character', resource, true);
  assert.notEqual(copy.code, resource.code);
  assert.equal(copy.status, 'draft');
  assert.equal(copy.name, '角色参考 副本');
  assert.equal(form.creativeResourcePayload(copy).id, undefined);
  copy.gallery[0].label = '新侧面';
  assert.equal(resource.gallery[0].label, '侧面');
  const longCopy = form.createCreativeResourceForm('character', { ...resource, name: '字'.repeat(120) }, true);
  assert.equal(longCopy.name.length, 120);
  assert.doesNotThrow(() => form.creativeResourcePayload(longCopy));
});
