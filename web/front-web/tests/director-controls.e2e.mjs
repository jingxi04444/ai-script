// Real mouse/GPU controls test. API requests are mocked; no uploads or model execution.
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.DIRECTOR_PLAYWRIGHT_MODULE || 'playwright');
const outputDir = process.env.DIRECTOR_QA_OUTPUT || '/tmp/ai-script-director-controls-qa';
await mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.env.DIRECTOR_CHROMIUM_PATH ? { executablePath: process.env.DIRECTOR_CHROMIUM_PATH } : {}) });
const page = await browser.newPage({ viewport: { width: 1440, height: 920 } });
const failures = [];
const contextWarnings = [];
page.on('pageerror', error => failures.push(error.message));
page.on('console', event => { if (/Too many active WebGL contexts|CONTEXT_LOST_WEBGL/.test(event.text())) contextWarnings.push(event.text()); });
await page.route('**/api/**', async route => {
  const url = new URL(route.request().url());
  if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
  let data = { list: [], total: 0, page: 1, pageSize: 20, items: [], activeCount: 0, pendingCount: 0, runningCount: 0, concurrency: 1 };
  if (url.pathname.endsWith('/auth/user-info')) data = { id: 'controls-qa', username: '导演台控件测试', phone: '13800000000', email: 'controls@example.test' };
  if (url.pathname.endsWith('/workflow/models')) data = [];
  await route.fulfill({ json: { code: 0, message: 'success', data } });
});
await page.addInitScript(() => { localStorage.setItem('token', 'controls-qa-token'); localStorage.setItem('needsPhoneBinding', 'false'); localStorage.setItem('needsEmailBinding', 'false'); });
const scene = () => page.evaluate(async () => {
  const { useWorkflowStore } = await import('/src/stores/workflowStore.ts');
  return useWorkflowStore.getState().nodes.find(node => node.data.kind === 'director').data.directorScene;
});
const xHandle = async position => page.evaluate(async position => {
  const THREE = await import('/node_modules/three/build/three.module.js');
  const bounds = document.querySelector('.director-viewport-canvas').getBoundingClientRect();
  const camera = new THREE.PerspectiveCamera(42, bounds.width / bounds.height, 0.03, 300);
  camera.position.set(5.8, 3.6, 7);
  camera.lookAt(new THREE.Vector3(0, 0.95, 0));
  camera.updateMatrixWorld();
  const point = new THREE.Vector3(...position);
  const gizmoScale = point.distanceTo(camera.position) * 1.9 * Math.tan(Math.PI * 42 / 360) * 0.8 / 4;
  point.x += gizmoScale * 0.44;
  point.project(camera);
  return { x: bounds.x + (point.x + 1) / 2 * bounds.width, y: bounds.y + (1 - point.y) / 2 * bounds.height };
}, position);
const screenshot = name => page.screenshot({ path: `${outputDir}/${name}.png` });
const downloadFrame = async name => {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载当前机位 PNG', exact: true }).click();
  const download = await pending;
  const path = `${outputDir}/${name}.png`;
  await download.saveAs(path);
  return readFile(path);
};
try {
  await page.goto(`${process.env.DIRECTOR_BASE_URL || 'http://127.0.0.1:4174'}/workspace?step=visual`);
  await page.getByRole('button', { name: '添加节点', exact: true }).click();
  await page.getByRole('button', { name: '导演台 3D' }).click();
  const studio = page.getByRole('dialog', { name: '3D 导演台', exact: true });
  await studio.waitFor();
  await page.waitForFunction(() => document.querySelector('.director-viewport-canvas')?.width > 100);
  assert.equal(await page.locator('.director-viewport-error').count(), 0);
  await page.locator('.director-tree-select').filter({ hasText: '主角 · 产品瓶' }).click();
  let initial = (await scene()).objects[0];
  let handle = await xHandle(initial.position);
  await page.mouse.move(handle.x, handle.y);
  await screenshot('product-before-drag');
  await page.mouse.down();
  await page.mouse.move(handle.x + 65, handle.y - 5, { steps: 15 });
  assert.deepEqual((await scene()).objects[0].position, initial.position, 'transient drag does not persist every frame');
  await page.mouse.up();
  await page.waitForFunction(position => Number(document.querySelector('input[aria-label="位置 / m X"]')?.value) !== position, initial.position[0]);
  let moved = (await scene()).objects[0];
  assert.ok(Math.abs(moved.position[0] - initial.position[0]) > 0.1, 'real gizmo drag updates object X');
  assert.equal(moved.position[1], initial.position[1], 'X gizmo constrains Y');
  assert.equal(moved.position[2], initial.position[2], 'X gizmo constrains Z');
  await screenshot('product-after-drag');
  await page.getByRole('button', { name: '撤销导演台操作', exact: true }).click();
  assert.deepEqual((await scene()).objects[0].position, initial.position, 'one undo reverses whole drag');

  await page.getByRole('button', { name: '锁定主角 · 产品瓶', exact: true }).click();
  handle = await xHandle(initial.position);
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x + 65, handle.y, { steps: 10 });
  await page.mouse.up();
  assert.deepEqual((await scene()).objects[0].position, initial.position, 'locked object cannot be moved by stale gizmo');
  await page.getByRole('button', { name: '解锁主角 · 产品瓶', exact: true }).click();
  await page.getByRole('button', { name: '重置导演视角', exact: true }).click();

  await page.locator('.director-tree-select').filter({ hasText: '机位 1' }).click();
  await page.getByLabel('机位位置 / m X', { exact: true }).fill('3');
  await page.getByLabel('机位位置 / m Y', { exact: true }).fill('2');
  await page.getByLabel('机位位置 / m Z', { exact: true }).fill('2');
  const cameraBefore = (await scene()).cameras[0];
  handle = await xHandle(cameraBefore.position);
  await page.mouse.move(handle.x, handle.y);
  await page.mouse.down();
  await page.mouse.move(handle.x + 45, handle.y - 5, { steps: 12 });
  await page.mouse.up();
  await page.waitForFunction(position => Number(document.querySelector('input[aria-label="机位位置 / m X"]')?.value) !== position, cameraBefore.position[0]);
  const cameraAfter = (await scene()).cameras[0];
  assert.ok(Math.abs(cameraAfter.position[0] - cameraBefore.position[0]) > 0.1, 'real camera gizmo drag persists camera');
  assert.deepEqual(cameraAfter.position.slice(1), cameraBefore.position.slice(1));

  const withGuides = await downloadFrame('frame-editor-guides-on');
  await page.getByRole('button', { name: '场景设置', exact: true }).click();
  await page.getByLabel('显示辅助地面网格', { exact: true }).uncheck();
  await page.getByRole('button', { name: '机位视角', exact: true }).click();
  const withoutGuides = await downloadFrame('frame-editor-guides-off');
  assert.ok(withGuides.length > 10000);
  assert.deepEqual(withGuides, withoutGuides, 'PNG output identical regardless of grid, gizmo, selection and director/camera view');
  for (let index = 0; index < 7; index += 1) {
    await page.getByRole('button', { name: '返回画布', exact: true }).click();
    await studio.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: /^打开导演台：/ }).click();
    await page.waitForFunction(() => document.querySelector('.director-viewport-canvas')?.width > 100);
  }
  assert.deepEqual(failures, []);
  assert.deepEqual(contextWarnings, [], 'repeated mount/dispose does not exhaust GPU contexts');
  console.log(JSON.stringify({ passed: true, checks: ['real object X-gizmo drag', 'commit once on pointer-up', 'undo drag', 'locked object', 'real camera X-gizmo drag', 'clean deterministic PNG', '7 mount/unmount cycles'], outputDir }, null, 2));
} catch (error) {
  await screenshot('failure');
  console.error('Browser errors:', failures);
  throw error;
} finally { await browser.close(); }
