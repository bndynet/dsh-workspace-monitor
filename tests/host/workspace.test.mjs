import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createScanHandler } from '../../src/host/index.mjs';

const owner = { principal: { kind: 'owner' } };
const requestSignal = () => new AbortController().signal;
const invoke = (handler, payload, peer = owner) => handler('scan', payload, requestSignal(), peer);
const snapshot = workspacePath => ({ workspacePath, scannedAt: Date.now(), tasks: [], warnings: [] });

async function workspace(t) {
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-monitor-workspace-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const directory = join(temporary, 'project');
  await mkdir(directory);
  return { path: await realpath(directory), temporary };
}

function context(records = new Map()) {
  return {
    workspaceRegistry: { get: id => records.get(id) },
    sessions: { get: () => { throw new Error('Workspace preview must not resolve a session'); } },
    sessionPersistence: { stat: () => { throw new Error('Workspace preview must not resolve persisted sessions'); } },
    jobs: { list: () => { throw new Error('Workspace preview must not enumerate session jobs'); } },
  };
}

test('workspace preview enforces owner authorization before registry or filesystem access', async () => {
  let scans = 0;
  const ctx = context();
  ctx.workspaceRegistry.get = () => { throw new Error('Unauthorized registry access'); };
  const handler = createScanHandler(ctx, { scanWorkspace: async () => { scans++; } });
  for (const peer of [undefined, null, {}, { principal: { kind: 'guest' } }]) {
    const result = await handler('scan', { workspaceId: 'project-one' }, requestSignal(), peer);
    assert.equal(result.ok, false);
    assert.equal(result.error.code, 'workspace-monitor/forbidden');
  }
  assert.equal(scans, 0);
});

test('a registered workspace can be scanned without creating or reading a session', async t => {
  const { path } = await workspace(t);
  const ctx = context(new Map([['project-one', { id: 'project-one', path, title: 'My project' }]]));
  let observed;
  const handler = createScanHandler(ctx, {
    scanWorkspace: async options => { observed = options; return snapshot(options.workspacePath); },
  });
  const result = await invoke(handler, { workspaceId: 'project-one', includeInfrastructure: true });
  assert.equal(result.ok, true);
  assert.equal(result.value.workspaceId, 'project-one');
  assert.equal(result.value.workspaceTitle, 'My project');
  assert.equal(result.value.workspacePath, path);
  assert.deepEqual(result.value.jobs, []);
  assert.equal(observed.workspacePath, path);
  assert.equal(observed.includeInfrastructure, true);
  assert.ok(observed.signal instanceof AbortSignal);
});

test('exactly one valid identity is required and workspace requests reject path injection', async () => {
  let lookups = 0, scans = 0;
  const ctx = context();
  ctx.workspaceRegistry.get = () => { lookups++; };
  ctx.sessions.get = () => { lookups++; };
  const handler = createScanHandler(ctx, { scanWorkspace: async () => { scans++; } });
  const invalid = [
    {}, { workspaceId: '' }, { workspaceId: ' \t ' }, { workspaceId: 42 },
    { workspaceId: ['project-one'] }, { workspaceId: 'x'.repeat(257) },
    { workspaceId: 'project\nother' }, { workspaceId: 'project\0other' }, { workspaceId: 'project\x7fother' },
    { sessionId: 'x'.repeat(257) }, { sessionId: 'session\x7fother' },
    { sessionId: 'one', workspaceId: 'project-one' },
    { sessionId: 'one', workspaceId: undefined },
    { workspaceId: 'project-one', sessionId: undefined },
    { workspaceId: 'project-one', path: '/' },
    { workspaceId: 'project-one', workspacePath: '/' },
    { workspaceId: 'project-one', command: 'unexpected' },
    { workspaceId: 'project-one', includeInfrastructure: 'true' },
    { workspaceId: 'project-one', includeInfrastructure: null },
  ];
  for (const payload of invalid) {
    const result = await invoke(handler, payload);
    assert.equal(result.ok, false, JSON.stringify(payload));
    assert.equal(result.error.code, 'workspace-monitor/bad-request', JSON.stringify(payload));
  }
  assert.equal(lookups, 0);
  assert.equal(scans, 0);
});

