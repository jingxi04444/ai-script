// All APIs are intercepted. This script never invokes providers or changes server data.
// Run only when browser-CLI verification is authorized; current design review uses in-app CUA instead.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CREATIVE_PLAYWRIGHT_MODULE || 'playwright');
const outputDir = process.env.CREATIVE_QA_OUTPUT || '/tmp/ai-script-creative-qa';
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.CREATIVE_CHROMIUM_PATH ? { executablePath: process.env.CREATIVE_CHROMIUM_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
// Real catalog, names and artwork; only network transport/account identity use fixtures.
const resources = JSON.parse(await readFile(new URL('../public/creative-library/catalog.json', import.meta.url), 'utf8'));
const [firstCharacter, secondCharacter] = resources.filter(item => item.type === 'character');
const firstStyle = resources.find(item => item.type === 'style');
const firstEffect = resources.find(item => item.type === 'effect');
const characterViewLabels = ['全身图', '面部特写', '表情九宫格', '多角度设定图'];
const characterImages = [...new Map(firstCharacter.gallery.filter(image => image.url.trim())
  .map(image => [image.url.trim(), { label: image.label.trim(), url: image.url.trim() }])).values()];
let failList = false;
let failDetail = false;
let userId = 'creative-qa-user';
const failures = [];
page.on('pageerror', error => failures.push(error.message));
let providerCalls = 0;
await page.route('**/api/**', async route => {
  const url = new URL(route.request().url());
  if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
  if (/providers\/execute|generations|workflow\/runs/.test(url.pathname)) providerCalls++;
  let data = { list: [], total: 0, page: 1, pageSize: 20, pages: 0, items: [], activeCount: 0, pendingCount: 0, runningCount: 0, concurrency: 1 };
  if (url.pathname.endsWith('/auth/user-info')) data = { id: userId, username: '资源库验收', phone: '13800000000', email: 'creative-qa@example.test' };
  if (url.pathname.endsWith('/workflow/models')) data = [];
  if (url.pathname === '/api/creative-resources') {
    if (failList) { await route.fulfill({ status: 500, json: { code: 50000, message: 'QA: library unavailable', data: null } }); return; }
    const type = url.searchParams.get('type'); const keyword = url.searchParams.get('keyword') || ''; const category = url.searchParams.get('category');
    const filtered = resources.filter(item => item.type === type && (!category || item.category === category) && `${item.name} ${item.description} ${item.tags.join(' ')}`.includes(keyword));
    data = { list: filtered, total: filtered.length, page: 1, pageSize: 18, pages: filtered.length ? 1 : 0 };
  } else if (url.pathname.startsWith('/api/creative-resources/')) {
    if (failDetail) { await route.fulfill({ status: 404, json: { code: 40400, message: '资源已下架', data: null } }); return; }
    data = resources.find(item => item.id === url.pathname.split('/').pop());
  }
  await route.fulfill({ json: { code: 0, message: 'success', data } });
});
await page.addInitScript(() => { localStorage.setItem('token', 'creative-qa-fixture-token'); localStorage.setItem('needsPhoneBinding', 'false'); localStorage.setItem('needsEmailBinding', 'false'); });
// Use Vite's loaded module URL (including its HMR timestamp) to avoid creating a second store instance.
const state = () => page.evaluate(async () => { const source = performance.getEntriesByType('resource').find(item => new URL(item.name).pathname === '/src/stores/workflowStore.ts')?.name || '/src/stores/workflowStore.ts'; const { useWorkflowStore } = await import(source); return { nodes: useWorkflowStore.getState().nodes, edges: useWorkflowStore.getState().edges }; });
const dialog = page.getByRole('dialog', { name: '创意资源库', exact: true });
const open = async () => { await page.getByRole('button', { name: '素材与图片', exact: true }).click(); await dialog.waitFor(); await page.getByRole('button', { name: `查看角色：${firstCharacter.name}` }).waitFor(); };
const characterGraph = snapshot => snapshot.nodes.filter(node => node.data.creativeResourceId === firstCharacter.id);
const imageIdentity = nodes => nodes.map(({ id, data }) => ({ id, title: data.title, kind: data.kind,
  assetUrl: data.assetUrl, resourceCoverUrl: data.resourceCoverUrl, resourceGallery: data.resourceGallery,
  resourceViewLabel: data.resourceViewLabel, resourceBundleId: data.resourceBundleId }));
const assertClearCanvasMargins = async (minimumMargin = 40) => {
  await dialog.evaluate(async element => { await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))); });
  const appearance = await dialog.evaluate(element => {
    const { top, bottom } = element.getBoundingClientRect();
    const surfaces = [element.parentElement];
    for (let canvas = document.querySelector('.visual-canvas-panel'); canvas; canvas = canvas.parentElement) surfaces.push(canvas);
    return { top, bottomGap: window.innerHeight - bottom, filters: surfaces.map(surface => {
      const style = getComputedStyle(surface);
      return { filter: style.filter, backdrop: style.backdropFilter || style.webkitBackdropFilter || 'none' };
    }) };
  });
  assert.ok(appearance.top >= minimumMargin && appearance.bottomGap >= minimumMargin,
    `picker leaves visible canvas above and below: ${JSON.stringify(appearance)}`);
  for (const surface of appearance.filters) {
    assert.equal(surface.filter, 'none', 'opening the library must not blur the canvas');
    assert.equal(surface.backdrop, 'none', 'the modal backdrop must not blur the canvas');
  }
};
const waitForSavedCharacters = async (expectedNodes, removedIds = []) => {
  await page.waitForFunction(({ expected, removed }) => Object.keys(localStorage).some(key => {
    if (!key.startsWith('ai-script:visual-workflow:')) return false;
    try {
      const nodes = JSON.parse(localStorage.getItem(key)).nodes;
      return Array.isArray(nodes) && removed.every(id => !nodes.some(node => node.id === id))
        && expected.every(expectedNode => nodes.some(node => node.id === expectedNode.id
          && node.data.assetUrl === expectedNode.assetUrl
          && JSON.stringify(node.data.resourceGallery) === JSON.stringify(expectedNode.resourceGallery)));
    } catch { return false; }
  }), { expected: imageIdentity(expectedNodes), removed: removedIds });
};
try {
  await page.goto(`${process.env.CREATIVE_BASE_URL || 'http://127.0.0.1:4174'}/workspace?step=visual`);
  await open();
  await page.getByRole('img', { name: `${firstCharacter.name} · 面部特写`, exact: true }).waitFor();
  await assertClearCanvasMargins();
  assert.equal(await page.locator('.character-set-view').count(), 4, 'four simultaneous slots, never a right-side view toggle');
  for (const label of characterViewLabels) {
    if (firstCharacter.gallery.some(image => image.url.trim() && (image.label.trim() === label || (label === '面部特写' && ['独立肖像', '独立肖像参考', '肖像特写', '肖像'].includes(image.label.trim()))))) {
      const image = page.getByRole('img', { name: `${firstCharacter.name} · ${label}`, exact: true });
      await image.waitFor();
      assert.equal(await image.evaluate(element => getComputedStyle(element).objectFit), 'contain', `${label} never crops the subject`);
    } else await page.getByText(`暂缺${label}`, { exact: true }).waitFor();
  }
  assert.equal(await dialog.locator('textarea').count(), 0, 'resources have no generation input');
  assert.equal(await page.getByRole('button', { name: '应用到画布', exact: true }).count(), 1);
  await page.setViewportSize({ width: 1280, height: 720 });
  await assertClearCanvasMargins();
  const compactGeometry = await page.locator('.character-library-body').evaluate(body => {
    const library = body.closest('.creative-library');
    const boxes = ['.character-set-views', '.character-apply', '.character-thumbnail-rail'].map(selector => {
      const { top, bottom } = library.querySelector(selector).getBoundingClientRect();
      return { selector, top, bottom };
    });
    return { bodyOverflow: getComputedStyle(body).overflowY, boxes, height: window.innerHeight };
  });
  assert.equal(compactGeometry.bodyOverflow, 'hidden', 'desktop library keeps the character rail outside the scroller');
  for (const box of compactGeometry.boxes) assert.ok(box.top >= 0 && box.bottom <= compactGeometry.height, `${box.selector} fits the 1280×720 first screen`);
  await page.screenshot({ path: `${outputDir}/character-library-1280x720.png`, animations: 'disabled' });
  await page.setViewportSize({ width: 1440, height: 960 });
  const portraitZoom = page.getByRole('button', { name: `放大面部特写：${firstCharacter.name}`, exact: true });
  await portraitZoom.click();
  const lightbox = page.getByRole('dialog', { name: `图片预览：${firstCharacter.name} · 面部特写`, exact: true });
  await lightbox.waitFor();
  await page.keyboard.press('Escape'); await lightbox.waitFor({ state: 'detached' });
  assert.equal(await dialog.isVisible(), true, 'first Escape only closes the image');
  assert.equal(await portraitZoom.evaluate(element => element === document.activeElement), true, 'image preview restores focus to its opener');
  await page.getByRole('button', { name: `收藏：${firstCharacter.name}`, exact: true }).click();
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ai-script:creative-library:v1:creative-qa-user')));
  assert.deepEqual(stored.favorites, [firstCharacter.id]);
  await page.getByRole('button', { name: '我的收藏（本机）', exact: true }).click();
  await page.getByRole('button', { name: `查看角色：${firstCharacter.name}` }).waitFor();
  assert.equal(await page.getByRole('button', { name: `查看角色：${secondCharacter.name}` }).count(), 0);
  await page.getByRole('button', { name: '全部角色', exact: true }).click();
  await page.getByRole('button', { name: `查看角色：${secondCharacter.name}` }).waitFor();
  await page.getByLabel('搜索创意资源', { exact: true }).fill(secondCharacter.name);
  await page.getByRole('button', { name: `查看角色：${firstCharacter.name}` }).waitFor({ state: 'detached' });
  await page.getByRole('button', { name: `查看角色：${secondCharacter.name}` }).waitFor();
  await page.getByLabel('搜索创意资源', { exact: true }).fill('');
  await page.getByRole('button', { name: `查看角色：${firstCharacter.name}` }).waitFor();
  const categoryResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get('category') === firstCharacter.category);
  await page.getByRole('combobox', { name: '角色分类筛选', exact: true }).selectOption(firstCharacter.category);
  await categoryResponse;
  await page.getByRole('combobox', { name: '角色分类筛选', exact: true }).selectOption('');
  await page.getByRole('button', { name: `查看角色：${secondCharacter.name}` }).waitFor();
  await page.getByRole('img', { name: `${firstCharacter.name} · 面部特写`, exact: true }).waitFor();
  await page.screenshot({ path: `${outputDir}/character-library.png`, animations: 'disabled' });
  await page.getByLabel('搜索创意资源', { exact: true }).focus();
  const beforeEscape = (await state()).nodes.length;
  await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
  assert.equal(await page.getByRole('button', { name: '素材与图片', exact: true }).evaluate(element => element === document.activeElement), true, 'focus returns to opener');
  assert.equal((await state()).nodes.length, beforeEscape);
  await open();
  await page.getByRole('button', { name: '应用到画布', exact: true }).click();
  await dialog.waitFor({ state: 'detached' });
  const importedGraph = await state();
  const characters = characterGraph(importedGraph);
  const character = characters[0];
  assert.equal(characters.length, characterImages.length, 'each unique gallery image becomes its own node, including the old reference sheet');
  assert.equal(new Set(characters.map(node => node.id)).size, characterImages.length);
  assert.equal(new Set(characters.map(node => node.data.resourceBundleId)).size, 1);
  assert.ok(characters.every(node => node.selected), 'the whole imported set is selected, not only the first node');
  for (const [index, node] of characters.entries()) {
    const image = characterImages[index];
    assert.equal(node.data.kind, 'character');
    assert.equal(node.data.title, `${firstCharacter.name} · ${image.label}`);
    assert.equal(node.data.assetUrl, image.url);
    assert.equal(node.data.resourceCoverUrl, image.url, 'shared cover cannot hide a second image in a single-image node');
    assert.deepEqual(node.data.resourceGallery, [image]);
    assert.equal(node.data.resourceViewLabel, image.label);
    assert.equal(node.data.prompt, undefined, 'resource remains read-only');
    const preview = page.getByRole('img', { name: node.data.title, exact: true });
    await preview.waitFor();
    assert.equal(await preview.getAttribute('src'), image.url);
    assert.equal(await preview.evaluate(element => getComputedStyle(element).objectFit), 'contain', 'canvas images never crop a character view');
  }
  assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('ai-script:creative-library:v1:creative-qa-user')).recent), [firstCharacter.id]);

  // All five are selected: the individual X must still remove only its own image.
  const removedCharacter = characters[2];
  await page.getByRole('button', { name: `从画布移除：${removedCharacter.data.title}`, exact: true }).click();
  await page.getByRole('img', { name: removedCharacter.data.title, exact: true }).waitFor({ state: 'detached' });
  let remainingCharacters = characterGraph(await state());
  assert.deepEqual(remainingCharacters.map(node => node.id), characters.filter(node => node.id !== removedCharacter.id).map(node => node.id), 'X deletes the specified image only');
  assert.deepEqual((await state()).nodes.filter(node => !characters.some(item => item.id === node.id)).map(node => node.id),
    importedGraph.nodes.filter(node => !characters.some(item => item.id === node.id)).map(node => node.id), 'unrelated canvas nodes are preserved');
  await page.getByRole('button', { name: '撤销', exact: true }).click();
  await page.getByRole('img', { name: removedCharacter.data.title, exact: true }).waitFor();
  assert.deepEqual(imageIdentity(characterGraph(await state())), imageIdentity(characters), 'one undo restores the removed image with its original ID and gallery');
  await waitForSavedCharacters(characters);
  await page.reload(); await page.getByRole('button', { name: '素材与图片', exact: true }).waitFor();
  await page.getByRole('img', { name: character.data.title, exact: true }).waitFor();
  assert.deepEqual(imageIdentity(characterGraph(await state())), imageIdentity(characters), 'saving and reloading retains all independent images, never one combined node');

  // Also prove a deletion survives reload: loading must not regenerate a hidden sibling from the catalog.
  const discardedSheet = characters[characters.length - 1];
  await page.getByRole('button', { name: `从画布移除：${discardedSheet.data.title}`, exact: true }).click();
  await page.getByRole('img', { name: discardedSheet.data.title, exact: true }).waitFor({ state: 'detached' });
  remainingCharacters = characterGraph(await state());
  assert.equal(remainingCharacters.length, characters.length - 1);
  await waitForSavedCharacters(remainingCharacters, [discardedSheet.id]);
  await page.reload(); await page.getByRole('button', { name: '素材与图片', exact: true }).waitFor();
  await page.getByRole('img', { name: character.data.title, exact: true }).waitFor();
  assert.deepEqual(imageIdentity(characterGraph(await state())), imageIdentity(remainingCharacters), 'removed image stays removed after saving and reloading');
  const imageId = await page.evaluate(async () => { const source = performance.getEntriesByType('resource').find(item => new URL(item.name).pathname === '/src/stores/workflowStore.ts')?.name || '/src/stores/workflowStore.ts'; const { useWorkflowStore } = await import(source); return useWorkflowStore.getState().addNode('image', { x: 450, y: 400 }); });
  await open(); await page.getByRole('tab', { name: '风格库', exact: true }).click();
  await page.getByRole('button', { name: `查看风格：${firstStyle.name}` }).waitFor();
  const cardGeometry = await page.locator('.creative-card-image').first().evaluate(element => { const box = element.getBoundingClientRect(); return { width: box.width, ratio: box.width / box.height }; });
  assert.ok(cardGeometry.width <= 220 && Math.abs(cardGeometry.ratio - 0.8) < 0.01, 'style covers retain 4:5 ratio and fixed card width');
  await page.getByRole('button', { name: '列表视图', exact: true }).click();
  await page.locator('.creative-card-grid.is-list').waitFor();
  await page.getByRole('button', { name: '网格视图', exact: true }).click();
  await page.getByText('查看模板说明', { exact: true }).click();
  await page.getByText('此资源为描述模板', { exact: false }).waitFor();
  await page.screenshot({ path: `${outputDir}/style-library.png` });
  await page.getByRole('button', { name: '应用并连接', exact: true }).click(); await dialog.waitFor({ state: 'detached' });
  let snapshot = await state(); const style = snapshot.nodes.find(node => node.data.kind === 'style');
  assert.ok(snapshot.edges.some(edge => edge.source === style.id && edge.target === imageId));
  assert.ok(snapshot.nodes.find(node => node.id === imageId).data.referenceNodeIds.includes(style.id));
  assert.equal(style.data.resourcePrompt, firstStyle.prompt);
  const videoId = await page.evaluate(async () => { const source = performance.getEntriesByType('resource').find(item => new URL(item.name).pathname === '/src/stores/workflowStore.ts')?.name || '/src/stores/workflowStore.ts'; const { useWorkflowStore } = await import(source); return useWorkflowStore.getState().addNode('video', { x: 850, y: 400 }); });
  await open(); await page.getByRole('tab', { name: '特效库', exact: true }).click();
  await page.getByRole('button', { name: `查看特效：${firstEffect.name}` }).waitFor();
  await page.getByText('当前为静态示意图，动态效果需在下游生成', { exact: true }).waitFor();
  await page.screenshot({ path: `${outputDir}/effect-library.png` });
  await page.getByRole('button', { name: '应用并连接', exact: true }).click(); await dialog.waitFor({ state: 'detached' });
  snapshot = await state(); const effect = snapshot.nodes.find(node => node.data.kind === 'effect');
  assert.equal(effect.data.assetUrl, undefined); assert.equal(effect.data.resourceCoverUrl, firstEffect.coverUrl);
  assert.equal(snapshot.nodes.find(node => node.id === videoId).data.assetUrl, undefined, 'effect cover never replaces the video first frame');
  assert.ok(snapshot.edges.some(edge => edge.source === effect.id && edge.target === videoId));
  for (const resourceNode of [character, style, effect]) {
    await page.evaluate(async id => { const source = performance.getEntriesByType('resource').find(item => new URL(item.name).pathname === '/src/stores/workflowStore.ts')?.name || '/src/stores/workflowStore.ts'; const { useWorkflowStore } = await import(source); useWorkflowStore.getState().requestRun(id); }, resourceNode.id);
    await dialog.waitFor();
    assert.equal((await state()).nodes.find(node => node.id === resourceNode.id).data.status, 'idle', 'resource run opens picker without simulating success');
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
  }
  await page.waitForFunction(id => Object.keys(localStorage).some(key => key.startsWith('ai-script:visual-workflow:') && localStorage.getItem(key).includes(id)), firstEffect.id);
  await page.reload(); await page.getByRole('button', { name: '素材与图片', exact: true }).waitFor();
  assert.ok((await state()).nodes.some(node => node.data.kind === 'effect'), 'resource application persists');
  failList = true;
  await page.getByRole('button', { name: '素材与图片', exact: true }).click();
  await page.getByText('资源库暂不可用', { exact: true }).waitFor();
  assert.equal(await dialog.locator('.creative-card').count(), 0, 'API failure does not show demo data');
  failList = false; await page.getByRole('button', { name: '重新加载', exact: true }).click();
  await page.getByRole('button', { name: `查看角色：${firstCharacter.name}` }).waitFor();
  await page.getByRole('button', { name: '应用到画布', exact: true }).waitFor();
  failDetail = true;
  const beforeFailure = (await state()).nodes.length;
  await page.getByRole('button', { name: '应用到画布', exact: true }).click();
  await dialog.getByRole('alert').waitFor();
  assert.equal((await state()).nodes.length, beforeFailure, 'unpublished/detail failure does not apply stale resource');
  failDetail = false; await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '添加节点', exact: true }).click();
  await page.getByRole('button', { name: '风格库', exact: true }).click();
  await page.getByRole('button', { name: `查看风格：${firstStyle.name}` }).waitFor();
  await page.setViewportSize({ width: 1024, height: 768 });
  await assertClearCanvasMargins(16);
  await page.screenshot({ path: `${outputDir}/library-1024.png`, animations: 'disabled' });
  assert.equal(await dialog.evaluate(element => element.scrollWidth <= window.innerWidth), true, 'dialog fits 1024px viewport');
  await page.keyboard.press('Escape');
  userId = 'creative-qa-other-user'; await page.reload(); await open();
  await page.getByRole('button', { name: '我的收藏（本机）', exact: true }).click();
  await dialog.locator('.character-set-state').getByText('还没有匹配的收藏', { exact: true }).waitFor();
  assert.deepEqual(failures, [], 'no browser runtime errors'); assert.equal(providerCalls, 0);
  console.log(JSON.stringify({ passed: true, catalog: 'public/creative-library/catalog.json', checks: ['four simultaneous uncropped character views', 'truthful missing views', 'unblurred canvas and visible top/bottom margins', 'image Escape and focus restore', 'search', 'category', 'style grid/list and 4:5 cards', 'scoped favorites', 'recent use', 'library Escape and focus restore', 'entire gallery applied as independent single-image nodes', 'individual X preserves selected siblings', 'undo restores deleted image', 'persist/reload preserves the split set and deleted images stay removed', 'style downstream references', 'effect cover isolation', 'static effect description', 'resource run does not simulate success', 'persist/reload', 'API failure/retry', 'unpublished rejection', 'NodeLibrary entry', '1024px layout', 'account isolation'], outputDir }, null, 2));
} catch (error) { await page.screenshot({ path: `${outputDir}/failure.png` }); console.error('Browser errors:', failures); throw error; }
finally { await browser.close(); }
