import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { createServer } from 'vite';
import { createServer as createHttpServer } from 'node:http';
import { AxiosError } from 'axios';

let server;
let store;
let api;
const originalWindow = globalThis.window;
const pending = [];
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const draft = (id) => ({
  script: { id, projectId: 'project-1', name: `Script ${id}`, type: 'original', status: 'draft', content: `Original ${id}`, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
  input: '', productFrame: null, manualEditing: false, messages: [],
});
const payload = { content: 'Original', instruction: 'Make it clearer', expectedPointCost: 5 };
const result = (id) => ({ content: `Polished ${id}`, summary: `Finished ${id}`, status: 'draft' });

before(async () => {
  globalThis.window = new EventTarget();
  server = await createServer({
    configFile: false, ssr: { noExternal: ['antd'] }, server: { middlewareMode: true, hmr: { server: createHttpServer() } },
    plugins: [{
      name: 'polish-test-boundaries', enforce: 'pre',
      resolveId(id, importer) {
        if (id === 'antd') return '\0polish-test-notifications';
        if (id === '../api/script' && importer?.endsWith('/scriptPolishStore.ts')) return '\0polish-test-api';
      },
      load(id) {
        if (id === '\0polish-test-notifications') return 'export const message = { success() {}, error() {} };';
        if (id === '\0polish-test-api') return 'export const scriptApi = {};';
      },
    }],
  });
  api = (await server.ssrLoadModule('\0polish-test-api')).scriptApi;
  store = (await server.ssrLoadModule('/src/stores/scriptPolishStore.ts')).useScriptPolishStore;
});

beforeEach(() => {
  store.getState().reset();
  pending.length = 0;
  api.polish = (id, request, signal) => {
    const task = { ...deferred(), id, request, signal };
    pending.push(task);
    signal.addEventListener('abort', () => task.reject(new DOMException('Canceled', 'AbortError')), { once: true });
    return task.promise;
  };
  api.cancelPolish = async () => {};
});

after(async () => {
  store?.getState().reset();
  await server?.close();
  globalThis.window = originalWindow;
});

test('minimized scripts run independently and completion cannot overwrite another script', async () => {
  const a = store.getState().start(draft('A'), payload);
  store.getState().minimize(draft('A'));
  const b = store.getState().start(draft('B'), payload);
  await store.getState().start(draft('B'), payload);
  assert.equal(pending.length, 2, 'duplicate submit must not start another paid request');
  pending[0].resolve(result('A'));
  await a;
  assert.equal(store.getState().sessions.A.status, 'success');
  assert.equal(store.getState().sessions.A.minimized, true);
  assert.equal(store.getState().sessions.B.status, 'running');
  assert.equal(store.getState().sessions.B.draft.script.content, 'Original B');
  store.getState().minimize(draft('A'));
  assert.equal(store.getState().sessions.A.draft.script.content, 'Polished A', 'unmount must not restore an older draft over a completed result');
  pending[1].resolve(result('B'));
  await b;
  assert.equal(store.getState().sessions.B.draft.script.content, 'Polished B');
});

test('a failed cancellation does not pretend to stop or abort the active request', async () => {
  const work = store.getState().start(draft('A'), payload);
  api.cancelPolish = async () => { throw new Error('Offline'); };
  await assert.rejects(store.getState().stop('A'), /Offline/);
  assert.equal(store.getState().sessions.A.status, 'running');
  assert.equal(pending[0].signal.aborted, false);
  pending[0].resolve(result('A'));
  await work;
});

test('stopping one script waits for server acknowledgement and leaves other scripts running', async () => {
  const a = store.getState().start(draft('A'), payload);
  const b = store.getState().start(draft('B'), payload);
  const cancellation = deferred();
  api.cancelPolish = () => cancellation.promise;
  const stopping = store.getState().stop('A');
  assert.equal(store.getState().sessions.A.status, 'stopping');
  assert.equal(pending[0].signal.aborted, false);
  cancellation.resolve();
  await stopping;
  await a;
  assert.equal(store.getState().sessions.A.status, 'canceled');
  assert.equal(pending[0].signal.aborted, true);
  assert.equal(store.getState().sessions.B.status, 'running');
  assert.equal(pending[1].signal.aborted, false);
  pending[1].resolve(result('B'));
  await b;
});

test('completion that wins a cancellation race is retained', async () => {
  const work = store.getState().start(draft('A'), payload);
  const cancellation = deferred();
  api.cancelPolish = () => cancellation.promise;
  const stopping = store.getState().stop('A');
  pending[0].resolve(result('A'));
  await work;
  cancellation.resolve();
  await stopping;
  assert.equal(store.getState().sessions.A.status, 'success');
  assert.equal(store.getState().sessions.A.draft.script.content, 'Polished A');
});

test('retry after an ambiguous timeout reuses its request number', async () => {
  const work = store.getState().start(draft('A'), payload);
  const firstRequestNo = pending[0].request.requestNo;
  pending[0].reject(new AxiosError('Timed out', 'ECONNABORTED'));
  await work;
  const retry = store.getState().start(draft('A'), payload);
  assert.equal(pending[1].request.requestNo, firstRequestNo);
  pending[1].resolve(result('A'));
  await retry;
});

test('failed minimized requests restore the original input and Brief for a safe retry', async () => {
  const originalDraft = { ...draft('A'), input: 'User input only', briefId: 'brief-A' };
  const work = store.getState().start(originalDraft, { ...payload, instruction: 'User input only + annotations', briefId: 'brief-A' });
  store.getState().minimize({ ...originalDraft, input: '', briefId: undefined });
  pending[0].reject(new AxiosError('Timed out', 'ECONNABORTED'));
  await work;
  assert.equal(store.getState().sessions.A.draft.input, 'User input only');
  assert.equal(store.getState().sessions.A.draft.briefId, 'brief-A');
});

test('account reset clears sessions and ignores late results', async () => {
  const work = store.getState().start(draft('A'), payload);
  store.getState().reset();
  await work;
  pending[0].resolve(result('A'));
  assert.deepEqual(store.getState().sessions, {});
  assert.equal(pending[0].signal.aborted, true);
});
