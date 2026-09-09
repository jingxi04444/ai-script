// Isolated UI contract test: all API traffic is intercepted; never writes to a real backend.
// Run against an admin Vite server with PLAYWRIGHT_MODULE pointing to an installed Playwright module.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = process.env.CREATIVE_ADMIN_URL || 'http://127.0.0.1:4176';
const artifacts = process.env.CREATIVE_QA_DIR || '/tmp/ai-script-creative-admin-qa';
await mkdir(artifacts, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH });
const context = await browser.newContext({ viewport: { width: 1512, height: 1000 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await context.addInitScript(() => localStorage.setItem('admin_token', 'isolated-ui-contract-test'));
const fixture = (id, type, name, code, coverUrl) => ({ id, type, name, code, coverUrl, category: '摄影参考', description: 'AI 生成示例资源，供界面契约测试使用。', previewVideoUrl: '', gallery: [], tags: ['AI 示例', '需审核'], prompt: '保持参考的主体与视觉风格', negativePrompt: '', config: {}, status: 'published', sortOrder: 10, licenseNote: 'AI 生成示例，需审核后使用', author: '测试数据', updateTime: '2026-09-05T12:30:00' });
let resources = [
  fixture('1000000000000000001', 'character', '林 · 生活方式角色', 'character-lin', '/creative-library/character-lin-portrait.png'),
  fixture('1000000000000000002', 'character', '陈 · 专业讲解角色', 'character-chen', '/creative-library/character-chen-portrait.png'),
  fixture('1000000000000000003', 'style', '自然日光摄影', 'style-daylight', '/creative-library/style-daylight.png'),
  fixture('1000000000000000004', 'effect', '产品环绕运镜', 'effect-orbit', '/creative-library/effect-orbit.png'),
];
let failing = false;
let lastWrite;
await page.route('**/api/**', async route => {
  const request = route.request(); const url = new URL(request.url());
  if (!url.pathname.startsWith('/api/')) return route.continue();
  const respond = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ code: 0, message: 'success', data }) });
  if (url.pathname.endsWith('/auth/admin-info')) return respond({ id: '1', username: 'UI 测试管理员', role: 'admin' });
  if (url.pathname === '/api/files/upload') return respond({ url: '/creative-library/character-lin-portrait.png', objectKey: 'test.png', fileName: 'test.png', contentType: 'image/png', size: 100 });
  if (!url.pathname.startsWith('/api/admin/creative-resources')) return route.abort();
  if (request.method() === 'GET') {
    if (failing) return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 50000, message: '测试接口暂不可用', data: null }) });
    const filtered = resources.filter(item => item.type === url.searchParams.get('type') && (!url.searchParams.get('status') || item.status === url.searchParams.get('status')) && (!url.searchParams.get('category') || item.category === url.searchParams.get('category')) && (!url.searchParams.get('keyword') || item.name.includes(url.searchParams.get('keyword'))));
    return respond({ list: filtered, total: filtered.length, page: 1, pageSize: 12, pages: 1 });
  }
  if (request.method() === 'DELETE') { resources = resources.filter(item => item.id !== url.pathname.split('/').pop()); return respond(null); }
  lastWrite = request.postDataJSON();
  const id = request.method() === 'POST' ? String(1000000000000000010n + BigInt(resources.length)) : url.pathname.split('/').pop();
  const saved = { ...lastWrite, id };
  resources = request.method() === 'POST' ? [...resources, saved] : resources.map(item => item.id === id ? saved : item);
  return respond(saved);
});

