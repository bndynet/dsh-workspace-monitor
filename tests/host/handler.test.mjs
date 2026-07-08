import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createScanHandler, apply, inject } from '../../src/host/index.mjs';

const owner = { principal: { kind: 'owner' }, signal: new AbortController().signal };

async function workspace(t) {
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-monitor-host-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const path = join(temporary, 'project');
  await mkdir(path);
  return { path: await realpath(path), temporary };
}

function context(headers = new Map(), jobs = []) {
  return {
    sessions: { get: id => headers.has(id) ? { header: headers.get(id) } : undefined },
    sessionPersistence: { stat: async () => undefined },
    jobs: { list: () => jobs },
  };
}

function snapshot(path, overrides = {}) {
  return { workspacePath: path, scannedAt: Date.now(), tasks: [], warnings: [], ...overrides };
}

async function invoke(handler, payload = { sessionId: 'one' }, { signal, peer = owner, endpoint = 'scan' } = {}) {
  return handler(endpoint, payload, signal ?? new AbortController().signal, peer);
}

function refused(result) {
  assert.equal(result.ok, false);
  assert.equal(typeof result.error.code, 'string');
  assert.equal(typeof result.error.message, 'string');
  assert.equal(typeof result.error.details, 'object');
}

test('owner authorization runs before session lookup or OS access', async () => {
  let calls = 0;
  const ctx = context();
  ctx.sessions.get = () => { throw new Error('Session lookup must not be reached'); };
  const handler = createScanHandler(ctx, { scanWorkspace: async () => { calls++; } });
  for (const peer of [undefined, null, {}, { principal: { kind: 'guest' } }]) {
    const result = await handler('scan', { sessionId: 'one' }, new AbortController().signal, peer);
    refused(result);
  }
  assert.equal(calls, 0);
});

test('unknown endpoints do not enter the scanner', async () => {
  let calls = 0;
  const handler = createScanHandler(context(), { scanWorkspace: async () => { calls++; } });
  for (const endpoint of ['kill', 'scan/extra', '', 'list']) {
    refused(await invoke(handler, { sessionId: 'one' }, { endpoint }));
  }
  assert.equal(calls, 0);
});

test('payload validation rejects path injection, unknown keys, arrays, and invalid types', async () => {
  let calls = 0;
  const handler = createScanHandler(context(), { scanWorkspace: async () => { calls++; } });
  const invalid = [
    null, [], 'one', 1, {}, { sessionId: '' }, { sessionId: '   ' },
    { sessionId: 42 }, { sessionId: ['one'] },
    { sessionId: 'one', workspacePath: '/' },
    { sessionId: 'one', command: 'echo unexpected' },
    { sessionId: 'one', includeInfrastructure: 'false' },
    { sessionId: 'one', includeInfrastructure: 1 },
    { sessionId: 'one', includeInfrastructure: null },
  ];
  for (const payload of invalid) {
    refused(await invoke(handler, payload));
  }
  assert.equal(calls, 0);
});

test('unknown sessions and headers without an absolute cwd are refused', async () => {
  let calls = 0;
  const headers = new Map([
    ['missing-cwd', {}],
    ['relative', { cwd: 'project/subdir' }],
  ]);
  const handler = createScanHandler(context(headers), { scanWorkspace: async () => { calls++; } });
  for (const sessionId of ['unknown', 'missing-cwd', 'relative']) {
    refused(await invoke(handler, { sessionId }));
  }
  assert.equal(calls, 0);
});

test('the Host resolves the project from the live session header', async t => {
  const { path } = await workspace(t);
  const ctx = context(new Map([['one', { cwd: path }]]));
  ctx.sessionPersistence.stat = async () => { throw new Error('Live header should win'); };
  let observed;
  const handler = createScanHandler(ctx, {
    scanWorkspace: async options => {
      observed = options;
      return snapshot(options.workspacePath);
    },
  });
  const result = await invoke(handler, { sessionId: 'one', includeInfrastructure: true });
  assert.equal(result.ok, true);
  assert.equal(result.value.workspacePath, path);
  assert.equal(observed.workspacePath, path);
  assert.equal(observed.includeInfrastructure, true);
  assert.ok(observed.signal instanceof AbortSignal);
});

test('persisted session headers work without activating an agent', async t => {
  const { path } = await workspace(t);
  const ctx = context();
  let lookedUp;
  ctx.sessionPersistence.stat = async id => {
    lookedUp = id;
    return { header: { cwd: path } };
  };
  const handler = createScanHandler(ctx, {
    scanWorkspace: async options => snapshot(options.workspacePath),
  });
  const result = await invoke(handler);
  assert.equal(result.ok, true);
  assert.equal(lookedUp, 'one');
  assert.equal(result.value.workspacePath, path);
});

