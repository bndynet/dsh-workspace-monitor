import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createActionHandler, createFetchHandler, createScanHandler } from '../../src/host/index.mjs';

const owner = { principal: { kind: 'owner' } };
const invoke = (handler, endpoint, payload, peer = owner, signal = new AbortController().signal) => handler(endpoint, payload, signal, peer);
const run = { id: 'run-one', runId: 'run-one', commandId: 'script-one', command: 'npm run dev', pid: 123, status: 'running' };

async function fixture(t) {
  const temporary = await mkdtemp(join(tmpdir(), 'dsh-monitor-action-host-'));
  t.after(() => rm(temporary, { recursive: true, force: true }));
  const path = await realpath(temporary);
  const calls = [];
  const ctx = {
    workspaceRegistry: { get: id => id === 'workspace-one' ? { id, path, title: 'Project' } : undefined },
    sessions: { get: id => id === 'session-one' ? { header: { cwd: path } } : undefined },
    sessionPersistence: { stat: async () => undefined },
  };
  const runner = Object.fromEntries(['run', 'stopManaged', 'output'].map(method => [method, async options => {
    calls.push({ method, options });
    return method === 'output' ? { ...run, output: 'ready' } : run;
  }]));
  return { path, ctx, runner, calls };
}

test('mutation authorization precedes every workspace lookup and action', async () => {
  const unreachable = () => { throw new Error('Unauthorized access'); };
  const ctx = { workspaceRegistry: { get: unreachable }, sessions: { get: unreachable } };
  const handler = createActionHandler(ctx, { discover: unreachable, runner: { run: unreachable }, stopTask: unreachable });
  for (const endpoint of ['commands', 'run', 'stop', 'output']) {
    const result = await invoke(handler, endpoint, { workspaceId: 'one', commandId: 'one' }, { principal: { kind: 'guest' } });
    assert.equal(result.error.code, 'workspace-monitor/forbidden');
  }
});

test('actions reject arbitrary commands, paths, PIDs and ambiguous identities', async t => {
  const { ctx, runner, calls } = await fixture(t);
  const handler = createActionHandler(ctx, { runner });
  for (const [endpoint, payload] of [
    ['commands', { workspaceId: 'workspace-one', path: '/' }],
    ['run', { workspaceId: 'workspace-one', command: 'rm anything' }],
    ['run', { workspaceId: 'workspace-one', commandId: 'one', cwd: '/' }],
    ['run', { workspaceId: 'workspace-one', sessionId: 'session-one', commandId: 'one' }],
    ['stop', { workspaceId: 'workspace-one', pid: 123 }],
    ['stop', { workspaceId: 'workspace-one', taskId: 'one', runId: 'one' }],
    ['stop', { workspaceId: 'workspace-one', runId: '' }],
    ['output', { workspaceId: 'workspace-one', runId: 'one', file: '/any/file' }],
  ]) assert.equal((await invoke(handler, endpoint, payload)).error.code, 'workspace-monitor/bad-request');
  assert.deepEqual(calls, []);
});

test('command discovery is scoped and does not start a process', async t => {
  const { ctx, runner, path, calls } = await fixture(t);
  let observed;
  const handler = createActionHandler(ctx, { runner, discover: async options => {
    observed = options;
    return { commands: [{ id: 'one', command: 'npm run dev' }], warnings: [] };
  } });
  const result = await invoke(handler, 'commands', { workspaceId: 'workspace-one' });
  assert.equal(result.ok, true);
  assert.equal(observed.workspacePath, path);
  assert.ok(observed.signal instanceof AbortSignal);
  assert.equal(result.value.commands[0].canRun, true);
  assert.deepEqual(calls, []);
});

test('run, managed stop and output receive only server-resolved paths and opaque IDs', async t => {
  const { ctx, runner, path, calls } = await fixture(t);
  const handler = createActionHandler(ctx, { runner });
  assert.equal((await invoke(handler, 'run', { sessionId: 'session-one', commandId: 'script-one' })).ok, true);
  assert.equal((await invoke(handler, 'stop', { workspaceId: 'workspace-one', runId: 'run-one' })).ok, true);
  assert.equal((await invoke(handler, 'output', { workspaceId: 'workspace-one', runId: 'run-one' })).value.output, 'ready');
  assert.deepEqual(calls.map(call => call.method), ['run', 'stopManaged', 'output']);
  assert.ok(calls.every(call => call.options.workspacePath === path));
  assert.equal(calls[0].options.commandId, 'script-one');
  assert.equal(calls[1].options.runId, 'run-one');
});