try {
  await page.goto(`${baseUrl}/admin/creative-resources`);
  await page.getByRole('heading', { name: '林 · 生活方式角色', exact: true }).waitFor();
  assert.equal(await page.locator('.creative-resource-card').count(), 2);
  await page.locator('.creative-resource-cover img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
  await page.screenshot({ path: `${artifacts}/resource-list.png`, fullPage: true });
  await page.getByRole('button', { name: '查看与编辑林 · 生活方式角色' }).click();
  await page.getByRole('dialog', { name: '编辑资源' }).waitFor();
  assert.equal(await page.getByLabel('资源编码', { exact: true }).isDisabled(), true);
  for (const [label, max] of [['资源名称', 120], ['资源编码', 80], ['资源分类', 80], ['资源简介', 2000], ['封面图片地址', 2048], ['预览视频地址', 2048], ['创作提示词', 12000], ['负面提示词', 4000], ['作者或来源', 120], ['授权与审核说明', 2000]]) {
    assert.equal(await page.getByLabel(label, { exact: true }).getAttribute('maxlength'), String(max), `${label} maxLength`);
  }
  assert.equal(await page.getByLabel('资源分类', { exact: true }).evaluate(input => input.required), true);
  assert.equal(await page.getByLabel('排序值', { exact: true }).getAttribute('min'), '-100000');
  assert.equal(await page.getByLabel('排序值', { exact: true }).getAttribute('max'), '100000');
  await page.screenshot({ path: `${artifacts}/resource-editor.png`, fullPage: true });
  await page.getByLabel('资源名称', { exact: true }).fill('林 · 新名称');
  await page.getByRole('button', { name: '添加额外参考', exact: true }).click();
  await page.getByLabel('视图 1 名称', { exact: true }).fill('多视图设定板');
  await page.getByLabel('视图 1 地址', { exact: true }).fill('/creative-library/character-lin.png');
  await page.getByLabel('排序值', { exact: true }).fill('5');
  await page.getByLabel('上传封面图片', { exact: true }).setInputFiles(new URL('../public/creative-library/character-lin-portrait.png', import.meta.url).pathname);
  await page.getByRole('button', { name: '保存并发布' }).click();
  await page.getByRole('heading', { name: '林 · 新名称', exact: true }).waitFor();
  assert.equal(lastWrite.code, 'character-lin');
  assert.equal(lastWrite.name, '林 · 新名称');
  assert.equal(lastWrite.sortOrder, 5);
  assert.deepEqual(lastWrite.gallery, [{ label: '多视图设定板', url: '/creative-library/character-lin.png' }]);
  const editedCard = page.locator('.creative-resource-card').filter({ has: page.getByRole('heading', { name: '林 · 新名称', exact: true }) });
  await editedCard.getByRole('button', { name: '下架', exact: true }).click();
  await editedCard.locator('.creative-state').filter({ hasText: '草稿' }).waitFor();
  await editedCard.getByRole('button', { name: '发布', exact: true }).click();
  await editedCard.locator('.creative-state').filter({ hasText: '已发布' }).waitFor();

  await page.getByRole('button', { name: '复制林 · 新名称', exact: true }).click();
  assert.notEqual(await page.getByLabel('资源编码', { exact: true }).inputValue(), 'character-lin');
  assert.equal(await page.getByLabel('发布状态', { exact: true }).inputValue(), 'draft');
  const copiedCode = await page.getByLabel('资源编码', { exact: true }).inputValue();
  for (const code of ['Uppercase', 'code_underscore', 'double--hyphen']) {
    await page.getByLabel('资源编码', { exact: true }).fill(code);
    assert.equal(await page.getByLabel('资源编码', { exact: true }).evaluate(input => input.validity.patternMismatch), true);
  }
  await page.getByLabel('资源编码', { exact: true }).fill(copiedCode);
  assert.equal(await page.getByLabel('资源编码', { exact: true }).evaluate(input => input.validity.valid), true);
  await page.locator('summary').filter({ hasText: '高级配置' }).click();
  await page.getByLabel('高级配置 JSON', { exact: true }).fill('[]');
  await page.getByRole('button', { name: '保存草稿' }).click();
  await page.getByRole('alert').filter({ hasText: 'JSON 对象' }).waitFor();
  await page.getByLabel('高级配置 JSON', { exact: true }).fill('{}');
  await page.getByRole('button', { name: '保存草稿' }).click();
  await page.getByRole('heading', { name: '林 · 新名称 副本', exact: true }).waitFor();
  assert.equal(lastWrite.status, 'draft');

  await page.getByRole('button', { name: '删除林 · 新名称 副本', exact: true }).click();
  await page.getByRole('button', { name: '保留资源' }).click();
  assert.equal(await page.locator('.creative-resource-card').count(), 3);
  await page.getByRole('button', { name: '删除林 · 新名称 副本', exact: true }).click();
  await page.getByRole('button', { name: '确认删除' }).click();
  await page.getByRole('heading', { name: '林 · 新名称 副本', exact: true }).waitFor({ state: 'hidden' });
  await page.getByRole('heading', { name: '林 · 新名称', exact: true }).waitFor();
  assert.equal(await page.locator('.creative-resource-card').count(), 2);

  await page.getByRole('button', { name: '风格 STYLES' }).click();
  await page.getByRole('heading', { name: '自然日光摄影', exact: true }).waitFor();
  await page.getByLabel('搜索创意资源', { exact: true }).fill('没有这个资源');
  await page.getByRole('button', { name: '筛选', exact: true }).click();
  await page.getByRole('heading', { name: '没有符合条件的资源' }).waitFor();
  await page.getByRole('button', { name: '清除筛选', exact: true }).first().click();
  await page.getByRole('heading', { name: '自然日光摄影', exact: true }).waitFor();
  failing = true;
  await page.getByRole('button', { name: '刷新资源列表' }).click();
  await page.getByRole('heading', { name: '资源暂时没有加载出来' }).waitFor();
  assert.equal(await page.locator('.creative-resource-card').count(), 0);
  failing = false;
  await page.getByRole('button', { name: '重新加载' }).click();
  await page.getByRole('heading', { name: '自然日光摄影', exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: true, assertions: ['list', 'immutable code', 'API-aligned form limits', 'code pattern validation', 'edit', 'cover upload', 'gallery', 'sort order', 'unpublish/publish', 'copy as draft', 'JSON validation', 'delete confirmation', 'type tabs', 'search empty', 'failure without fallback', 'retry'], screenshots: artifacts }));
} catch (error) {
  await page.screenshot({ path: `${artifacts}/failure.png`, fullPage: true });
  console.error(await page.locator('body').innerText());
  console.error(errors);
  throw error;
} finally { await context.close(); await browser.close(); }