test('cache expires and separates the includeInfrastructure option', async t => {
  const { path } = await workspace(t);
  let now = 1_000;
  let calls = 0;
  const handler = createScanHandler(context(new Map([['one', { cwd: path }]])), {
    now: () => now,
    cacheTtlMs: 2_000,
    scanWorkspace: async options => {
      calls++;
      return snapshot(options.workspacePath, { scannedAt: now });
    },
  });
  assert.equal((await invoke(handler)).ok, true);
  now = 2_000;
  assert.equal((await invoke(handler)).ok, true);
  assert.equal(calls, 1, 'A successful recent scan should be reused');
  assert.equal((await invoke(handler, { sessionId: 'one', includeInfrastructure: true })).ok, true);
  assert.equal(calls, 2, 'Infrastructure visibility must have a distinct cache entry');
  now = 4_001;
  assert.equal((await invoke(handler)).ok, true);
  assert.equal(calls, 3, 'An expired scan must be refreshed');
});

test('cache keys canonicalize a symlink to the same workspace', async t => {
  const { path, temporary } = await workspace(t);
  const alias = join(temporary, 'project-alias');
  await symlink(path, alias, process.platform === 'win32' ? 'junction' : 'dir');
  let calls = 0;
  const handler = createScanHandler(context(new Map([
    ['one', { cwd: path }], ['two', { cwd: alias }],
  ])), {
    scanWorkspace: async options => { calls++; return snapshot(options.workspacePath); },
  });
  assert.equal((await invoke(handler)).ok, true);
  assert.equal((await invoke(handler, { sessionId: 'two' })).ok, true);
  assert.equal(calls, 1);
});

test('cached data never bypasses current owner and session checks', async t => {
  const { path } = await workspace(t);
  const headers = new Map([['one', { cwd: path }]]);
  let calls = 0;
  const handler = createScanHandler(context(headers), {
    scanWorkspace: async options => { calls++; return snapshot(options.workspacePath); },
  });
  assert.equal((await invoke(handler)).ok, true);
  refused(await invoke(handler, { sessionId: 'one' }, { peer: { principal: { kind: 'guest' } } }));
  headers.delete('one');
  refused(await invoke(handler));
  assert.equal(calls, 1);
});

test('scanner errors are sanitized and failed scans are not cached', async t => {
  const { path } = await workspace(t);
  let calls = 0;
  const secret = '--token=very-private-value';
  const handler = createScanHandler(context(new Map([['one', { cwd: path }]])), {
    scanWorkspace: async options => {
      if (++calls === 1) throw new Error(`spawn failed: command ${secret}`);
      return snapshot(options.workspacePath);
    },
  });
  const failed = await invoke(handler);
  refused(failed);
  assert.equal(JSON.stringify(failed).includes('very-private-value'), false);
  assert.equal((await invoke(handler)).ok, true);
  assert.equal(calls, 2);
});

test('job visibility remains session scoped when process scan cache is shared', async t => {
  const { path } = await workspace(t);
  const headers = new Map([['one', { cwd: path }], ['two', { cwd: path }]]);
  const jobs = [
    { id: 'bash-one', owner: 'one', status: 'running', label: 'npm run dev' },
    { id: 'bash-two', owner: 'two', status: 'running', label: 'java -jar app.jar' },
    { id: 'bash-done', owner: 'one', status: 'completed', label: 'old task' },
    { id: 'bash-unowned', status: 'running', label: 'unattributed task' },
  ];
  const ctx = context(headers);
  const readers = [];
  ctx.jobs.list = sessionId => { readers.push(sessionId); return jobs; };
  let calls = 0;
  const handler = createScanHandler(ctx, {
    scanWorkspace: async options => { calls++; return snapshot(options.workspacePath); },
  });
  const first = await invoke(handler);
  const second = await invoke(handler, { sessionId: 'two' });
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(first.value.jobs.map(job => job.id), ['bash-one']);
  assert.deepEqual(second.value.jobs.map(job => job.id), ['bash-two']);
  assert.deepEqual(readers, ['one', 'two']);
  assert.equal(calls, 1);
});

test('a pre-aborted request cannot start a system scan', async t => {
  const { path } = await workspace(t);
  let calls = 0;
  const handler = createScanHandler(context(new Map([['one', { cwd: path }]])), {
    scanWorkspace: async options => { calls++; return snapshot(options.workspacePath); },
  });
  const controller = new AbortController();
  controller.abort();
  try {
    refused(await invoke(handler, { sessionId: 'one' }, { signal: controller.signal }));
  } catch (error) {
    assert.equal(error.name, 'AbortError');
  }
  assert.equal(calls, 0);
});