test('an external stop goes through identity-safe process control and invalidates the scan cache', async t => {
  const { ctx, runner, path } = await fixture(t);
  let observed, invalidated = 0;
  const handler = createActionHandler(ctx, { runner,
    stopTask: async options => { observed = options; return { status: 'stopping' }; },
    invalidateCache: () => invalidated++,
  });
  const result = await invoke(handler, 'stop', { workspaceId: 'workspace-one', taskId: 'darwin:123:birth' });
  assert.equal(result.value.status, 'stopping');
  assert.equal(observed.workspacePath, path);
  assert.equal(observed.taskId, 'darwin:123:birth');
  assert.ok(observed.signal instanceof AbortSignal);
  assert.equal(invalidated, 1);
});

test('unknown workspaces and pre-cancelled actions never reach the runner', async t => {
  const { ctx, runner, calls } = await fixture(t);
  const handler = createActionHandler(ctx, { runner });
  assert.equal((await invoke(handler, 'run', { workspaceId: 'missing', commandId: 'one' })).error.code, 'workspace-monitor/workspace-not-found');
  const controller = new AbortController(); controller.abort();
  assert.equal((await invoke(handler, 'run', { workspaceId: 'workspace-one', commandId: 'one' }, owner, controller.signal)).error.code, 'workspace-monitor/cancelled');
  assert.deepEqual(calls, []);
});

test('structured command errors are public and unknown failures never reveal raw output', async t => {
  const { ctx, runner } = await fixture(t);
  runner.run = async () => { const error = new Error('--token super-private'); error.code = 'workspace-monitor/manager-not-found'; throw error; };
  const handler = createActionHandler(ctx, { runner });
  const missing = await invoke(handler, 'run', { workspaceId: 'workspace-one', commandId: 'one' });
  assert.equal(missing.error.code, 'workspace-monitor/manager-not-found');
  assert.equal(JSON.stringify(missing).includes('super-private'), false);
  runner.run = async () => { throw new Error('--token super-private'); };
  const failed = await invoke(handler, 'run', { workspaceId: 'workspace-one', commandId: 'one' });
  assert.equal(failed.error.code, 'workspace-monitor/action-failed');
  assert.equal(JSON.stringify(failed).includes('super-private'), false);
});

test('unsupported mutation platforms are explicit and command discovery remains read-only', async t => {
  const { ctx, runner, calls } = await fixture(t);
  const handler = createActionHandler(ctx, { runner, platform: 'win32', discover: async () => ({ commands: [{ id: 'one' }], warnings: [] }) });
  assert.equal((await invoke(handler, 'commands', { workspaceId: 'workspace-one' })).value.commands[0].canRun, false);
  assert.equal((await invoke(handler, 'run', { workspaceId: 'workspace-one', commandId: 'one' })).error.code, 'workspace-monitor/unsupported');
  assert.equal((await invoke(handler, 'stop', { workspaceId: 'workspace-one', runId: 'one' })).error.code, 'workspace-monitor/unsupported');
  assert.deepEqual(calls, []);
});

test('live managed runs are correlated with scan tasks without exposing duplicate control identities', async t => {
  const { ctx, path } = await fixture(t);
  const handler = createScanHandler(ctx, {
    listRuns: async () => [run],
    scanWorkspace: async () => ({ workspacePath: path, scannedAt: Date.now(), warnings: [], tasks: [
      { id: 'task-one', pid: 123, pids: [123, 124], match: 'cwd', processes: [{ pid: 123, startedAt: 1234 }] },
      { id: 'weak', pid: 42, pids: [42], match: 'command', processes: [{ pid: 42, startedAt: 1234 }] },
    ] }),
  });
  const result = await invoke(handler, 'scan', { workspaceId: 'workspace-one' });
  assert.equal(result.value.tasks[0].runId, 'run-one');
  assert.equal(result.value.tasks[0].canStop, true);
  assert.equal(result.value.tasks[1].canStop, false);
  assert.equal(result.value.runs.length, 1);
});

test('each action route requires its matching standard RPC method', async () => {
  let called;
  const fetch = createFetchHandler(async (endpoint, payload, _signal, peer) => {
    called = { endpoint, payload, peer }; return { ok: true, value: run };
  }, 'run');
  const message = { type: 'client-request', rpcId: 'request-one', method: 'workspace-monitor/run', payload: { workspaceId: 'workspace-one', commandId: 'one' } };
  const response = await fetch(new Request('http://localhost/api/workspace-monitor/run', { method: 'POST', body: JSON.stringify(message) }));
  assert.equal((await response.json()).rpcId, 'request-one');
  assert.equal(called.endpoint, 'run');
  assert.equal(called.peer.principal.kind, 'owner');
  const wrong = await fetch(new Request('http://localhost/api/workspace-monitor/run', { method: 'POST', body: JSON.stringify({ ...message, method: 'workspace-monitor/scan' }) }));
  assert.equal(wrong.status, 400);
});