test('unknown workspace IDs and unavailable registry paths never reach the scanner', async t => {
  const { path, temporary } = await workspace(t);
  const file = join(temporary, 'not-a-directory');
  await writeFile(file, 'fixture');
  const records = new Map([
    ['relative', { id: 'relative', path: 'project', title: 'Relative' }],
    ['file', { id: 'file', path: file, title: 'File' }],
    ['missing', { id: 'missing', path: join(path, 'missing'), title: 'Missing' }],
    ['no-path', { id: 'no-path', title: 'No path' }],
  ]);
  let scans = 0;
  const handler = createScanHandler(context(records), { scanWorkspace: async () => { scans++; } });
  const unknown = await invoke(handler, { workspaceId: 'unknown' });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.error.code, 'workspace-monitor/workspace-not-found');
  for (const workspaceId of records.keys()) {
    const result = await invoke(handler, { workspaceId });
    assert.equal(result.ok, false, workspaceId);
    assert.ok(['workspace-monitor/no-workspace', 'workspace-monitor/workspace-unavailable'].includes(result.error.code), workspaceId);
  }
  assert.equal(scans, 0);
});

test('workspace preview resolves symlinks before collecting processes', async t => {
  const { path, temporary } = await workspace(t);
  const alias = join(temporary, 'project-alias');
  await symlink(path, alias, process.platform === 'win32' ? 'junction' : 'dir');
  const ctx = context(new Map([['project-one', { id: 'project-one', path: alias, title: 'Linked project' }]]));
  let observed;
  const handler = createScanHandler(ctx, {
    scanWorkspace: async options => { observed = options.workspacePath; return snapshot(options.workspacePath); },
  });
  const result = await invoke(handler, { workspaceId: 'project-one' });
  assert.equal(result.ok, true);
  assert.equal(observed, path);
  assert.equal(result.value.workspacePath, path);
});

test('cached workspace scans revalidate the registry and use current identity metadata', async t => {
  const { path, temporary } = await workspace(t);
  const second = join(temporary, 'second');
  await mkdir(second);
  const secondPath = await realpath(second);
  const records = new Map([['project-one', { id: 'project-one', path, title: 'First title' }]]);
  const ctx = context(records);
  let scans = 0, lookups = 0;
  ctx.workspaceRegistry.get = id => { lookups++; return records.get(id); };
  const handler = createScanHandler(ctx, {
    scanWorkspace: async options => { scans++; return snapshot(options.workspacePath); },
  });
  assert.equal((await invoke(handler, { workspaceId: 'project-one' })).ok, true);
  records.set('project-one', { id: 'project-one', path, title: 'Renamed project' });
  const renamed = await invoke(handler, { workspaceId: 'project-one' });
  assert.equal(renamed.ok, true);
  assert.equal(renamed.value.workspaceTitle, 'Renamed project');
  assert.equal(scans, 1, 'A rename does not require another OS scan');
  records.delete('project-one');
  const removed = await invoke(handler, { workspaceId: 'project-one' });
  assert.equal(removed.ok, false);
  assert.equal(removed.error.code, 'workspace-monitor/workspace-not-found');
  records.set('project-one', { id: 'project-one', path: secondPath, title: 'Moved project' });
  const moved = await invoke(handler, { workspaceId: 'project-one' });
  assert.equal(moved.ok, true);
  assert.equal(moved.value.workspacePath, secondPath);
  assert.equal(scans, 2);
  assert.equal(lookups, 4, 'Every request revalidates the current registry, even on cache hits');
});

test('session and workspace requests share only OS data, preserving session job scope', async t => {
  const { path } = await workspace(t);
  const ctx = context(new Map([['project-one', { id: 'project-one', path, title: 'Project' }]]));
  ctx.sessions.get = id => id === 'session-one' ? { header: { cwd: path } } : undefined;
  const readers = [];
  ctx.jobs.list = id => {
    readers.push(id);
    return [
      { id: 'own-job', owner: 'session-one', status: 'running', label: 'npm run dev' },
      { id: 'foreign-job', owner: 'session-two', status: 'running', label: 'private command' },
    ];
  };
  let scans = 0;
  const handler = createScanHandler(ctx, { scanWorkspace: async options => { scans++; return snapshot(options.workspacePath); } });
  const session = await invoke(handler, { sessionId: 'session-one' });
  assert.equal(session.ok, true);
  assert.deepEqual(session.value.jobs.map(job => job.id), ['own-job']);
  assert.equal(session.value.workspaceTitle, undefined);
  const preview = await invoke(handler, { workspaceId: 'project-one' });
  assert.equal(preview.ok, true);
  assert.deepEqual(preview.value.jobs, []);
  assert.equal(preview.value.workspaceId, 'project-one');
  assert.equal(preview.value.workspaceTitle, 'Project');
  const sessionAgain = await invoke(handler, { sessionId: 'session-one' });
  assert.equal(sessionAgain.value.workspaceTitle, undefined);
  assert.deepEqual(sessionAgain.value.jobs.map(job => job.id), ['own-job']);
  assert.equal(scans, 1);
  assert.deepEqual(readers, ['session-one', 'session-one']);
});