test('cancelling one in-flight request preserves another request for the same workspace', async t => {
  const { path } = await workspace(t);
  const pending = [];
  const handler = createScanHandler(context(new Map([['one', { cwd: path }]])), {
    scanWorkspace: options => new Promise((resolve, reject) => {
      const abort = () => reject(options.signal.reason);
      options.signal.addEventListener('abort', abort, { once: true });
      pending.push({
        signal: options.signal,
        finish: () => {
          options.signal.removeEventListener('abort', abort);
          resolve(snapshot(options.workspacePath));
        },
      });
    }),
  });
  const firstControl = new AbortController();
  const secondControl = new AbortController();
  t.after(() => { firstControl.abort(); secondControl.abort(); });
  const first = invoke(handler, { sessionId: 'one' }, { signal: firstControl.signal });
  const second = invoke(handler, { sessionId: 'one' }, { signal: secondControl.signal });
  await until(() => pending.length === 2);
  firstControl.abort();
  const cancelled = await bounded(first);
  refused(cancelled);
  assert.equal(cancelled.error.code, 'workspace-monitor/cancelled');
  assert.equal(pending[0].signal.aborted, true);
  assert.equal(pending[1].signal.aborted, false);
  pending[1].finish();
  assert.equal((await bounded(second)).ok, true);
});

test('scan deadline reports timeout and aborts the underlying collector', async t => {
  const { path } = await workspace(t);
  let scannerSignal;
  const handler = createScanHandler(context(new Map([['one', { cwd: path }]])), {
    scanTimeoutMs: 20,
    scanWorkspace: options => {
      scannerSignal = options.signal;
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      });
    },
  });
  const result = await bounded(invoke(handler));
  refused(result);
  assert.equal(result.error.code, 'workspace-monitor/timeout');
  assert.equal(scannerSignal.aborted, true);
});

test('plugin lifetime cancellation aborts active collection', async t => {
  const { path } = await workspace(t);
  const lifetime = new AbortController();
  t.after(() => lifetime.abort());
  let scannerSignal;
  const handler = createScanHandler(context(new Map([['one', { cwd: path }]])), {
    lifetimeSignal: lifetime.signal,
    scanWorkspace: options => {
      scannerSignal = options.signal;
      return new Promise((resolve, reject) => {
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      });
    },
  });
  const running = invoke(handler);
  await until(() => scannerSignal !== undefined);
  lifetime.abort();
  const result = await bounded(running);
  refused(result);
  assert.equal(result.error.code, 'workspace-monitor/cancelled');
  assert.equal(scannerSignal.aborted, true);
});

test('the collector concurrency cap rejects extra scans without spawning work', async t => {
  const { path } = await workspace(t);
  const pending = [];
  const handler = createScanHandler(context(new Map([['one', { cwd: path }]])), {
    maxConcurrentScans: 2,
    scanWorkspace: options => new Promise(resolve => {
      pending.push(() => resolve(snapshot(options.workspacePath)));
    }),
  });
  const first = invoke(handler);
  const second = invoke(handler);
  await until(() => pending.length === 2);
  const busy = await invoke(handler);
  refused(busy);
  assert.equal(busy.error.code, 'workspace-monitor/busy');
  assert.equal(pending.length, 2);
  for (const finish of pending) finish();
  assert.equal((await first).ok, true);
  assert.equal((await second).ok, true);
});

test('the plugin registers its five exact authenticated API routes with required Host dependencies', async () => {
  assert.ok(inject.includes('connection'));
  assert.ok(inject.includes('sessions'));
  const registered = new Map();
  const cleanups = [];
  const ctx = {
    ...context(),
    connection: {
      fetch: {
        register: route => {
          registered.set(route.path, route);
          return () => registered.delete(route.path);
        },
      },
    },
    effect: callback => {
      const cleanup = callback();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
      return cleanup;
    },
    on: () => () => {},
  };
  apply(ctx);
  assert.deepEqual([...registered.keys()].sort(), ['commands', 'output', 'run', 'scan', 'stop'].map(endpoint => `/api/workspace-monitor/${endpoint}`));
  for (const route of registered.values()) {
    assert.deepEqual(route.methods, ['POST']);
    assert.equal(route.requestBody, 'buffered');
    assert.equal(typeof route.fetch, 'function');
  }
  for (const cleanup of cleanups.reverse()) await cleanup();
});

test('unloading the plugin cancels and awaits an already admitted request', async t => {
  const { path } = await workspace(t);
  const cleanups = [];
  const registered = new Map();
  const ctx = {
    ...context(new Map([['one', { cwd: path }]])),
    connection: {
      fetch: { register: route => { registered.set(route.path, route); return () => registered.delete(route.path); } },
    },
    effect: callback => {
      const cleanup = callback();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
      return cleanup;
    },
  };
  apply(ctx);
  const handler = registered.get('/api/workspace-monitor/scan').fetch;
  // The handler reaches its first await (directory canonicalization), then disposal
  // withdraws its lifetime before a real system collector can start.
  const running = handler(apiRequest({ sessionId: 'one' }));
  await Promise.all(cleanups.reverse().map(cleanup => cleanup()));
  const response = await bounded(running);
  const { result } = await response.json();
  refused(result);
  assert.equal(result.error.code, 'workspace-monitor/cancelled');
  const later = (await (await handler(apiRequest({ sessionId: 'one' }))).json()).result;
  refused(later);
  assert.equal(later.error.code, 'workspace-monitor/cancelled');
});

test('the exact-route adapter preserves RPC correlation and dispatches only the embedded payload', async () => {
  let selected;
  const ctx = context();
  ctx.sessions.get = sessionId => { selected = sessionId; return undefined; };
  const { route, dispose } = mountedRoute(ctx);
  try {
    const response = await route.fetch(apiRequest({ sessionId: 'not-loaded' }, { rpcId: 'request-unique-42' }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const body = await response.json();
    assert.equal(body.type, 'server-response');
    assert.equal(body.rpcId, 'request-unique-42');
    assert.equal(selected, 'not-loaded');
    refused(body.result);
    assert.equal(body.result.error.code, 'workspace-monitor/session-not-found');
  } finally { await dispose(); }
});

test('the exact-route adapter rejects malformed RPC envelopes before reading sessions', async () => {
  let sessionReads = 0;
  const ctx = context();
  ctx.sessions.get = () => { sessionReads++; return undefined; };
  const { route, dispose } = mountedRoute(ctx);
  const valid = {
    type: 'client-request', rpcId: 'request-one', method: 'workspace-monitor/scan', payload: { sessionId: 'one' },
  };
  const malformed = [
    null, [], {},
    { ...valid, type: 'server-response' },
    { ...valid, rpcId: '' },
    { ...valid, rpcId: 100 },
    { ...valid, method: 'workspace-monitor/kill' },
    { ...valid, method: 'scan' },
  ];
  try {
    for (const envelope of malformed) {
      const response = await route.fetch(new Request('http://localhost/api/workspace-monitor/scan', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(envelope),
      }));
      assert.ok(response.status >= 400, `Malformed envelope must fail: ${JSON.stringify(envelope)}`);
    }
    const invalidJSON = await route.fetch(new Request('http://localhost/api/workspace-monitor/scan', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{',
    }));
    assert.ok(invalidJSON.status >= 400);
    assert.equal(sessionReads, 0);
  } finally { await dispose(); }
});

test('a valid transport envelope still receives business payload validation', async () => {
  const { route, dispose } = mountedRoute(context());
  try {
    const response = await route.fetch(apiRequest({ sessionId: 'one', workspacePath: '/' }));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.rpcId, 'fixture-rpc');
    refused(body.result);
    assert.equal(body.result.error.code, 'workspace-monitor/bad-request');
  } finally { await dispose(); }
});

function mountedRoute(base) {
  const registered = new Map();
  const cleanups = [];
  const ctx = {
    ...base,
    connection: { fetch: { register: route => { registered.set(route.path, route); return () => registered.delete(route.path); } } },
    effect: callback => {
      const cleanup = callback();
      if (typeof cleanup === 'function') cleanups.push(cleanup);
      return cleanup;
    },
  };
  apply(ctx);
  return { route: registered.get('/api/workspace-monitor/scan'), routes: registered, dispose: () => Promise.all(cleanups.reverse().map(cleanup => cleanup())) };
}

function apiRequest(payload, overrides = {}) {
  return new Request('http://localhost/api/workspace-monitor/scan', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      type: 'client-request', rpcId: 'fixture-rpc', method: 'workspace-monitor/scan', payload, ...overrides,
    }),
  });
}

async function until(predicate) {
  const deadline = Date.now() + 1_000;
  while (!predicate()) {
    if (Date.now() > deadline) assert.fail('Collector did not enter the expected state');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

async function bounded(promise) {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Request did not settle after cancellation')), 1_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
